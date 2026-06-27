// lib/screens/alerts_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final _api = ApiService();
  List<Alert> _alerts = [];
  bool _loading = true, _showUnreadOnly = false;

  @override 
  void initState() { 
    super.initState(); 
    WidgetsBinding.instance.addPostFrameCallback((_) => _load()); 
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final data = await _api.getAlerts(isRead: _showUnreadOnly ? false : null);
      if (mounted) {
        setState(() {
          final list = (data['data'] ?? data['alerts'] ?? []) as List;
          _alerts = list.map((e) => Alert.fromJson(e as Map<String, dynamic>)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    await _api.markAllAlertsRead();
    _load();
  }

  @override Widget build(BuildContext context) {
    final unread = _alerts.where((a) => !a.isRead).length;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('NOTIFICATIONS'),
          if (unread > 0) Text('$unread unread', style: const TextStyle(fontSize: 11, color: AppColors.danger, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          if (unread > 0) TextButton.icon(
            icon: const Icon(Icons.done_all, size: 16),
            label: const Text('ALL READ'),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            onPressed: _markAllRead,
          ),
          IconButton(
            icon: Icon(Icons.filter_list, color: _showUnreadOnly ? AppColors.primary : AppColors.textMuted),
            onPressed: () { setState(() => _showUnreadOnly = !_showUnreadOnly); _load(); },
          ),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : RefreshIndicator(
            onRefresh: _load, color: AppColors.primary,
            child: _alerts.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.notifications_none, color: AppColors.textMuted, size: 56),
                  const SizedBox(height: 12),
                  Text(_showUnreadOnly ? 'No unread notifications' : 'No notifications', style: const TextStyle(color: AppColors.textMuted)),
                ]))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _alerts.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _AlertTile(
                    alert: _alerts[i],
                    onTap: () async {
                      if (!_alerts[i].isRead) { await _api.markAlertRead(_alerts[i].id); _load(); }
                    },
                  ),
                ),
          ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final Alert alert; final VoidCallback onTap;
  const _AlertTile({required this.alert, required this.onTap});

  Color get _severityColor {
    switch (alert.severity) {
      case 'critical': return AppColors.critical;
      case 'high':     return AppColors.danger;
      case 'medium':   return AppColors.warning;
      default:         return AppColors.info;
    }
  }

  IconData get _typeIcon {
    switch (alert.type) {
      case 'unauthorized_access': return Icons.no_accounts;
      case 'blacklisted_vehicle': return Icons.no_crash;
      case 'overstay':            return Icons.timer_off;
      case 'expired_pass':        return Icons.card_membership;
      case 'suspicious_activity': return Icons.warning_amber;
      default:                    return Icons.info;
    }
  }

  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: alert.isRead ? AppColors.surface : _severityColor.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: alert.isRead ? AppColors.border : _severityColor.withOpacity(0.4), width: alert.isRead ? 1 : 1.5),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: _severityColor.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
          child: Icon(_typeIcon, color: _severityColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(alert.title,
              style: TextStyle(fontWeight: alert.isRead ? FontWeight.w500 : FontWeight.w700, fontSize: 14, color: AppColors.textPrimary))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: _severityColor.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
              child: Text(alert.severity.toUpperCase(), style: TextStyle(color: _severityColor, fontSize: 9, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 4),
          Text(alert.message, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 6),
          Row(children: [
            if (alert.gate != null) ...[
              Icon(Icons.door_back_door_outlined, size: 11, color: AppColors.textMuted),
              const SizedBox(width: 3),
              Text(alert.gate!, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
              const SizedBox(width: 10),
            ],
            Icon(Icons.person_outline, size: 11, color: AppColors.textMuted),
            const SizedBox(width: 3),
            Text(
              alert.reporterName != null
                  ? 'Sent by: ${alert.reporterRank != null ? '${alert.reporterRank} ' : ''}${alert.reporterName}'
                  : 'Sent by: System',
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
            ),
            const Spacer(),
            Icon(Icons.access_time, size: 11, color: AppColors.textMuted),
            const SizedBox(width: 3),
            Text(DateFormat('MMM d, HH:mm').format(alert.createdAt), style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
            if (!alert.isRead) ...[
              const SizedBox(width: 8),
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
            ],
          ]),
        ])),
      ]),
    ),
  );
}
