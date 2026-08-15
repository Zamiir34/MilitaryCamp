// lib/screens/visitor_screen.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'add_visitor_screen.dart';
import 'visitor_detail_screen.dart';
import 'qr_scanner_screen.dart';
import 'log_entry_screen.dart';

class VisitorScreen extends StatefulWidget {
  const VisitorScreen({super.key});

  @override
  State<VisitorScreen> createState() => _VisitorScreenState();
}

class _VisitorScreenState extends State<VisitorScreen> {
  final _api = ApiService();
  final _searchCtrl = TextEditingController();
  List<VisitorModel> _list = [];
  bool _loading = true;
  int _page = 1, _total = 0;
  String? _statusFilter; // null (All), 'Pending', 'Approved', 'Completed'
  String _activeTab = 'ALL'; // 'ALL', 'PENDING', 'APPROVED', 'COMPLETED'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load(reset: true));
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) {
      _page = 1;
      _list = [];
    }
    if (mounted) setState(() => _loading = true);
    try {
      final data = await _api.getVisitors(
        page: _page,
        search: _searchCtrl.text.trim(),
        status: _statusFilter,
      );
      final items = (data['data'] as List).map((e) => VisitorModel.fromJson(e)).toList();

      if (mounted) {
        setState(() {
          _list = reset ? items : [..._list, ...items];
          _total = data['total'] ?? _list.length;
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

    // Handle parsed scanned data
    try {
      if (result.contains('/verify/')) {
        // Scanned a verification URL, extract ID
        final parts = result.split('/');
        final id = parts.last;
        _searchCtrl.text = id;
        _load(reset: true);
      } else {
        final data = jsonDecode(result);
        final id = data['id'] ?? data['visitorId'];
        if (id != null) {
          _searchCtrl.text = id;
          _load(reset: true);
        }
      }
    } catch (e) {
      _searchCtrl.text = result;
      _load(reset: true);
    }
  }

  void _onTabChanged(String tab, String? filter) {
    setState(() {
      _activeTab = tab;
      _statusFilter = filter;
    });
    _load(reset: true);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('VISITOR CENTER', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5)),
            Text('$_total visitors registered', style: TextStyle(fontSize: 11, color: context.textMuted, fontWeight: FontWeight.normal)),
          ],
        ),
        actions: [
          if (user?.isOfficer == true)
            IconButton(
              icon: const Icon(Icons.add_moderator_outlined, color: AppColors.primary),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AddVisitorScreen()),
              ).then((value) {
                if (value == true) _load(reset: true);
              }),
              tooltip: 'Register New Visitor',
            ),
        ],
      ),
      body: Column(
        children: [
          // Status Tabs Selector
          Container(
            color: context.surfaceColor,
            child: Row(
              children: [
                _StatusTab(
                  label: 'ALL',
                  isActive: _activeTab == 'ALL',
                  onTap: () => _onTabChanged('ALL', null),
                ),
                _StatusTab(
                  label: 'PENDING',
                  isActive: _activeTab == 'PENDING',
                  onTap: () => _onTabChanged('PENDING', 'Pending'),
                ),
                _StatusTab(
                  label: 'APPROVED',
                  isActive: _activeTab == 'APPROVED',
                  onTap: () => _onTabChanged('APPROVED', 'Approved'),
                ),
                _StatusTab(
                  label: 'COMPLETED',
                  isActive: _activeTab == 'COMPLETED',
                  onTap: () => _onTabChanged('COMPLETED', 'Completed'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 2),
          // Search + Filter Row
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Search visitor name, ID...',
                      prefixIcon: Icon(Icons.search, color: context.textMuted),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: (_) => _load(reset: true),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
                  onPressed: _scanQR,
                  style: IconButton.styleFrom(
                    backgroundColor: context.surfaceVarColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 50,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.swap_horiz, color: Colors.white, size: 18),
                    label: const Text('LOG ENTRY', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LogEntryScreen(action: 'entry', initialSubjectType: 'Visitor')),
                    ).then((_) => _load(reset: true)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // List of visitors
          Expanded(
            child: _loading && _list.isEmpty
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : RefreshIndicator(
                    onRefresh: () => _load(reset: true),
                    color: AppColors.primary,
                    child: _list.isEmpty
                        ? Center(child: Text('No visitors found', style: TextStyle(color: context.textMuted)))
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            itemCount: _list.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _VisitorTile(
                              v: _list[i],
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => VisitorDetailScreen(visitorId: _list[i].id),
                                ),
                              ).then((_) => _load(reset: true)),
                            ),
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _StatusTab extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  const _StatusTab({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isActive ? AppColors.primary : Colors.transparent,
                width: 2.5,
              ),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
              color: isActive ? AppColors.primary : context.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _VisitorTile extends StatelessWidget {
  final VisitorModel v;
  final VoidCallback onTap;
  const _VisitorTile({required this.v, required this.onTap});

  Color _statusColor(BuildContext context) {
    switch (v.status) {
      case 'Approved':
        return AppColors.success;
      case 'Denied':
        return AppColors.danger;
      case 'Completed':
        return context.textMuted;
      default:
        return AppColors.warning;
    }
  }

  Widget _buildAvatar() {
    return SafeAvatar(
      photo: v.photo,
      radius: 24,
      fallback: Text(
        v.fullName.isNotEmpty ? v.fullName[0].toUpperCase() : 'V',
        style: const TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold, fontSize: 14),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.borderColor),
        ),
        child: Row(
          children: [
            // Avatar
            _buildAvatar(),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          v.fullName,
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: context.textPrimary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: (v.visitorType == 'Military' ? AppColors.primary : AppColors.secondary).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          v.visitorType.toUpperCase(),
                          style: TextStyle(
                            color: v.visitorType == 'Military' ? AppColors.primary : AppColors.secondary,
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    v.organization ?? (v.visitorType == 'Military' ? 'Military Member' : 'Civilian Visitor'),
                    style: TextStyle(fontSize: 12, color: context.textSecondary),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'ID: ${v.visitorId} · ${v.idNumber}',
                    style: TextStyle(fontSize: 10, color: context.textMuted, fontFamily: 'monospace'),
                  ),
                  if (v.hasVehicle) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.directions_car, size: 12, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          '${v.vehiclePlate} ${v.vehicleModel != null ? '(${v.vehicleModel})' : ''}',
                          style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Status Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
              child: Text(
                v.status.toUpperCase(),
                style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
