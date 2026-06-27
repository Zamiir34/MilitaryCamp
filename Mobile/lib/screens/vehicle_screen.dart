// lib/screens/vehicle_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'add_vehicle_screen.dart';
import 'log_entry_screen.dart';
import 'qr_scanner_screen.dart';
import 'dart:convert';

class VehicleScreen extends StatefulWidget {
  const VehicleScreen({super.key});
  @override State<VehicleScreen> createState() => _VehicleScreenState();
}

class _VehicleScreenState extends State<VehicleScreen> {
  final _api = ApiService();
  final _searchCtrl = TextEditingController();
  List<Vehicle> _list = [];
  bool _loading = true;
  int _total = 0;
  // ignore: unused_field
  String? _typeFilter;

  @override 
  void initState() { 
    super.initState(); 
    WidgetsBinding.instance.addPostFrameCallback((_) => _load()); 
  }
 
  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final data = await _api.getVehicles(search: _searchCtrl.text.trim());
      if (mounted) {
        setState(() {
          _list = (data['vehicles'] as List).map((e) => Vehicle.fromJson(e)).toList();
          _total = data['total'] ?? 0;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _scanQR() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const QRScannerScreen()),
    );

    if (result == null) return;

    try {
      final data = jsonDecode(result);
      final type = data['type'];
      final badge = data['badge'];

      if (type == 'vehicle' || type == 'personnel') {
        _searchCtrl.text = badge ?? '';
        _load();
      }
    } catch (e) {
      _searchCtrl.text = result;
      _load();
    }
  }

  @override Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('VEHICLES'),
          Text('$_total registered', style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          if (user?.isOfficer == true)
            IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () =>
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AddVehicleScreen())).then((_) => _load())),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: TextField(
              controller: _searchCtrl,
              decoration: const InputDecoration(
                hintText: 'Search plate number...',
                prefixIcon: Icon(Icons.search, color: AppColors.textMuted),
              ),
              onSubmitted: (_) => _load(),
            )),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.qr_code_scanner, color: AppColors.secondary),
              onPressed: _scanQR,
              style: IconButton.styleFrom(
                backgroundColor: AppColors.surfaceVariant,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(height: 52, child: ElevatedButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LogEntryScreen(action: 'entry', initialSubjectType: 'Vehicle'))).then((_) => _load()),
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14), backgroundColor: AppColors.secondary),
              child: const Icon(Icons.add_road, color: Colors.white),
            )),
          ]),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load, color: AppColors.primary,
              child: _list.isEmpty
                ? const Center(child: Text('No vehicles found', style: TextStyle(color: AppColors.textMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: _list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _VehicleTile(v: _list[i]),
                  ),
            )),
      ]),
    );
  }
}

class _VehicleTile extends StatelessWidget {
  final Vehicle v;
  const _VehicleTile({required this.v});

  static const _typeIcons = <String, IconData>{
    'car': Icons.directions_car, 'truck': Icons.local_shipping, 'motorcycle': Icons.two_wheeler,
    'military_vehicle': Icons.military_tech, 'ambulance': Icons.local_hospital,
    'bus': Icons.directions_bus, 'other': Icons.commute,
  };

  @override Widget build(BuildContext context) {
    final typeIcon = _typeIcons[v.type] ?? Icons.commute;
    final statusColor = v.isBlacklisted ? AppColors.danger : (v.status == 'active' ? AppColors.success : AppColors.textMuted);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: v.isBlacklisted ? AppColors.danger.withOpacity(0.4) : AppColors.border),
      ),
      child: Row(children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(typeIcon, color: AppColors.secondary, size: 24),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(v.plateNumber, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.textPrimary, letterSpacing: 2)),
          Text('${v.brand ?? 'Unknown'} ${v.model ?? ''}'.trim(), style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          if (v.ownerName != null) Text(v.ownerName!, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
            child: Text(v.status?.toUpperCase() ?? '', style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(color: AppColors.surfaceVariant, borderRadius: BorderRadius.circular(4)),
            child: Text(v.isInside ? 'INSIDE' : 'OUTSIDE',
              style: TextStyle(color: v.isInside ? AppColors.primary : AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.w700)),
          ),
        ]),
      ]),
    );
  }
}
