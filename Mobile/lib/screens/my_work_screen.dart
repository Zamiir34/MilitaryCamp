// lib/screens/my_work_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';

class MyWorkScreen extends StatefulWidget {
  const MyWorkScreen({super.key});
  @override State<MyWorkScreen> createState() => _MyWorkScreenState();
}

class _MyWorkScreenState extends State<MyWorkScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _data;
  bool _loading = true;
  bool _togglingDuty = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (mounted) setState(() => _loading = true);
    try {
      final data = await _api.getMyActivity();
      if (mounted) setState(() { _data = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleToggleDuty() async {
    setState(() => _togglingDuty = true);
    final auth = context.read<AuthProvider>();
    final result = await auth.toggleDuty();
    if (mounted) {
      setState(() => _togglingDuty = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.message),
        backgroundColor: result.success ? AppColors.primary : AppColors.danger,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final summary = _data?['summary'] ?? {};
    final details = _data?['details'] ?? {'logs': [], 'personnel': [], 'vehicles': [], 'visitors': [], 'resolvedAlerts': []};
    final logs       = (details['logs']       as List? ?? []);
    final personnel  = (details['personnel']  as List? ?? []);
    final vehicles   = (details['vehicles']   as List? ?? []);
    final visitors   = (details['visitors']   as List? ?? []);

    final totalActions = (summary['logsCount'] ?? 0) +
        (summary['personnelCount'] ?? 0) +
        (summary['vehiclesCount'] ?? 0) +
        (summary['visitorsCount'] ?? 0) +
        (summary['resolvedAlertsCount'] ?? 0);

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('MY WORK TODAY', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: 1.5)),
          Text(DateFormat('MMMM dd, yyyy').format(DateTime.now()),
            style: TextStyle(fontSize: 11, color: context.textMuted, fontWeight: FontWeight.w400)),
        ]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Actions banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.07),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.check_circle_outline, color: AppColors.primary, size: 20),
                      const SizedBox(width: 10),
                      Text('$totalActions Actions completed today',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: context.textPrimary)),
                      const Spacer(),
                      // On-duty indicator
                      if (user?.role == 'SecurityOfficer' || user?.role == 'Guard')
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: (user?.isOnDuty ?? false) ? AppColors.success.withOpacity(0.15) : context.textMuted.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Container(
                              width: 7, height: 7,
                              decoration: BoxDecoration(
                                color: (user?.isOnDuty ?? false) ? AppColors.success : context.textMuted,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text((user?.isOnDuty ?? false) ? 'ON DUTY' : 'OFF DUTY',
                              style: TextStyle(
                                fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1,
                                color: (user?.isOnDuty ?? false) ? AppColors.success : context.textMuted,
                              )),
                          ]),
                        ),
                    ]),
                  ),

                  // Stats Grid
                  GridView.count(
                    crossAxisCount: 2, shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12, crossAxisSpacing: 12,
                    childAspectRatio: 2.0,
                    children: [
                      _StatCard(label: 'Logs Recorded', value: '${summary['logsCount'] ?? 0}', icon: Icons.swap_horiz, color: AppColors.success),
                      _StatCard(label: 'Personnel', value: '${summary['personnelCount'] ?? 0}', icon: Icons.people, color: AppColors.secondary),
                      _StatCard(label: 'Vehicles', value: '${summary['vehiclesCount'] ?? 0}', icon: Icons.directions_car, color: AppColors.warning),
                      _StatCard(label: 'Visitors', value: '${summary['visitorsCount'] ?? 0}', icon: Icons.badge, color: AppColors.accent),
                    ],
                  ),

                  const SizedBox(height: 24),
                  Text('RECENT ACTIVITY', style: TextStyle(fontSize: 11, color: context.textMuted, fontWeight: FontWeight.w700, letterSpacing: 2)),
                  const SizedBox(height: 12),

                  // Activity list
                  if (logs.isEmpty && personnel.isEmpty && vehicles.isEmpty && visitors.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        child: Column(children: [
                          Icon(Icons.inbox_outlined, color: context.textMuted, size: 48),
                          const SizedBox(height: 12),
                          Text('No work recorded today yet.', style: TextStyle(color: context.textMuted, fontSize: 14)),
                        ]),
                      ),
                    )
                  else ...[
                    ...logs.map((log) => _ActivityTile(
                      time: log['createdAt'],
                      badge: log['action'] == 'Entry' ? 'ENTRY LOG' : 'EXIT LOG',
                      badgeColor: log['action'] == 'Entry' ? AppColors.success : AppColors.secondary,
                      title: '${log['action']}: ${log['subjectName'] ?? 'Unknown'}',
                      subtitle: '${log['gate'] ?? ''} • ${log['purpose'] ?? 'No notes'}',
                    )),
                    ...personnel.map((p) => _ActivityTile(
                      time: p['createdAt'],
                      badge: 'NEW PERSONNEL',
                      badgeColor: AppColors.secondary,
                      title: p['fullName'] ?? 'Unknown',
                      subtitle: '${p['rank'] ?? ''} • ${p['unit'] ?? ''}',
                    )),
                    ...vehicles.map((v) => _ActivityTile(
                      time: v['createdAt'],
                      badge: 'NEW VEHICLE',
                      badgeColor: AppColors.warning,
                      title: v['plateNumber'] ?? 'Unknown',
                      subtitle: '${v['model'] ?? ''} • ${v['ownerName'] ?? ''}',
                    )),
                    ...visitors.map((v) => _ActivityTile(
                      time: v['createdAt'],
                      badge: 'NEW VISITOR',
                      badgeColor: AppColors.accent,
                      title: v['fullName'] ?? 'Unknown',
                      subtitle: 'Purpose: ${v['purposeOfVisit'] ?? 'Unknown'}',
                    )),
                  ],

                  const SizedBox(height: 24),
                ]),
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: context.surfaceColor,
      borderRadius: BorderRadius.circular(12),
      border: Border(left: BorderSide(color: color, width: 3)),
    ),
    child: Row(children: [
      Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: color, size: 18),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(label, style: TextStyle(fontSize: 11, color: context.textMuted, fontWeight: FontWeight.w600)),
        Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: color, height: 1.1)),
      ])),
    ]),
  );
}

class _ActivityTile extends StatelessWidget {
  final dynamic time;
  final String badge, title, subtitle;
  final Color badgeColor;
  const _ActivityTile({required this.time, required this.badge, required this.badgeColor, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    String timeStr = '--:--';
    if (time != null) {
      try { timeStr = DateFormat('HH:mm').format(DateTime.parse(time.toString())); } catch (_) {}
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: context.surfaceColor, borderRadius: BorderRadius.circular(10), border: Border.all(color: context.borderColor)),
      child: Row(children: [
        Text(timeStr, style: TextStyle(fontSize: 12, color: context.textMuted, fontFamily: 'Rajdhani', fontWeight: FontWeight.w600)),
        const SizedBox(width: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
          decoration: BoxDecoration(color: badgeColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
          child: Text(badge, style: TextStyle(color: badgeColor, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.textPrimary), overflow: TextOverflow.ellipsis),
          Text(subtitle, style: TextStyle(fontSize: 11, color: context.textMuted), overflow: TextOverflow.ellipsis),
        ])),
      ]),
    );
  }
}
