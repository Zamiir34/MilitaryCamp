// lib/screens/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../services/api_service.dart';
import '../services/theme_provider.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeProv = context.watch<ThemeProvider>();
    final user = auth.user;

    if (user == null) return const Center(child: CircularProgressIndicator());

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: const Text('USER PROFILE'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.danger),
            onPressed: () => _showLogoutDialog(context, auth),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 10),
            // Avatar and Name
            Center(
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary, width: 2),
                    ),
                    child: CircleAvatar(
                      radius: 50,
                      backgroundColor: context.surfaceColor,
                      child: Text(
                        user.name.isNotEmpty ? user.name.substring(0, 1).toUpperCase() : 'U',
                        style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user.name,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: context.textPrimary),
                  ),
                  Text(
                    '${user.rank ?? 'N/A'} · ${user.role.toUpperCase()}',
                    style: TextStyle(color: context.textSecondary, letterSpacing: 1),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Info Card
            _ProfileSection(
              title: 'ACCOUNT INFORMATION',
              children: [

                _ProfileRow(label: 'Email', value: user.email, icon: Icons.email_outlined),
                _ProfileRow(label: 'Badge Number', value: user.badgeNumber ?? 'NOT ASSIGNED', icon: Icons.badge_outlined),
                _ProfileRow(label: 'Account Status', value: user.isActive ? 'Active' : 'Inactive', icon: Icons.verified_user_outlined, 
                  color: user.isActive ? AppColors.success : AppColors.danger),
              ],
            ),
            const SizedBox(height: 20),

            // Settings Section
            _ProfileSection(
              title: 'SYSTEM SETTINGS',
              children: [
                _ProfileToggleRow(label: 'Push Notifications', value: true, icon: Icons.notifications_active_outlined),
                _ProfileToggleRow(label: 'Dark Mode', value: themeProv.isDark, icon: Icons.dark_mode_outlined,
                  onChanged: (_) => themeProv.toggle()),
                _ProfileRow(label: 'Language', value: 'English (US)', icon: Icons.language),
              ],
            ),
            
            const SizedBox(height: 40),
            // Version Info
            Text(
              'App Version ${AppConstants.appVersion}',
              style: TextStyle(color: context.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.surfaceColor,
        title: const Text('LOGOUT'),
        content: const Text('Are you sure you want to sign out of the system?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              if (auth.user?.isOnDuty == true) {
                try {
                  await ApiService().toggleDuty();
                } catch (_) {}
              }
              auth.logout();
            },
            child: const Text('LOGOUT'),
          ),
        ],
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _ProfileSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(title, style: TextStyle(fontSize: 11, color: context.textMuted, letterSpacing: 1.5, fontWeight: FontWeight.bold)),
        ),
        Container(
          decoration: BoxDecoration(
            color: context.surfaceColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.borderColor),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color? color;
  const _ProfileRow({required this.label, required this.value, required this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 20, color: context.textMuted),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 10, color: context.textMuted)),
                Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color ?? context.textPrimary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileToggleRow extends StatelessWidget {
  final String label;
  final bool value;
  final IconData icon;
  final ValueChanged<bool>? onChanged;
  const _ProfileToggleRow({required this.label, required this.value, required this.icon, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: context.textMuted),
          const SizedBox(width: 16),
          Expanded(
            child: Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: context.textPrimary)),
          ),
          Switch(
            value: value,
            onChanged: onChanged ?? (v) {},
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}
