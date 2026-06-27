// lib/screens/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'log_entry_screen.dart';
import 'visitor_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = ApiService();

  DashboardStats? _stats;
  List<EntryLog> _recentLogs = [];
  List<EntryLog> _myRecentLogs = [];
  List<ChartDataPoint> _chartData = [];
  List<GuardStatus> _guards = [];
  List<dynamic> _recentAlerts = [];
  List<dynamic> _personnelWithVehicles = [];

  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      // Load full dashboard (matches /dashboard endpoint like the web app)
      final fullData = await _api.getDashboardFull();
      final recentLogs = await _api.getRecentLogs(limit: 8);

      if (mounted) setState(() {
        if (fullData['stats'] != null) {
          _stats = DashboardStats.fromJson(fullData['stats']);
        }
        // Chart: 7-day activity
        if (fullData['chart'] is List) {
          _chartData = (fullData['chart'] as List)
              .map((d) => ChartDataPoint.fromJson(d))
              .toList();
        }
        // Recent activity (all guards)
        if (fullData['recentActivity'] is List) {
          _recentLogs = (fullData['recentActivity'] as List)
              .map((e) => EntryLog.fromJson(e))
              .toList();
        } else {
          _recentLogs = recentLogs;
        }
        // My recent activity
        if (fullData['myRecentActivity'] is List) {
          _myRecentLogs = (fullData['myRecentActivity'] as List)
              .map((e) => EntryLog.fromJson(e))
              .toList();
        }
        // Guards status
        if (fullData['allGuards'] is List) {
          _guards = (fullData['allGuards'] as List)
              .map((g) => GuardStatus.fromJson(g))
              .toList();
        }
        // Recent alerts
        if (fullData['recentAlerts'] is List) {
          _recentAlerts = fullData['recentAlerts'] as List;
        }
        // Personnel with vehicles
        if (fullData['personnelWithVehicles'] is List) {
          _personnelWithVehicles = fullData['personnelWithVehicles'] as List;
        }
        _loading = false;
      });
    } catch (e) {
      // Fallback to stats-only endpoint
      try {
        final statsData = await _api.getDashboardStats();
        final logs = await _api.getRecentLogs(limit: 8);
        if (mounted) setState(() {
          if (statsData['stats'] != null) _stats = DashboardStats.fromJson(statsData['stats']);
          _recentLogs = logs;
          _loading = false;
        });
      } catch (_) {
        if (mounted) setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppColors.primary,
          child: CustomScrollView(
            slivers: [
              // ── Header ──────────────────────────────────────────
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('CAMP MONITOR', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: 2)),
                    Text(DateFormat('EEEE, MMM d yyyy · HH:mm').format(DateTime.now()),
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ])),
                  GestureDetector(
                    onTap: () => Scaffold.of(context).openDrawer(),
                    child: CircleAvatar(
                      backgroundColor: AppColors.surface,
                      child: Text((user?.name.isNotEmpty == true) ? user!.name.substring(0, 1).toUpperCase() : 'U',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ]),
              )),

              // ── Live Indicator ──────────────────────────────────
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(children: [
                  Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  const Text('LIVE MONITORING ACTIVE', style: TextStyle(fontSize: 10, color: AppColors.success, letterSpacing: 2, fontWeight: FontWeight.w600)),
                ]),
              )),

              // ── Quick Log Buttons ────────────────────────────────
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Row(children: [
                  Expanded(child: _QuickLogBtn(
                    label: 'LOG PERSONNEL',
                    icon: Icons.person_add,
                    color: AppColors.primary,
                    onTap: () => Navigator.push(context, MaterialPageRoute(
                        builder: (_) => const LogEntryScreen(action: 'entry'))).then((_) => _load()),
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: _QuickLogBtn(
                    label: 'VISITOR CENTER',
                    icon: Icons.badge_outlined,
                    color: AppColors.secondary,
                    onTap: () => Navigator.push(context, MaterialPageRoute(
                        builder: (_) => const VisitorScreen())).then((_) => _load()),
                  )),
                ]),
              )),

              // ── Stats Grid (6 cards matching web) ───────────────
              if (_loading)
                const SliverToBoxAdapter(child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary))))
              else if (_stats != null) ...[
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: const Text('CURRENT STATUS', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                )),
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: GridView.count(
                    crossAxisCount: 3, mainAxisSpacing: 8, crossAxisSpacing: 8,
                    childAspectRatio: 0.95, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _StatCard(label: 'ACTIVE PERSONNEL', value: '${_stats!.totalPersonnel}', icon: Icons.person, color: AppColors.success),
                      _StatCard(label: 'REGISTERED VEHICLES', value: '${_stats!.totalVehicles}', icon: Icons.directions_car, color: AppColors.info),
                      _StatCard(label: 'VISITORS TODAY', value: '${_stats!.visitorEntriesToday}', icon: Icons.badge, color: AppColors.secondary),
                      _StatCard(label: "TODAY'S ENTRIES", value: '${_stats!.todayEntries}', icon: Icons.login, color: AppColors.warning),
                      _StatCard(label: "TODAY'S EXITS", value: '${_stats!.todayExits}', icon: Icons.logout, color: const Color(0xFF8B5CF6)),
                      _StatCard(label: 'ACTIVE ALERTS', value: '${_stats!.unresolvedAlerts}', icon: Icons.notifications_active, color: AppColors.danger),
                    ],
                  ),
                )),

                // Alert Banner
                if (_stats!.unreadAlerts > 0) SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: _AlarmBanner(
                    isCritical: _stats!.criticalAlerts > 0,
                    count: _stats!.unreadAlerts,
                    onTap: () => Navigator.pushNamed(context, '/alerts'),
                  ),
                )),
              ],

              // ── 7-Day Chart ──────────────────────────────────────
              if (_chartData.isNotEmpty) ...[
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: const Text('7-DAY ACTIVITY', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                )),
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: _ActivityChart(data: _chartData),
                )),
              ],

              // ── Today's Breakdown (bar chart) ────────────────────
              if (_stats != null) ...[
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: const Text("TODAY'S BREAKDOWN", style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                )),
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: _BreakdownChart(stats: _stats!),
                )),
              ],

              // ── My Recent Activity ───────────────────────────────
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('MY RECENT ACTIVITY', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                  GestureDetector(
                    onTap: () => Navigator.pushNamed(context, '/my-work'),
                    child: const Text('VIEW ALL', style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w700, letterSpacing: 1)),
                  ),
                ]),
              )),
              if (_myRecentLogs.isEmpty)
                const SliverToBoxAdapter(child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 0, 20, 0),
                  child: _EmptyCard(message: 'No actions recorded today'),
                ))
              else
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: _LogTile(log: _myRecentLogs[i]),
                  ),
                  childCount: _myRecentLogs.length,
                )),

              // ── Recent Activity (all) ────────────────────────────
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('RECENT ACTIVITY', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                  Text('${_recentLogs.length} entries', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                ]),
              )),
              if (_recentLogs.isEmpty)
                const SliverToBoxAdapter(child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 0, 20, 0),
                  child: _EmptyCard(message: 'No recent activity'),
                ))
              else
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: _LogTile(log: _recentLogs[i]),
                  ),
                  childCount: _recentLogs.length,
                )),

              // ── Recent Alerts ────────────────────────────────────
              if (_recentAlerts.isNotEmpty) ...[
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('ACTIVE NOTIFICATIONS', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                      child: Text('${_stats?.unresolvedAlerts ?? _recentAlerts.length}',
                        style: const TextStyle(color: AppColors.danger, fontSize: 11, fontWeight: FontWeight.w800)),
                    ),
                  ]),
                )),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: _AlertTile(alert: _recentAlerts[i]),
                  ),
                  childCount: _recentAlerts.length > 5 ? 5 : _recentAlerts.length,
                )),
              ],

              // ── Guard Status ─────────────────────────────────────
              if (_guards.isNotEmpty) ...[
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('GUARD STATUS', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                    Row(children: [
                      _GuardBadge(label: '${_guards.where((g) => g.isOnDuty).length} ON', color: AppColors.success),
                      const SizedBox(width: 6),
                      _GuardBadge(label: '${_guards.where((g) => !g.isOnDuty).length} OFF', color: AppColors.textMuted),
                    ]),
                  ]),
                )),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: _GuardTile(guard: _guards[i]),
                  ),
                  childCount: _guards.length,
                )),
              ],

              // ── Personnel with Vehicles ─────────────────────────────────────
              if (_personnelWithVehicles.isNotEmpty) ...[
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('DRIVERS & VEHICLES', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.info.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                      child: Text('${_personnelWithVehicles.length}',
                        style: const TextStyle(color: AppColors.info, fontSize: 11, fontWeight: FontWeight.w800)),
                    ),
                  ]),
                )),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: _DriverTile(personnel: _personnelWithVehicles[i]),
                  ),
                  childCount: _personnelWithVehicles.length,
                )),
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Quick Log Button ──────────────────────────────────────────────
class _QuickLogBtn extends StatelessWidget {
  final String label; final IconData icon; final Color color; final VoidCallback onTap;
  const _QuickLogBtn({required this.label, required this.icon, required this.color, required this.onTap});

  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5))),
      ]),
    ),
  );
}

// ─── Stat Card ────────────────────────────────────────────────────
class _StatCard extends StatelessWidget {
  final String label, value; final IconData icon; final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(12),
      border: Border(left: BorderSide(color: color, width: 3)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
      Row(children: [
        Icon(icon, color: color, size: 15),
        const Spacer(),
        Container(width: 6, height: 6, decoration: BoxDecoration(color: color.withOpacity(0.5), shape: BoxShape.circle)),
      ]),
      const SizedBox(height: 8),
      FittedBox(fit: BoxFit.scaleDown, child: Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: color))),
      Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textMuted, letterSpacing: 0.8, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
    ]),
  );
}

// ─── Log Tile ─────────────────────────────────────────────────────
class _LogTile extends StatelessWidget {
  final EntryLog log;
  const _LogTile({required this.log});

  @override Widget build(BuildContext context) {
    final isEntry = log.isEntry;
    final color = isEntry ? AppColors.success : AppColors.warning;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        Container(
          width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(
            log.type == 'Vehicle' ? Icons.directions_car : (log.type == 'Visitor' ? Icons.badge : Icons.person),
            color: color, size: 18,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(log.displayName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.textPrimary)),
          Text('${log.gate} · ${log.recordedByName ?? log.guardName ?? 'System'}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
            child: Text(isEntry ? 'ENTRY' : 'EXIT', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
          ),
          const SizedBox(height: 4),
          Text(DateFormat('HH:mm').format(log.timestamp), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ]),
      ]),
    );
  }
}

// ─── Alert Tile ───────────────────────────────────────────────────
class _AlertTile extends StatelessWidget {
  final dynamic alert;
  const _AlertTile({required this.alert});

  Color _sevColor(String sev) {
    switch (sev.toLowerCase()) {
      case 'critical': return AppColors.critical;
      case 'high':     return AppColors.danger;
      case 'medium':   return AppColors.warning;
      default:         return AppColors.info;
    }
  }

  @override Widget build(BuildContext context) {
    final sev = (alert['severity'] ?? 'low').toString();
    final color = _sevColor(sev);
    String timeStr = '--:--';
    if (alert['createdAt'] != null) {
      try { timeStr = DateFormat('HH:mm').format(DateTime.parse(alert['createdAt'].toString())); } catch (_) {}
    }
    final reporter = alert['reportedBy'];
    final reporterName = reporter is Map ? reporter['fullName']?.toString() : null;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
            child: Text(sev.toUpperCase(), style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(alert['message']?.toString() ?? 'Alert',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis)),
          Text(timeStr, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        ]),
        const SizedBox(height: 6),
        Text(
          'Sent by: ${reporterName ?? 'System'}',
          style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
        ),
      ]),
    );
  }
}

// ─── Guard Tile ───────────────────────────────────────────────────
class _GuardTile extends StatelessWidget {
  final GuardStatus guard;
  const _GuardTile({required this.guard});

  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: guard.isOnDuty ? AppColors.success.withOpacity(0.05) : AppColors.surface,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: guard.isOnDuty ? AppColors.success.withOpacity(0.2) : AppColors.border),
    ),
    child: Row(children: [
      Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: AppColors.background,
          shape: BoxShape.circle,
          border: Border.all(color: guard.isOnDuty ? AppColors.success : AppColors.border),
        ),
        child: Center(child: Text(guard.initials,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: guard.isOnDuty ? AppColors.success : AppColors.textMuted))),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(guard.fullName, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: guard.isOnDuty ? AppColors.textPrimary : AppColors.textMuted)),
        Text('${guard.rank ?? guard.role} • ${guard.badgeNumber ?? 'N/A'}', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
      ])),
      Container(
        width: 10, height: 10,
        decoration: BoxDecoration(
          color: guard.isOnDuty ? AppColors.success : AppColors.border,
          shape: BoxShape.circle,
          boxShadow: guard.isOnDuty ? [BoxShadow(color: AppColors.success.withOpacity(0.5), blurRadius: 6, spreadRadius: 1)] : [],
        ),
      ),
    ]),
  );
}

class _GuardBadge extends StatelessWidget {
  final String label; final Color color;
  const _GuardBadge({required this.label, required this.color});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
    child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800)),
  );
}

// ─── 7-Day Activity Chart ─────────────────────────────────────────
class _ActivityChart extends StatelessWidget {
  final List<ChartDataPoint> data;
  const _ActivityChart({required this.data});

  @override Widget build(BuildContext context) => Container(
    height: 200,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
    child: LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(color: AppColors.border, strokeWidth: 1),
        ),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 22,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= data.length) return const SizedBox();
              final label = data[i].date.length >= 5 ? data[i].date.substring(5) : data[i].date;
              return Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted));
            },
          )),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: data.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.entries.toDouble())).toList(),
            isCurved: true, color: AppColors.secondary, barWidth: 2,
            belowBarData: BarAreaData(show: true, color: AppColors.secondary.withOpacity(0.08)),
            dotData: const FlDotData(show: false),
          ),
          LineChartBarData(
            spots: data.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.exits.toDouble())).toList(),
            isCurved: true, color: AppColors.success, barWidth: 2,
            belowBarData: BarAreaData(show: true, color: AppColors.success.withOpacity(0.08)),
            dotData: const FlDotData(show: false),
          ),
        ],
      ),
    ),
  );
}

// ─── Today's Breakdown Bar Chart ──────────────────────────────────
class _BreakdownChart extends StatelessWidget {
  final DashboardStats stats;
  const _BreakdownChart({required this.stats});

  @override Widget build(BuildContext context) {
    final groups = [
      BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: stats.personnelEntriesToday.toDouble(), color: AppColors.success, width: 20, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: stats.vehicleEntriesToday.toDouble(), color: AppColors.info, width: 20, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: stats.visitorEntriesToday.toDouble(), color: AppColors.secondary, width: 20, borderRadius: BorderRadius.circular(4))]),
    ];
    final labels = ['Personnel', 'Vehicles', 'Visitors'];
    return Container(
      height: 180,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: BarChart(BarChartData(
        barGroups: groups,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(color: AppColors.border, strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 22,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= labels.length) return const SizedBox();
              return Text(labels[i], style: const TextStyle(fontSize: 10, color: AppColors.textMuted));
            },
          )),
        ),
      )),
    );
  }
}

// ─── Empty Card ───────────────────────────────────────────────────
class _EmptyCard extends StatelessWidget {
  final String message;
  const _EmptyCard({required this.message});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
    child: Center(child: Text(message, style: const TextStyle(fontSize: 12, color: AppColors.textMuted))),
  );
}

// ─── Alarm Banner ────────────────────────────────────────────────
class _AlarmBanner extends StatefulWidget {
  final bool isCritical; final int count; final VoidCallback onTap;
  const _AlarmBanner({required this.isCritical, required this.count, required this.onTap});
  @override State<_AlarmBanner> createState() => _AlarmBannerState();
}

class _AlarmBannerState extends State<_AlarmBanner> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  @override void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..repeat(reverse: true);
  }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }

  @override Widget build(BuildContext context) {
    final color = widget.isCritical ? AppColors.critical : AppColors.warning;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) => GestureDetector(
        onTap: widget.onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.10 + (_ctrl.value * 0.15)),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withOpacity(0.3 + (_ctrl.value * 0.4)), width: 1.5),
            boxShadow: [if (widget.isCritical) BoxShadow(color: color.withOpacity(0.2 * _ctrl.value), blurRadius: 10, spreadRadius: 2)],
          ),
          child: Row(children: [
            Icon(widget.isCritical ? Icons.emergency_share : Icons.warning_amber_rounded, color: color),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${widget.isCritical ? "ALARM ACTIVE:" : ""} ${widget.count} UNREAD NOTIFICATION${widget.count > 1 ? 'S' : ''}',
                style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 13, letterSpacing: 0.5)),
              Text(widget.isCritical ? 'CRITICAL SECURITY BREACH DETECTED' : 'Review pending notifications immediately',
                style: const TextStyle(fontSize: 11, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
            ])),
            Icon(Icons.chevron_right, color: color),
          ]),
        ),
      ),
    );
  }
}

// ─── Driver Tile ───────────────────────────────────────────────────
class _DriverTile extends StatelessWidget {
  final dynamic personnel;
  const _DriverTile({required this.personnel});

  @override Widget build(BuildContext context) {
    final vehicle = personnel['vehicleDetails'] ?? {};
    final isVisitor = personnel['isVisitor'] == true;
    final accent = isVisitor ? AppColors.secondary : AppColors.info;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: accent.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: accent),
          ),
          child: Center(child: Icon(Icons.directions_car, size: 18, color: accent)),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(personnel['fullName'] ?? 'Unknown', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          Text(
            personnel['isVisitor'] == true
              ? 'Visitor • ${personnel['unit'] ?? personnel['rank'] ?? 'Guest'}'
              : '${personnel['rank'] ?? ''} ${personnel['unit'] != null ? '• ${personnel['unit']}' : ''}',
            style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
          ),
        ])),
        if (vehicle['plateNumber'] != null || vehicle['model'] != null)
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            if (vehicle['plateNumber'] != null)
              Text(vehicle['plateNumber'], style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
            Text(
              [vehicle['model'], vehicle['color']].where((v) => v != null && v.toString().isNotEmpty).join(' · '),
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
            ),
          ]),
      ]),
    );
  }
}
