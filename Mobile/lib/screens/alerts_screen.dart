// lib/screens/alerts_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
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

  Future<void> _sendGuardNotification() async {
    final messageCtrl = TextEditingController();
    String type = AppConstants.notificationTypes.first;

    final sent = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('NEW NOTIFICATION', style: TextStyle(fontSize: 14, letterSpacing: 1)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  value: type,
                  dropdownColor: AppColors.surfaceVariant,
                  decoration: const InputDecoration(labelText: 'Type *'),
                  items: AppConstants.notificationTypes
                      .map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 12))))
                      .toList(),
                  onChanged: (v) => setDialogState(() => type = v!),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: messageCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Message *', hintText: 'Describe the situation...'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
            ElevatedButton(
              onPressed: () {
                if (messageCtrl.text.trim().isEmpty) return;
                Navigator.pop(ctx, true);
              },
              child: const Text('SEND'),
            ),
          ],
        ),
      ),
    );

    if (sent != true || !mounted) return;

    try {
      await _api.createNotification(
        type: type,
        message: messageCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification created'), backgroundColor: AppColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override Widget build(BuildContext context) {
    final unread = _alerts.where((a) => !a.isRead).length;
    final isGuard = context.watch<AuthProvider>().user?.isGuard ?? false;
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
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
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
      floatingActionButton: isGuard
          ? FloatingActionButton.extended(
              onPressed: _sendGuardNotification,
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.send, color: Colors.white),
              label: const Text('SEND', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            )
          : null,
    );
  }
}

class _AlertTile extends StatelessWidget {
  final Alert alert; final VoidCallback onTap;
  const _AlertTile({required this.alert, required this.onTap});

  IconData get _typeIcon {
    switch (alert.type.toLowerCase()) {
      case 'unauthorized access': return Icons.no_accounts;
      case 'blacklisted vehicle': return Icons.no_crash;
      case 'personnel exit':        return Icons.logout;
      case 'suspicious activity': return Icons.warning_amber;
      default:                    return Icons.notifications_outlined;
    }
  }

  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: alert.isRead ? AppColors.surface : AppColors.primary.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: alert.isRead ? AppColors.border : AppColors.primary.withOpacity(0.35), width: alert.isRead ? 1 : 1.5),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
          child: Icon(_typeIcon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(alert.title,
              style: TextStyle(fontWeight: alert.isRead ? FontWeight.w500 : FontWeight.w700, fontSize: 14, color: AppColors.textPrimary))),
            if (!alert.isRead)
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
          ]),
          const SizedBox(height: 4),
          Text(alert.message, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 6),
          Row(children: [
            if (alert.zone != null && alert.zone!.isNotEmpty) ...[
              Icon(Icons.map_outlined, size: 11, color: AppColors.secondary),
              const SizedBox(width: 3),
              Flexible(
                child: Text('Zone: ${alert.zone!}',
                  style: const TextStyle(fontSize: 10, color: AppColors.secondary, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 10),
            ],
            if (alert.gate != null && alert.gate != alert.zone) ...[
              Icon(Icons.door_back_door_outlined, size: 11, color: AppColors.textMuted),
              const SizedBox(width: 3),
              Text(alert.gate!, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
              const SizedBox(width: 10),
            ],
            Icon(Icons.person_outline, size: 11, color: AppColors.textMuted),
            const SizedBox(width: 3),
            Expanded(
              child: Text(
                alert.reporterName != null
                    ? 'Sent by: ${alert.reporterRank != null ? '${alert.reporterRank} ' : ''}${alert.reporterName}'
                    : 'Sent by: System',
                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Icon(Icons.access_time, size: 11, color: AppColors.textMuted),
            const SizedBox(width: 3),
            Text(DateFormat('MMM d, HH:mm').format(alert.createdAt), style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ]),
        ])),
      ]),
    ),
  );
}
