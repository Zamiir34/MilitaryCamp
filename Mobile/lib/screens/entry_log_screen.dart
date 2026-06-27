// lib/screens/entry_log_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'log_entry_screen.dart';

class EntryLogScreen extends StatefulWidget {
  const EntryLogScreen({super.key});
  @override State<EntryLogScreen> createState() => _EntryLogScreenState();
}

class _EntryLogScreenState extends State<EntryLogScreen> with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late TabController _tabs;
  List<EntryLog> _all = [];
  List<EntryLog> _today = [];
  bool _loading = true;
  String? _typeFilter;
  String? _actionFilter;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final [allData, today] = await Future.wait([
        _api.getEntryLogs(type: _typeFilter, action: _actionFilter, limit: 100),
        _api.getTodayLogs(),
      ]);
      if (mounted) {
        setState(() {
          _all = _api.parseEntryLogs(allData as Map<String, dynamic>);
          _today = today as List<EntryLog>;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openRecord(String action) async {
    final refreshed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => LogEntryScreen(action: action)),
    );
    if (refreshed == true) _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
          title: const Text('ENTRY / EXIT LOGS'),
          actions: [
            PopupMenuButton<String>(
              color: AppColors.surfaceVariant,
              icon: const Icon(Icons.filter_list),
              onSelected: (v) {
                if (v == 'clear') {
                  _typeFilter = null;
                  _actionFilter = null;
                } else if (v == 'Personnel' || v == 'Vehicle' || v == 'Visitor') {
                  _typeFilter = v;
                } else if (v == 'Entry' || v == 'Exit') {
                  _actionFilter = v;
                }
                _load();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'clear', child: Text('Clear Filters')),
                PopupMenuDivider(),
                PopupMenuItem(value: 'Personnel', child: Text('Personnel only')),
                PopupMenuItem(value: 'Vehicle', child: Text('Vehicle only')),
                PopupMenuItem(value: 'Visitor', child: Text('Visitor only')),
                PopupMenuDivider(),
                PopupMenuItem(value: 'Entry', child: Text('Entries only')),
                PopupMenuItem(value: 'Exit', child: Text('Exits only')),
              ],
            ),
          ],
          bottom: TabBar(
            controller: _tabs,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'TODAY (${_today.length})'),
              Tab(text: 'ALL LOGS (${_all.length})'),
            ],
          ),
        ),
        floatingActionButton: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FloatingActionButton.extended(
              heroTag: 'entry',
              backgroundColor: AppColors.success,
              onPressed: () => _openRecord('entry'),
              icon: const Icon(Icons.login, color: Colors.white),
              label: const Text('ENTRY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 10),
            FloatingActionButton.extended(
              heroTag: 'exit',
              backgroundColor: AppColors.warning,
              onPressed: () => _openRecord('exit'),
              icon: const Icon(Icons.logout, color: Colors.white),
              label: const Text('EXIT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : TabBarView(
                controller: _tabs,
                children: [
                  _LogList(logs: _today, onRefresh: _load),
                  _LogList(logs: _all, onRefresh: _load),
                ],
              ),
      );
}

class _LogList extends StatelessWidget {
  final List<EntryLog> logs;
  final Future<void> Function() onRefresh;
  const _LogList({required this.logs, required this.onRefresh});

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: onRefresh,
        color: AppColors.primary,
        child: logs.isEmpty
            ? const Center(child: Text('No logs found', style: TextStyle(color: AppColors.textMuted)))
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                itemCount: logs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _LogItem(log: logs[i]),
              ),
      );
}

class _LogItem extends StatelessWidget {
  final EntryLog log;
  const _LogItem({required this.log});

  Color _typeColor(String type) {
    switch (type) {
      case 'Personnel':
        return AppColors.primary;
      case 'Vehicle':
        return AppColors.success;
      case 'Visitor':
        return AppColors.accent;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final actionColor = log.isEntry ? AppColors.success : AppColors.warning;
    final typeColor = _typeColor(log.type);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: log.isAuthorized ? AppColors.border : AppColors.danger.withOpacity(0.4)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 42,
            height: 42,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(color: typeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(
              log.type == 'Vehicle' ? Icons.directions_car : (log.type == 'Visitor' ? Icons.badge : Icons.person),
              color: typeColor,
              size: 22,
            ),
          ),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(log.displayName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textPrimary))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: actionColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(log.isEntry ? '▲ ENTRY' : '▼ EXIT', style: TextStyle(color: actionColor, fontSize: 10, fontWeight: FontWeight.w700)),
                ),
              ]),
              const SizedBox(height: 4),
              Text('${log.type} • ${log.displayId}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              if (log.vehicleName != null && log.vehicleName!.isNotEmpty && log.vehicleName != '--')
                Text('Vehicle: ${log.vehicleName}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              if (log.driverName != null && log.driverName!.isNotEmpty && log.driverName != '--')
                Text('Driver: ${log.driverName}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              if (log.ownerName != null && log.ownerName!.isNotEmpty && log.ownerName != '--' && log.type == 'Vehicle')
                Text('Owner: ${log.ownerName}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ]),
          ),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.door_back_door_outlined, size: 12, color: AppColors.textMuted),
          const SizedBox(width: 4),
          Text(log.gate, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(width: 12),
          Icon(log.isAuthorized ? Icons.verified : Icons.block, size: 12, color: log.isAuthorized ? AppColors.success : AppColors.danger),
          const SizedBox(width: 4),
          Text(log.isAuthorized ? 'AUTH' : 'UNAUTH', style: TextStyle(fontSize: 11, color: log.isAuthorized ? AppColors.success : AppColors.danger, fontWeight: FontWeight.w700)),
          const Spacer(),
          Text(DateFormat('MMM d, HH:mm').format(log.timestamp), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ]),
        if (log.recordedByName != null) ...[
          const SizedBox(height: 4),
          Text('Officer: ${log.recordedByName}', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        ],
      ]),
    );
  }
}
