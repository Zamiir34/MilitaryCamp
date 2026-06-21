// lib/screens/main_nav_screen.dart
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
import 'report_incident_screen.dart';
import 'visitor_screen.dart';
import 'user_management_screen.dart';
import 'vehicle_screen.dart';
import 'chat_screen.dart';
import 'my_work_screen.dart';
import 'attendance_screen.dart';

class MainNavScreen extends StatefulWidget {
  const MainNavScreen({super.key});
  @override State<MainNavScreen> createState() => _MainNavScreenState();
}

class _MainNavScreenState extends State<MainNavScreen> {
  int _currentIndex = 0;

  final _screens = const [
    DashboardScreen(),
    PersonnelScreen(),
    EntryLogScreen(),
    AlertsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      drawer: Drawer(
        backgroundColor: AppColors.background,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Premium Header ───────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 24),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(bottom: BorderSide(color: AppColors.border)),
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
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.textPrimary)),
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
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (user?.isOnDuty ?? false) ? AppColors.success.withOpacity(0.15) : AppColors.textMuted.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(
                            width: 5, height: 5,
                            decoration: BoxDecoration(
                              color: (user?.isOnDuty ?? false) ? AppColors.success : AppColors.textMuted,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text((user?.isOnDuty ?? false) ? 'ON DUTY' : 'OFF DUTY',
                            style: TextStyle(
                              color: (user?.isOnDuty ?? false) ? AppColors.success : AppColors.textMuted,
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
                  _DrawerItem(
                    icon: Icons.people_outline,
                    label: 'Personnel Roster',
                    isSelected: _currentIndex == 1,
                    onTap: () { setState(() => _currentIndex = 1); Navigator.pop(context); },
                  ),
                  _DrawerItem(
                    icon: Icons.directions_car_outlined,
                    label: 'Vehicle Registry',
                    iconColor: AppColors.info,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const VehicleScreen()));
                    },
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
                    onTap: () { setState(() => _currentIndex = 3); Navigator.pop(context); },
                  ),
                  _DrawerItem(
                    icon: Icons.gpp_maybe_outlined,
                    label: 'Report Incident',
                    iconColor: AppColors.danger,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportIncidentScreen()));
                    },
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
                    label: 'My Attendance',
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

                  if (user?.isOfficer == true) ...[
                    const SizedBox(height: 8),
                    // ── OFFICER TOOLS ────────────────────────
                    _DrawerLabel(label: 'OFFICER TOOLS'),
                    _DrawerItem(
                      icon: Icons.analytics_outlined,
                      label: 'Activity Reports',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()));
                      },
                    ),
                  ],

                  if (user?.isOfficer == true) ...[
                    const SizedBox(height: 8),
                    // ── ADMIN TOOLS ──────────────────────────
                    _DrawerLabel(label: user?.isAdmin == true ? 'ADMIN TOOLS' : 'OFFICER TOOLS'),
                    _DrawerItem(
                      icon: Icons.manage_accounts_outlined,
                      label: 'User Management',
                      iconColor: AppColors.danger,
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
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.border)),
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
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 10, letterSpacing: 1)),
              ]),
            ),
          ],
        ),
      ),
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(backgroundColor: AppColors.surface, icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'DASHBOARD'),
          BottomNavigationBarItem(backgroundColor: AppColors.surface, icon: Icon(Icons.people_outline), activeIcon: Icon(Icons.people), label: 'PERSONNEL'),
          BottomNavigationBarItem(backgroundColor: AppColors.surface, icon: Icon(Icons.swap_horiz_outlined), activeIcon: Icon(Icons.swap_horiz), label: 'LOGS'),
          BottomNavigationBarItem(backgroundColor: AppColors.surface, icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'ALERTS'),
        ],
      ),
    );
  }
}

class _DrawerLabel extends StatelessWidget {
  final String label;
  const _DrawerLabel({required this.label});
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
    child: Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
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
      leading: Icon(icon, size: 20, color: isSelected ? AppColors.primary : (iconColor ?? AppColors.textSecondary)),
      title: Text(label, style: TextStyle(
        fontSize: 14,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected ? AppColors.primary : (textColor ?? AppColors.textPrimary),
        letterSpacing: 0.3,
      )),
    ),
  );
}
