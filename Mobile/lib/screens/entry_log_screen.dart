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
  List<EntryLog> _all = [], _today = [];
  bool _loading = true;
  String? _typeFilter, _actionFilter, _gateFilter;

  @override void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }
  @override void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final [allData, today] = await Future.wait([
        _api.getEntryLogs(type: _typeFilter, action: _actionFilter, gate: _gateFilter),
        _api.getTodayLogs(),
      ]);
      if (mounted) {
        setState(() {
          _all = ((allData as Map)['logs'] as List).map((e) => EntryLog.fromJson(e)).toList();
          _today = today as List<EntryLog>;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(
      leading: IconButton(
        icon: const Icon(Icons.menu),
        onPressed: () => Scaffold.of(context).openDrawer(),
      ),
      title: const Text('ENTRY / EXIT LOGS'),
      actions: [
        IconButton(icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
          onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const LogEntryScreen(type: 'personnel'))).then((_) => _load());
          }),
        PopupMenuButton(
          color: AppColors.surfaceVariant, icon: const Icon(Icons.filter_list),
          onSelected: (v) {
            if (v == 'clear') { _typeFilter = null; _actionFilter = null; _gateFilter = null; }
            else if (v == 'personnel') _typeFilter = v;
            else if (['entry','exit'].contains(v)) _actionFilter = v;
            else _gateFilter = v;
            _load();
          },
          itemBuilder: (_) => <PopupMenuEntry<String>>[
            const PopupMenuItem(value: 'clear', child: Text('Clear Filters')),
            const PopupMenuDivider(),
            const PopupMenuItem(value: 'personnel', child: Text('Personnel only')),
            const PopupMenuDivider(),
            const PopupMenuItem(value: 'entry', child: Text('Entries only')),
            const PopupMenuDivider(),
            const PopupMenuItem(value: 'exit', child: Text('Exits only')),
          ],
        ),
      ],
      bottom: TabBar(
        controller: _tabs,
        labelColor: AppColors.primary, unselectedLabelColor: AppColors.textMuted,
        indicatorColor: AppColors.primary,
        tabs: [
          Tab(text: "TODAY (${_today.length})"),
          Tab(text: "ALL LOGS (${_all.length})"),
        ],
      ),
    ),
    body: _loading
      ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
      : TabBarView(controller: _tabs, children: [
          _LogList(logs: _today, onRefresh: _load),
          _LogList(logs: _all,   onRefresh: _load),
        ]),
  );
}

class _LogList extends StatelessWidget {
  final List<EntryLog> logs; final Future<void> Function() onRefresh;
  const _LogList({required this.logs, required this.onRefresh});
  @override Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: onRefresh, color: AppColors.primary,
    child: logs.isEmpty
      ? const Center(child: Text('No logs found', style: TextStyle(color: AppColors.textMuted)))
      : ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: logs.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) => _LogItem(log: logs[i]),
        ),
  );
}

class _LogItem extends StatelessWidget {
  final EntryLog log;
  const _LogItem({required this.log});
  @override Widget build(BuildContext context) {
    final isEntry = log.isEntry;
    final actionColor = isEntry ? AppColors.success : AppColors.warning;
    final typeColor = log.type == 'personnel' ? AppColors.primary : AppColors.secondary;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Icon
        Container(
          width: 42, height: 42, margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(color: typeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(log.type == 'personnel' ? Icons.person : Icons.directions_car, color: typeColor, size: 22),
        ),
        // Content
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(log.subjectName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textPrimary))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: actionColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
              child: Text(isEntry ? '▲ ENTRY' : '▼ EXIT', style: TextStyle(color: actionColor, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            Icon(Icons.door_back_door_outlined, size: 12, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text(log.gate, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(width: 12),
            if (log.authMethod != null) ...[
              Icon(Icons.verified_outlined, size: 12, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text(log.authMethod!.replaceAll('_', ' ').toUpperCase(), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ],
          ]),
          const SizedBox(height: 4),
          Row(children: [
            Icon(Icons.access_time, size: 12, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text(DateFormat('MMM d, yyyy HH:mm').format(log.timestamp), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            const SizedBox(width: 12),
            if (log.guardName != null) Text('by ${log.guardName}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          ]),
        ])),
      ]),
    );
  }
}


