// lib/screens/personnel_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'personnel_detail_screen.dart';
import 'add_personnel_screen.dart';
import 'qr_scanner_screen.dart';
import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';

class PersonnelScreen extends StatefulWidget {
  const PersonnelScreen({super.key});
  @override State<PersonnelScreen> createState() => _PersonnelScreenState();
}

class _PersonnelScreenState extends State<PersonnelScreen> {
  final _api = ApiService();
  final _searchCtrl = TextEditingController();
  List<Personnel> _list = [];
  bool _loading = true;
  int _page = 1, _total = 0;
  String? _statusFilter;

  @override 
  void initState() { 
    super.initState(); 
    WidgetsBinding.instance.addPostFrameCallback((_) => _load()); 
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) { _page = 1; _list = []; }
    if (mounted) setState(() => _loading = true);
    try {
      final data = await _api.getPersonnel(page: _page, search: _searchCtrl.text.trim(), status: _statusFilter);
      final items = (data['personnel'] as List).map((e) => Personnel.fromJson(e)).toList();
      if (mounted) {
        setState(() { _list = reset ? items : [..._list, ...items]; _total = data['total'] ?? 0; _loading = false; });
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
      final id = data['id'];
      final type = data['type'];

      if (type == 'personnel') {
        if (mounted) {
          Navigator.push(context, MaterialPageRoute(
            builder: (_) => PersonnelDetailScreen(personnelId: id)));
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('This QR code is not for personnel'), backgroundColor: AppColors.danger));
      }
    } catch (e) {
      // Try searching as raw badge
      _searchCtrl.text = result;
      _load(reset: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('PERSONNEL'),
          Text('$_total registered', style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          if (user?.isOfficer == true)
            IconButton(icon: const Icon(Icons.person_add_outlined), onPressed: () =>
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPersonnelScreen()))
                .then((_) => _load(reset: true))),
        ],
      ),
      body: Column(children: [
        // Search + Filter
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: TextField(
              controller: _searchCtrl,
              decoration: const InputDecoration(
                hintText: 'Search by name, badge...',
                prefixIcon: Icon(Icons.search, color: AppColors.textMuted),
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onSubmitted: (_) => _load(reset: true),
            )),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
              onPressed: _scanQR,
              style: IconButton.styleFrom(
                backgroundColor: AppColors.surfaceVariant,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String?>(
              color: AppColors.surfaceVariant,
              icon: Icon(Icons.filter_list, color: _statusFilter != null ? AppColors.primary : AppColors.textMuted),
              onSelected: (v) { _statusFilter = v; _load(reset: true); },
              itemBuilder: (_) => <PopupMenuEntry<String?>>[
                const PopupMenuItem(value: null, child: Text('All')),
                const PopupMenuItem(value: 'active', child: Text('Active')),
                const PopupMenuItem(value: 'inactive', child: Text('Inactive')),
                const PopupMenuItem(value: 'suspended', child: Text('Suspended')),
              ],
            ),
          ]),
        ),
        // Filter chips
        if (_statusFilter != null) Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Align(alignment: Alignment.centerLeft, child: ActionChip(
            label: Text(_statusFilter!.toUpperCase()),
            backgroundColor: AppColors.primary.withOpacity(0.1),
            side: const BorderSide(color: AppColors.primary),
            labelStyle: const TextStyle(color: AppColors.primary, fontSize: 11),
            onPressed: () { _statusFilter = null; _load(reset: true); },
            avatar: const Icon(Icons.close, size: 14, color: AppColors.primary),
          )),
        ),
        // List
        Expanded(child: _loading && _list.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: () => _load(reset: true), color: AppColors.primary,
              child: _list.isEmpty
                ? const Center(child: Text('No personnel found', style: TextStyle(color: AppColors.textMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: _list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _PersonnelTile(
                      p: _list[i],
                      onTap: () => Navigator.push(context, MaterialPageRoute(
                        builder: (_) => PersonnelDetailScreen(personnelId: _list[i].id)))
                          .then((_) => _load(reset: true)),
                    ),
                  ),
            )),
      ]),
    );
  }
}

class _PersonnelTile extends StatelessWidget {
  final Personnel p; final VoidCallback onTap;
  const _PersonnelTile({required this.p, required this.onTap});

  Color get _statusColor {
    switch (p.status) {
      case 'active': return AppColors.success;
      case 'suspended': return AppColors.danger;
      case 'on_leave': return AppColors.warning;
      default: return AppColors.textMuted;
    }
  }

  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        Stack(children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.primary.withOpacity(0.15),
            child: p.photo != null && p.photo!.isNotEmpty
                ? ClipOval(
                    child: CachedNetworkImage(
                      imageUrl: '${AppConstants.baseUrl.replaceAll('/api', '')}${p.photo}',
                      fit: BoxFit.cover,
                      width: 48,
                      height: 48,
                      placeholder: (context, url) => const CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                      errorWidget: (context, url, error) => const Icon(Icons.person, color: AppColors.primary, size: 24),
                    ),
                  )
                : Text(
                    '${p.firstName.isNotEmpty ? p.firstName[0] : '?'}${p.lastName.isNotEmpty ? p.lastName[0] : ''}',
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
          ),
          Positioned(bottom: 0, right: 0, child: Container(
            width: 10, height: 10,
            decoration: BoxDecoration(color: p.isInside ? AppColors.success : AppColors.textMuted,
              shape: BoxShape.circle, border: Border.all(color: AppColors.surface, width: 1.5)),
          )),
        ]),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(p.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppColors.textPrimary)),
          Text('${p.rank} · ${p.unit}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          Text(p.badgeNumber, style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontFamily: 'monospace')),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(color: _statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
            child: Text(p.status?.toUpperCase() ?? '', style: TextStyle(color: _statusColor, fontSize: 9, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(color: AppColors.surfaceVariant, borderRadius: BorderRadius.circular(4)),
            child: Text(p.category?.toUpperCase() ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 9)),
          ),
        ]),
      ]),
    ),
  );
}
