// lib/screens/user_management_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});
  @override State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  final _api = ApiService();
  List<dynamic> _users = [];
  bool _loading = true;
  String? _roleFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final users = await _api.getUsers();
      if (mounted) setState(() { _users = users; _loading = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        _showError(e.toString());
      }
    }
  }

  List<dynamic> get _filtered {
    if (_roleFilter == null) return _users;
    return _users.where((u) => u['role'] == _roleFilter).toList();
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.danger));
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.success));
  }

  Future<void> _toggleStatus(Map<String, dynamic> u) async {
    try {
      await _api.toggleUserStatus(u['_id']);
      _showSuccess('${u['fullName'] ?? u['name']} ${u['isActive'] ? 'deactivated' : 'activated'}.');
      _load();
    } catch (e) { _showError(e.toString()); }
  }

  Future<void> _deleteUser(Map<String, dynamic> u) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Delete User', style: TextStyle(color: AppColors.danger)),
        content: Text('Are you sure you want to permanently delete "${u['fullName'] ?? u['name']}"?',
          style: const TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('DELETE')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.deleteUser(u['_id']);
      _showSuccess('User deleted.');
      _load();
    } catch (e) { _showError(e.toString()); }
  }

  void _openForm({Map<String, dynamic>? user}) {
    final me = context.read<AuthProvider>().user;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UserFormSheet(
        user: user,
        currentUserRole: me?.role,
        onSaved: () { Navigator.pop(context); _load(); },
        api: _api,
      ),
    );
  }

  void _openResetPassword(Map<String, dynamic> u) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ResetPasswordSheet(userId: u['_id'], userName: u['fullName'] ?? u['name'], api: _api,
        onDone: () => Navigator.pop(context)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('USER MANAGEMENT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          Text('${_filtered.length} system users', style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          // Role filter
          PopupMenuButton<String?>(
            color: AppColors.surfaceVariant,
            icon: Icon(Icons.filter_list,
              color: _roleFilter != null ? AppColors.primary : AppColors.textPrimary),
            onSelected: (v) => setState(() => _roleFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All Roles')),
              const PopupMenuItem(value: 'Administrator', child: Text('Admin')),
              const PopupMenuItem(value: 'SecurityOfficer', child: Text('Officer')),
              const PopupMenuItem(value: 'Guard', child: Text('Guard')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.background,
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('ADD USER', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
        onPressed: () => _openForm(),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
        : _filtered.isEmpty
          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.manage_accounts_outlined, size: 64, color: AppColors.textMuted.withOpacity(0.4)),
              const SizedBox(height: 16),
              const Text('No users found', style: TextStyle(color: AppColors.textMuted, fontSize: 16)),
            ]))
          : RefreshIndicator(
              onRefresh: _load, color: AppColors.primary,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                itemCount: _filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _UserTile(
                  user: _filtered[i],
                  currentUserId: me?.id ?? '',
                  onEdit: () => _openForm(user: _filtered[i]),
                  onToggle: () => _toggleStatus(_filtered[i]),
                  onDelete: () => _deleteUser(_filtered[i]),
                  onResetPassword: () => _openResetPassword(_filtered[i]),
                ),
              ),
            ),
    );
  }
}

// ─── User Tile ────────────────────────────────────────────────────────────────
class _UserTile extends StatelessWidget {
  final Map<String, dynamic> user;
  final String currentUserId;
  final VoidCallback onEdit, onToggle, onDelete, onResetPassword;
  const _UserTile({required this.user, required this.currentUserId,
    required this.onEdit, required this.onToggle, required this.onDelete,
    required this.onResetPassword});

  Color get _roleColor {
    switch (user['role']) {
      case 'Administrator':
      case 'admin':   return AppColors.danger;
      case 'SecurityOfficer':
      case 'officer': return AppColors.warning;
      case 'Guard':
      case 'guard':   return AppColors.primary;
      default:        return AppColors.textMuted;
    }
  }

  IconData get _roleIcon {
    switch (user['role']) {
      case 'Administrator':
      case 'admin':   return Icons.admin_panel_settings;
      case 'SecurityOfficer':
      case 'officer': return Icons.military_tech;
      case 'Guard':
      case 'guard':   return Icons.security;
      default:        return Icons.visibility;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isActive = user['isActive'] ?? true;
    final isSelf = user['_id'] == currentUserId;
    final name = user['fullName'] ?? user['name'] ?? '';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelf ? AppColors.primary.withOpacity(0.4) : AppColors.border),
      ),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            // Avatar
            Stack(children: [
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _roleColor.withOpacity(0.15),
                  border: Border.all(color: _roleColor.withOpacity(0.4), width: 1.5),
                ),
                child: Center(child: Text(initial,
                  style: TextStyle(color: _roleColor, fontSize: 20, fontWeight: FontWeight.bold))),
              ),
              if (!isActive)
                Positioned.fill(child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black.withOpacity(0.55),
                  ),
                  child: const Icon(Icons.block, color: Colors.red, size: 20),
                )),
            ]),
            const SizedBox(width: 14),
            // Info
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(name,
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15,
                    color: isActive ? AppColors.textPrimary : AppColors.textMuted))),
                if (isSelf)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(4)),
                    child: const Text('YOU', style: TextStyle(color: AppColors.primary, fontSize: 9, fontWeight: FontWeight.w800)),
                  ),
              ]),
              const SizedBox(height: 2),
              Text(user['username'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              Text(user['email'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ])),
            // Role badge
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _roleColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: _roleColor.withOpacity(0.3)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(_roleIcon, size: 12, color: _roleColor),
                  const SizedBox(width: 4),
                  Text((user['role'] ?? '').toUpperCase(),
                    style: TextStyle(color: _roleColor, fontSize: 10, fontWeight: FontWeight.w800)),
                ]),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: isActive ? AppColors.success.withOpacity(0.1) : AppColors.danger.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4)),
                child: Text(isActive ? 'ACTIVE' : 'INACTIVE',
                  style: TextStyle(
                    color: isActive ? AppColors.success : AppColors.danger,
                    fontSize: 9, fontWeight: FontWeight.w700)),
              ),
            ]),
          ]),
        ),
        // Action buttons row
        Container(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: AppColors.border))),
          child: Row(children: [
            _ActionBtn(icon: Icons.edit_outlined, label: 'EDIT', color: AppColors.secondary, onTap: onEdit),
            _Divider(),
            _ActionBtn(
              icon: isActive ? Icons.block : Icons.check_circle_outline,
              label: isActive ? 'DEACTIVATE' : 'ACTIVATE',
              color: isActive ? AppColors.warning : AppColors.success,
              onTap: isSelf ? null : onToggle,
            ),
            _Divider(),
            _ActionBtn(icon: Icons.lock_reset, label: 'RESET PWD', color: AppColors.accent, onTap: onResetPassword),
          ]),
        ),
      ]),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
    Container(width: 1, height: 36, color: AppColors.border);
}

class _ActionBtn extends StatelessWidget {
  final IconData icon; final String label; final Color color; final VoidCallback? onTap;
  const _ActionBtn({required this.icon, required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Column(children: [
          Icon(icon, size: 16, color: onTap == null ? AppColors.textMuted : color),
          const SizedBox(height: 3),
          Text(label, style: TextStyle(
            fontSize: 8, fontWeight: FontWeight.w700, letterSpacing: 0.5,
            color: onTap == null ? AppColors.textMuted : color)),
        ]),
      ),
    ),
  );
}

// ─── User Form Sheet ──────────────────────────────────────────────────────────
class _UserFormSheet extends StatefulWidget {
  final Map<String, dynamic>? user;
  final String? currentUserRole;
  final VoidCallback onSaved;
  final ApiService api;
  const _UserFormSheet({this.user, this.currentUserRole, required this.onSaved, required this.api});
  @override State<_UserFormSheet> createState() => _UserFormSheetState();
}

class _UserFormSheetState extends State<_UserFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name, _username, _email, _password,
      _badge, _rank, _phone;
  String _role = 'Guard';
  bool _loading = false;
  List<dynamic> _personnelList = [];
  String? _selectedPersonnelId;
  String? _selectedPersonnelMilitaryId;

  bool get isEdit => widget.user != null;
  bool get isSecurityOfficer => widget.currentUserRole == 'SecurityOfficer' || widget.currentUserRole == 'officer';

  String _canonicalRole(String? role) {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'officer':
        return 'SecurityOfficer';
      case 'guard':
        return 'Guard';
      default:
        return role ?? 'Guard';
    }
  }

  @override
  void initState() {
    super.initState();
    final u = widget.user;
    _name     = TextEditingController(text: u?['fullName'] ?? u?['name'] ?? '');
    _username = TextEditingController(text: u?['username'] ?? '');
    _email    = TextEditingController(text: u?['email'] ?? '');
    _password = TextEditingController();
    _badge    = TextEditingController(text: u?['militaryId'] ?? u?['badgeNumber'] ?? '');
    _rank     = TextEditingController(text: u?['rank'] ?? '');
    _phone    = TextEditingController(text: u?['phone'] ?? '');
    _role     = isSecurityOfficer ? 'Guard' : _canonicalRole(u?['role']);
    if (_role == 'Guard' || _role == 'SecurityOfficer') _fetchPersonnel();
  }

  Future<void> _fetchPersonnel() async {
    try {
      final res = await widget.api.getPersonnel();
      if (mounted) setState(() {
        _personnelList = res['data'] ?? [];
        final existingMilitaryId = _badge.text;
        for (final p in _personnelList) {
          if (p['personnelId'] == existingMilitaryId || p['idNumber'] == existingMilitaryId || p['militaryId'] == existingMilitaryId) {
            _selectedPersonnelId = p['_id'];
            _selectedPersonnelMilitaryId = p['personnelId'];
            break;
          }
        }
      });
    } catch (e) {
      debugPrint('Failed to fetch personnel: $e');
    }
  }

  @override
  void dispose() {
    for (final c in [_name, _username, _email, _password, _badge, _rank, _phone]) c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_role == 'Guard' && (_selectedPersonnelMilitaryId == null || _selectedPersonnelMilitaryId!.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select an existing personnel record before creating a guard account.'), backgroundColor: AppColors.danger));
      return;
    }
    setState(() => _loading = true);
    try {
      final body = <String, dynamic>{
        'fullName': _name.text.trim(),
        'email': _email.text.trim(),
        'role': _role,
        if (_badge.text.isNotEmpty) 'badgeNumber': _badge.text.trim(),
        if (_selectedPersonnelMilitaryId != null) 'militaryId': _selectedPersonnelMilitaryId,
        if (_rank.text.isNotEmpty)  'rank': _rank.text.trim(),
        if (_phone.text.isNotEmpty) 'phone': _phone.text.trim(),
      };
      if (isEdit) {
        await widget.api.updateUser(widget.user!['_id'], body);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User updated.'), backgroundColor: AppColors.success));
      } else {
        body['username'] = _username.text.trim();
        body['password'] = _password.text;
        await widget.api.createUser(body);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User created.'), backgroundColor: AppColors.success));
      }
      widget.onSaved();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(children: [
          // Handle
          Container(margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Row(children: [
              Icon(isEdit ? Icons.edit : Icons.person_add_outlined, color: AppColors.primary),
              const SizedBox(width: 12),
              Text(isEdit ? 'EDIT USER' : 'CREATE NEW USER',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary, letterSpacing: 1)),
            ]),
          ),
          const Divider(color: AppColors.border, height: 24),
          // Form
          Expanded(child: Form(
            key: _formKey,
            child: ListView(controller: ctrl, padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              children: [
                // Role selector
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _role,
                      dropdownColor: AppColors.surfaceVariant,
                      isExpanded: true,
                      icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted),
                      items: isSecurityOfficer
                        ? [_roleItem('Guard', 'Guard', Icons.security, AppColors.primary)]
                        : [
                            _roleItem('Administrator',   'Admin',   Icons.admin_panel_settings, AppColors.danger),
                            _roleItem('SecurityOfficer', 'Officer', Icons.military_tech,        AppColors.warning),
                            _roleItem('Guard',           'Guard',   Icons.security,             AppColors.primary),
                          ],
                      onChanged: (v) => setState(() {
                        _role = v!;
                        if (_role == 'Guard' || _role == 'SecurityOfficer') _fetchPersonnel();
                      }),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                if (!isEdit) ...[
                  _FormField(ctrl: _username, label: 'Username *', icon: Icons.alternate_email,
                    validator: (v) => v!.isEmpty ? 'Required' : null),
                  const SizedBox(height: 14),
                  _FormField(ctrl: _password, label: 'Password *', icon: Icons.lock_outline,
                    obscure: true,
                    validator: (v) => v!.length < 6 ? 'Min 6 characters' : null),
                  const SizedBox(height: 14),
                ],

                if (_role == 'Guard' || _role == 'SecurityOfficer') ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedPersonnelId,
                        dropdownColor: AppColors.surfaceVariant,
                        isExpanded: true,
                        hint: Text(_role == 'Guard' ? 'Select Personnel Record *' : 'Link to Personnel Record', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        icon: const Icon(Icons.link, color: AppColors.primary),
                        items: _personnelList
                          .where((p) => p['type'] == 'Military' || p['type'] == 'Staff')
                          .map((p) => DropdownMenuItem<String>(
                            value: p['_id'],
                            child: Text('${p['fullName']} (${p['personnelId']} - ${p['rank'] ?? p['type']})', style: const TextStyle(color: AppColors.textPrimary)),
                          )).toList(),
                        onChanged: (val) {
                          if (val == null) return;
                          final p = _personnelList.firstWhere((element) => element['_id'] == val, orElse: () => null);
                          if (p != null) {
                            setState(() {
                              _selectedPersonnelId = val;
                              _username.text = p['email'] ?? _username.text;
                              _name.text = p['fullName'] ?? _name.text;
                              _email.text = p['email'] ?? _email.text;
                              _rank.text = p['rank'] ?? _rank.text;
                              _phone.text = p['phone'] ?? _phone.text;
                              _badge.text = p['personnelId'] ?? _badge.text;
                              _selectedPersonnelMilitaryId = p['personnelId'];
                            });
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Auto-filled from Personnel data'), backgroundColor: AppColors.success, duration: Duration(seconds: 2)));
                          }
                        },
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 4, bottom: 14, left: 4),
                    child: Text(_role == 'Guard'
                      ? 'Guard accounts must be linked to an existing personnel record. Details are filled from that record.'
                      : 'Selecting a personnel automatically fills their details.',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ),
                ],
                _FormField(ctrl: _name, label: 'Full Name *', icon: Icons.person_outline,
                  validator: (v) => v!.isEmpty ? 'Required' : null),
                const SizedBox(height: 14),
                _FormField(ctrl: _email, label: 'Email *', icon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => !v!.contains('@') ? 'Valid email required' : null),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  value: AppConstants.ranks.contains(_rank.text) ? _rank.text : null,
                  decoration: const InputDecoration(
                    labelText: 'Rank',
                    prefixIcon: Icon(Icons.military_tech_outlined, color: AppColors.textMuted, size: 20),
                  ),
                  items: AppConstants.ranks.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                  onChanged: (v) => setState(() => _rank.text = v ?? ''),
                ),
                const SizedBox(height: 14),
                _FormField(ctrl: _phone, label: 'Phone', icon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone),
                const SizedBox(height: 28),
                SizedBox(height: 52, child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  child: _loading
                    ? const CircularProgressIndicator(strokeWidth: 2, color: AppColors.background)
                    : Text(isEdit ? 'SAVE CHANGES' : 'CREATE USER',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1)),
                )),
              ],
            ),
          )),
        ]),
      ),
    );
  }

  DropdownMenuItem<String> _roleItem(String val, String label, IconData icon, Color color) =>
    DropdownMenuItem(value: val,
      child: Row(children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 10),
        Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
      ]));
}

class _FormField extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final IconData icon;
  final bool obscure;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  const _FormField({required this.ctrl, required this.label, required this.icon,
    this.obscure = false, this.keyboardType, this.validator});
  @override
  Widget build(BuildContext context) => TextFormField(
    controller: ctrl, obscureText: obscure,
    keyboardType: keyboardType, validator: validator,
    decoration: InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: AppColors.textMuted, size: 20),
    ),
  );
}

// ─── Reset Password Sheet ─────────────────────────────────────────────────────
class _ResetPasswordSheet extends StatefulWidget {
  final String userId, userName;
  final ApiService api;
  final VoidCallback onDone;
  const _ResetPasswordSheet({required this.userId, required this.userName,
    required this.api, required this.onDone});
  @override State<_ResetPasswordSheet> createState() => _ResetPasswordSheetState();
}

class _ResetPasswordSheetState extends State<_ResetPasswordSheet> {
  final _ctrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading = false;

  Future<void> _reset() async {
    if (_ctrl.text.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 6 characters'), backgroundColor: AppColors.danger));
      return;
    }
    if (_ctrl.text != _confirmCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match'), backgroundColor: AppColors.danger));
      return;
    }
    setState(() => _loading = true);
    try {
      await widget.api.resetUserPassword(widget.userId, _ctrl.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Password reset for ${widget.userName}.'), backgroundColor: AppColors.success));
        widget.onDone();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Row(children: [
            const Icon(Icons.lock_reset, color: AppColors.accent),
            const SizedBox(width: 12),
            Expanded(child: Text('RESET PASSWORD: ${widget.userName.toUpperCase()}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15,
                color: AppColors.textPrimary, letterSpacing: 0.5))),
          ]),
          const SizedBox(height: 20),
          TextField(
            controller: _ctrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'New Password',
              prefixIcon: Icon(Icons.lock_outline, color: AppColors.textMuted, size: 20)),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _confirmCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Confirm Password',
              prefixIcon: Icon(Icons.lock_outline, color: AppColors.textMuted, size: 20)),
          ),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _reset,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white),
              child: _loading
                ? const CircularProgressIndicator(strokeWidth: 2, color: Colors.white)
                : const Text('RESET PASSWORD', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
            )),
        ]),
      ),
    );
  }
}
