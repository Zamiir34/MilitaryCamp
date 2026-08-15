import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'log_entry_screen.dart';
import 'add_vehicle_screen.dart';

class PersonnelDetailScreen extends StatefulWidget {
  final String personnelId;
  const PersonnelDetailScreen({super.key, required this.personnelId});
  @override State<PersonnelDetailScreen> createState() => _PersonnelDetailScreenState();
}

class _PersonnelDetailScreenState extends State<PersonnelDetailScreen> {
  final _api = ApiService();
  Personnel? _p;
  Map<String, dynamic>? _guardAccount;
  List<EntryLog> _history = [];
  List<Vehicle> _vehicles = [];
  bool _loading = true;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final pObj = await _api.getPersonnelById(widget.personnelId);
      Map<String, dynamic>? gAccount;
      try {
        gAccount = await _api.getGuardAccount(pObj.id);
      } catch (_) {}

      final results = await Future.wait([
        _api.getPersonnelHistory(widget.personnelId),
        _api.getVehiclesByOwner(widget.personnelId),
      ]);
      setState(() {
        _p = pObj;
        _guardAccount = gAccount;
        final hMap = results[0] as Map<String, dynamic>;
        _history = (hMap['logs'] as List).map((e) => EntryLog.fromJson(e)).toList();
        _vehicles = results[1] as List<Vehicle>;
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override Widget build(BuildContext context) {
    if (_loading) return Scaffold(backgroundColor: context.bgColor,
      body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    if (_p == null) return Scaffold(backgroundColor: context.bgColor,
      body: Center(child: Text('Not found', style: TextStyle(color: context.textMuted))));

    return Scaffold(
      backgroundColor: context.bgColor,
      body: CustomScrollView(slivers: [
        SliverAppBar(
          expandedHeight: 200, pinned: true, backgroundColor: context.surfaceColor,
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              color: context.surfaceColor,
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const SizedBox(height: 60),
                SafeAvatar(
                  photo: _p!.photo,
                  radius: 40,
                  fallback: Text(
                    '${_p!.firstName.isNotEmpty ? _p!.firstName[0] : '?'}${_p!.lastName.isNotEmpty ? _p!.lastName[0] : ''}',
                    style: const TextStyle(color: AppColors.primary, fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 10),
                Text(_p!.fullName, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: context.textPrimary)),
                Text('${_p!.rank} · ${_p!.unit}', style: TextStyle(color: context.textSecondary)),
              ]),
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.print_outlined),
              tooltip: 'Print Badge',
              onPressed: () {}, // Placeholder for printing logic
            ),
            IconButton(
              icon: const Icon(Icons.swap_horiz),
              tooltip: 'Log Entry/Exit',
              onPressed: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => const LogEntryScreen(action: 'entry', initialSubjectType: 'Personnel'))).then((_) => _load()),
            ),
          ],
        ),

        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // Status row
            Row(children: [
              _Badge(_p!.isInside ? 'INSIDE CAMP' : 'OUTSIDE', _p!.isInside ? AppColors.primary : context.textMuted),
              const SizedBox(width: 8),
              _Badge(_p!.category?.toUpperCase() ?? '', AppColors.secondary),
            ]),
            const SizedBox(height: 16),

            // Info card
            _InfoCard(children: [
              if (_p!.militaryId != null && _p!.militaryId!.isNotEmpty) _InfoRow('Military ID Card', _p!.militaryId!),
              _InfoRow('Badge Number', _p!.badgeNumber),
              _InfoRow('National ID', _p!.nationalId),
              _InfoRow('Access Level', 'Level ${_p!.accessLevel}'),
              if (_p!.phone != null) _InfoRow('Phone', _p!.phone!),
              if (_p!.bloodType != null) _InfoRow('Blood Type', _p!.bloodType!),
            ]),
            const SizedBox(height: 24),

            // Guard Account Management for Security Officers / Admins
            if (context.watch<AuthProvider>().user?.isOfficer == true) ...[
              _buildGuardAccountCard(),
              const SizedBox(height: 24),
            ],
            
            // QR Code Section
            _QRCodeCard(personnel: _p!),
            const SizedBox(height: 24),

            // ── Registered Vehicles ──────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(children: [
                  Text('REGISTERED VEHICLES', style: TextStyle(fontSize: 10, color: context.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                  const SizedBox(width: 8),
                  if (_vehicles.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('${_vehicles.length}',
                        style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w700)),
                    ),
                ]),
                TextButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AddVehicleScreen(
                        initialOwnerId: _p!.id,
                        initialOwnerName: _p!.fullName,
                        initialOwnerPhone: _p!.phone,
                        initialCategory: _p!.category,
                      ),
                    ),
                  ).then((_) => _load()),
                  icon: const Icon(Icons.add, size: 14),
                  label: const Text('ADD', style: TextStyle(fontSize: 11)),
                  style: TextButton.styleFrom(foregroundColor: AppColors.primary, padding: EdgeInsets.zero),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (_vehicles.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.borderColor),
                ),
                child: Row(children: [
                  Icon(Icons.no_crash, color: context.textMuted.withOpacity(0.5), size: 28),
                  const SizedBox(width: 12),
                  Text('No vehicle on file', style: TextStyle(color: context.textMuted, fontSize: 13)),
                ]),
              )
            else
              ..._vehicles.map((v) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: v.isBlacklisted
                          ? AppColors.danger.withOpacity(0.4)
                          : context.borderColor,
                    ),
                  ),
                  child: Row(children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.directions_car, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(
                          v.plateNumber,
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700,
                              color: context.textPrimary, letterSpacing: 1),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (v.brand != null && v.brand!.isNotEmpty) v.brand!,
                            if (v.model != null && v.model!.isNotEmpty) v.model!,
                            v.type.toUpperCase().replaceAll('_', ' '),
                          ].join(' · '),
                          style: TextStyle(fontSize: 11, color: context.textSecondary),
                        ),
                      ]),
                    ),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      _Badge(
                        v.status?.toUpperCase() ?? 'ACTIVE',
                        v.isBlacklisted ? AppColors.danger : AppColors.success,
                      ),
                      const SizedBox(height: 4),
                      _Badge(
                        v.isInside ? 'INSIDE' : 'OUTSIDE',
                        v.isInside ? AppColors.primary : context.textMuted,
                      ),
                    ]),
                  ]),
                ),
              )),
            const SizedBox(height: 24),

            // Activity history
            Text('ENTRY/EXIT HISTORY', style: TextStyle(fontSize: 10, color: context.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            ..._history.map((log) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: context.surfaceColor, borderRadius: BorderRadius.circular(10), border: Border.all(color: context.borderColor)),
                child: Row(children: [
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: (log.isEntry ? AppColors.success : AppColors.warning).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(log.isEntry ? Icons.login : Icons.logout,
                      color: log.isEntry ? AppColors.success : AppColors.warning, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${log.action.toUpperCase()} · ${log.gate}', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: context.textPrimary)),
                    Text('by ${log.guardName ?? 'System'}', style: TextStyle(fontSize: 11, color: context.textMuted)),
                  ])),
                  Text(DateFormat('MMM d\nHH:mm').format(log.timestamp),
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: context.textMuted)),
                ]),
              ),
            )),
            if (_history.isEmpty) Center(
              child: Padding(padding: const EdgeInsets.all(24), child: Text('No history found', style: TextStyle(color: context.textMuted)))),
          ]),
        )),
      ]),
    );
  }

  Widget _buildGuardAccountCard() {
    final hasAccount = _guardAccount?['hasAccount'] == true;
    final userObj = _guardAccount?['user'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasAccount ? AppColors.success.withOpacity(0.4) : AppColors.primary.withOpacity(0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    hasAccount ? Icons.verified_user : Icons.security,
                    color: hasAccount ? AppColors.success : AppColors.primary,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text('GUARD SYSTEM ACCOUNT', style: TextStyle(fontSize: 10, color: context.textMuted, letterSpacing: 1.5, fontWeight: FontWeight.w700)),
                ],
              ),
              _Badge(
                hasAccount ? 'ASSIGNED' : 'NOT ASSIGNED',
                hasAccount ? AppColors.success : AppColors.warning,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (hasAccount && userObj != null) ...[

            _InfoRow('Email', userObj['email'] ?? 'N/A'),
            _InfoRow('Role', (userObj['role'] ?? 'Guard').toUpperCase()),
            _InfoRow('Assigned Zone', userObj['assignedZone'] ?? 'Zone A - Admin'),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _showResetGuardPasswordDialog,
                icon: const Icon(Icons.lock_reset, size: 16),
                label: const Text('RESET GUARD PASSWORD'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.warning,
                  side: const BorderSide(color: AppColors.warning),
                ),
              ),
            ),
          ] else ...[
            Text(
              'This personnel record currently does not have an active Guard login account.',
              style: TextStyle(color: context.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _showIssueGuardAccountDialog,
                icon: const Icon(Icons.person_add, size: 16),
                label: const Text('ISSUE GUARD ACCOUNT'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _showIssueGuardAccountDialog() async {
    final emailCtrl = TextEditingController(text: _p!.email ?? '');
    final passCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: context.surfaceColor,
          title: Text('Issue Guard Account', style: TextStyle(color: context.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Assign guard login credentials to this personnel record.', style: TextStyle(fontSize: 12, color: context.textMuted)),
                const SizedBox(height: 16),

                TextFormField(
                  controller: emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email *'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password *'),
                  validator: (v) => v == null || v.length < 6 ? 'Min 6 characters' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
            ElevatedButton(
              onPressed: isSubmitting ? null : () async {
                if (!formKey.currentState!.validate()) return;
                setDialogState(() => isSubmitting = true);
                try {
                  final res = await _api.issueGuardAccount(_p!.id, {
                    'email': emailCtrl.text.trim(),
                    'password': passCtrl.text,
                  });
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(res['message'] ?? 'Guard account issued successfully'),
                      backgroundColor: AppColors.success,
                    ));
                    _load();
                  }
                } catch (e) {
                  setDialogState(() => isSubmitting = false);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(e.toString()),
                      backgroundColor: AppColors.danger,
                    ));
                  }
                }
              },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('ISSUE ACCOUNT'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showResetGuardPasswordDialog() async {
    final passCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: context.surfaceColor,
          title: Text('Reset Guard Password', style: TextStyle(color: context.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New Password *'),
                  validator: (v) => v == null || v.length < 6 ? 'Min 6 characters' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
            ElevatedButton(
              onPressed: isSubmitting ? null : () async {
                if (!formKey.currentState!.validate()) return;
                setDialogState(() => isSubmitting = true);
                try {
                  final res = await _api.resetGuardAccountPassword(_p!.id, passCtrl.text);
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(res['message'] ?? 'Password reset successfully'),
                      backgroundColor: AppColors.success,
                    ));
                    _load();
                  }
                } catch (e) {
                  setDialogState(() => isSubmitting = false);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(e.toString()),
                      backgroundColor: AppColors.danger,
                    ));
                  }
                }
              },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('UPDATE PASSWORD'),
            ),
          ],
        ),
      ),
    );
  }
}

// --- Style Section (Custom Widgets) ---

class _Badge extends StatelessWidget {
  final String label; final Color color;
  const _Badge(this.label, this.color);
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: color.withOpacity(0.3))),
    child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
  );
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: context.surfaceColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: context.borderColor)),
    child: Column(children: children),
  );
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(flex: 2, child: Text(label, style: TextStyle(color: context.textMuted, fontSize: 12))),
      Expanded(flex: 3, child: Text(value, style: TextStyle(color: context.textPrimary, fontSize: 13, fontWeight: FontWeight.w500))),
    ]),
  );
}

class _QRCodeCard extends StatelessWidget {
  final Personnel personnel;
  const _QRCodeCard({required this.personnel});

  @override
  Widget build(BuildContext context) {
    // Generate verification link QR matching web app
    final qrData = AppConstants.verifyUrl(personnel.personnelId);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.borderColor),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('IDENTIFICATION QR', style: TextStyle(fontSize: 10, color: context.textMuted, letterSpacing: 2, fontWeight: FontWeight.w800)),
              Icon(Icons.qr_code_2, size: 16, color: AppColors.primary.withOpacity(0.5)),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: AppColors.primary.withOpacity(0.1), blurRadius: 20, spreadRadius: 2),
              ],
            ),
            child: QrImageView(
              data: qrData,
              version: QrVersions.auto,
              size: 180.0,
              gapless: false,
              eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Colors.black),
              dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Colors.black),
            ),
          ),
          const SizedBox(height: 16),
          Text('Scan this code at the gate to verify identity', 
            style: TextStyle(color: context.textMuted, fontSize: 11), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
