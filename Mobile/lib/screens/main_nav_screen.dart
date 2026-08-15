// lib/screens/main_nav_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';
import 'dashboard_screen.dart';
import 'personnel_screen.dart';
import 'entry_log_screen.dart';
import 'alerts_screen.dart';
import 'reports_screen.dart';
import 'profile_screen.dart';
import 'visitor_screen.dart';
import 'user_management_screen.dart';
import 'vehicle_screen.dart';
import 'chat_screen.dart';
import 'my_work_screen.dart';
import 'attendance_screen.dart';
import '../services/api_service.dart';

class MainNavScreen extends StatefulWidget {
  const MainNavScreen({super.key});
  @override State<MainNavScreen> createState() => _MainNavScreenState();
}

class _MainNavScreenState extends State<MainNavScreen> {
  int _currentIndex = 0;
  int _unresolvedAlerts = 0;
  final _api = ApiService();
  Timer? _alertPoll;

  final _screens = const [
    DashboardScreen(),
    PersonnelScreen(),
    EntryLogScreen(),
    AlertsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _loadUnresolvedAlerts();
    _alertPoll = Timer.periodic(const Duration(seconds: 30), (_) => _loadUnresolvedAlerts());
  }

  @override
  void dispose() {
    _alertPoll?.cancel();
    super.dispose();
  }

  Future<void> _loadUnresolvedAlerts() async {
    try {
      final data = await _api.getAlerts(isResolved: false, limit: 1);
      final count = data['total'] is int
          ? data['total'] as int
          : ((data['data'] ?? data['alerts'] ?? []) as List)
              .where((a) => a is Map && a['isResolved'] != true)
              .length;
      if (mounted) setState(() => _unresolvedAlerts = count);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    if (user != null && !user.isOnDuty && (user.role == 'SecurityOfficer' || user.role == 'Guard')) {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      return Scaffold(
        backgroundColor: isDark ? Colors.black : Colors.white,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shield, size: 64, color: context.textMuted),
                const SizedBox(height: 20),
                Text('SYSTEM IS OFF', style: TextStyle(color: context.textPrimary, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 2)),
                const SizedBox(height: 10),
                Text('You are currently off duty. Access to the system is restricted.', textAlign: TextAlign.center, style: TextStyle(color: context.textSecondary, fontSize: 16)),
                const SizedBox(height: 30),
                ElevatedButton.icon(
                  onPressed: () => auth.logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('LOGOUT'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      drawer: Drawer(
        backgroundColor: context.bgColor,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Premium Header ───────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 24),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                border: Border(bottom: BorderSide(color: context.borderColor)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary, width: 1.5),
                    ),
                    child: CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      child: Text(
                        (user?.name.isNotEmpty == true) ? user!.name.substring(0, 1).toUpperCase() : 'U',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 22),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user?.name ?? 'Unknown User',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: context.textPrimary)),
                    const SizedBox(height: 4),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(user?.role.toUpperCase() ?? 'GUARD',
                          style: const TextStyle(color: AppColors.primary, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 1)),
                      ),
                      const SizedBox(width: 8),
                      // Duty status dot
                      if (user?.role == 'SecurityOfficer' || user?.role == 'Guard')
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: (user?.isOnDuty ?? false) ? AppColors.success.withOpacity(0.15) : context.textMuted.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Container(
                              width: 5, height: 5,
                              decoration: BoxDecoration(
                                color: (user?.isOnDuty ?? false) ? AppColors.success : context.textMuted,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text((user?.isOnDuty ?? false) ? 'ON DUTY' : 'OFF DUTY',
                              style: TextStyle(
                                color: (user?.isOnDuty ?? false) ? AppColors.success : context.textMuted,
                                fontSize: 8, fontWeight: FontWeight.w700, letterSpacing: 0.8,
                              )),
                          ]),
                        ),
                    ]),
                  ])),
                ]),
              ]),
            ),

            // ── Navigation Items ─────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  // ── MAIN MANAGEMENT ──────────────────────────
                  _DrawerLabel(label: 'MAIN MANAGEMENT'),
                  _DrawerItem(
                    icon: Icons.dashboard_outlined,
                    label: 'Command Dashboard',
                    isSelected: _currentIndex == 0,
                    onTap: () { setState(() => _currentIndex = 0); Navigator.pop(context); },
                  ),
                  if (user?.role != 'Guard')
                    _DrawerItem(
                      icon: Icons.people_outline,
                      label: 'Personnel Roster',
                      isSelected: _currentIndex == 1,
                      onTap: () { setState(() => _currentIndex = 1); Navigator.pop(context); },
                    ),
                  _DrawerItem(
                    icon: Icons.badge_outlined,
                    label: 'Visitor Center',
                    iconColor: AppColors.secondary,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const VisitorScreen()));
                    },
                  ),

                  const SizedBox(height: 8),
                  // ── SECURITY & LOGS ──────────────────────────
                  _DrawerLabel(label: 'SECURITY & LOGS'),
                  _DrawerItem(
                    icon: Icons.swap_horiz_outlined,
                    label: 'Access Logs',
                    isSelected: _currentIndex == 2,
                    onTap: () { setState(() => _currentIndex = 2); Navigator.pop(context); },
                  ),
                  _DrawerItem(
                    icon: Icons.notifications_outlined,
                    label: 'Notifications',
                    isSelected: _currentIndex == 3,
                    onTap: () { setState(() => _currentIndex = 3); Navigator.pop(context); _loadUnresolvedAlerts(); },
                  ),

                  const SizedBox(height: 8),
                  // ── MY WORK ──────────────────────────────────
                  _DrawerLabel(label: 'MY WORK'),
                  _DrawerItem(
                    icon: Icons.checklist_outlined,
                    label: 'My Work Today',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const MyWorkScreen()));
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.access_time_outlined,
                    label: 'Check In / Out',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen()));
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.chat_bubble_outline,
                    label: 'Comms / Chat',
                    iconColor: AppColors.secondary,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen()));
                    },
                  ),

                  if (user?.isOfficer == true || user?.isAdmin == true) ...[
                    const SizedBox(height: 8),
                    // ── MANAGEMENT TOOLS ──────────────────────
                    _DrawerLabel(label: user?.isAdmin == true ? 'ADMIN TOOLS' : 'OFFICER TOOLS'),
                    _DrawerItem(
                      icon: Icons.analytics_outlined,
                      label: 'Activity Reports',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()));
                      },
                    ),
                    _DrawerItem(
                      icon: Icons.manage_accounts_outlined,
                      label: user?.isAdmin == true ? 'User Management' : 'Guard Accounts',
                      iconColor: AppColors.warning,
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const UserManagementScreen()));
                      },
                    ),
                  ],

                  const SizedBox(height: 8),
                  // ── USER ACCOUNT ──────────────────────────
                  _DrawerLabel(label: 'USER ACCOUNT'),
                  _DrawerItem(
                    icon: Icons.person_outline,
                    label: 'Account Profile',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                    },
                  ),
                ],
              ),
            ),

            // ── Footer ──────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: context.borderColor)),
              ),
              child: Column(children: [
                const Row(children: [
                  Icon(Icons.security, color: AppColors.success, size: 14),
                  SizedBox(width: 8),
                  Text('SECURE CONNECTION', style: TextStyle(color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1)),
                ]),
                const SizedBox(height: 16),
                _DrawerItem(
                  icon: Icons.logout,
                  label: 'SIGN OUT',
                  iconColor: AppColors.danger,
                  textColor: AppColors.danger,
                  onTap: () => auth.logout(),
                ),
                const SizedBox(height: 12),
                Text('VERSION ${AppConstants.appVersion}',
                  style: TextStyle(color: context.textMuted, fontSize: 10, letterSpacing: 1)),
              ]),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_unresolvedAlerts > 0)
            Material(
              color: AppColors.danger.withOpacity(0.12),
              child: InkWell(
                onTap: () {
                  setState(() => _currentIndex = 3);
                  _loadUnresolvedAlerts();
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: AppColors.danger.withOpacity(0.35))),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '$_unresolvedAlerts ACTIVE NOTIFICATION${_unresolvedAlerts > 1 ? 'S' : ''} — TAP TO REVIEW',
                          style: const TextStyle(
                            color: AppColors.danger,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.danger, size: 18),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(child: IndexedStack(index: _currentIndex, children: _screens)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: _buildFloatingNavBar(),
      ),
    );
  }

  Widget _buildFloatingNavBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(color: AppColors.primary.withOpacity(0.12), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildNavItem(0, Icons.dashboard_outlined, Icons.dashboard, 'DASHBOARD'),
          _buildNavItem(1, Icons.people_outline, Icons.people, 'PERSONNEL'),
          _buildNavItem(2, Icons.swap_horiz_outlined, Icons.swap_horiz, 'LOGS'),
          _buildNavItem(3, Icons.notifications_outlined, Icons.notifications, 'ALERTS'),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() => _currentIndex = index);
        if (index == 3) _loadUnresolvedAlerts();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutQuint,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isSelected ? activeIcon : icon, color: isSelected ? AppColors.primary : context.textMuted, size: 22),
            AnimatedSize(
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOutQuint,
              child: isSelected 
                ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(width: 8),
                      Text(label, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 0.5)),
                    ],
                  )
                : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerLabel extends StatelessWidget {
  final String label;
  const _DrawerLabel({required this.label});
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
    child: Text(label, style: TextStyle(fontSize: 10, color: context.textMuted, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
  );
}

class _DrawerItem extends StatelessWidget {
  final IconData icon; final String label; final VoidCallback onTap; final bool isSelected;
  final Color? iconColor, textColor;
  const _DrawerItem({required this.icon, required this.label, required this.onTap, this.isSelected = false, this.iconColor, this.textColor});

  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
    child: ListTile(
      onTap: onTap,
      dense: true,
      selected: isSelected,
      selectedTileColor: AppColors.primary.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      leading: Icon(icon, size: 20, color: isSelected ? AppColors.primary : (iconColor ?? context.textSecondary)),
      title: Text(label, style: TextStyle(
        fontSize: 14,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected ? AppColors.primary : (textColor ?? context.textPrimary),
        letterSpacing: 0.3,
      )),
    ),
  );
}
