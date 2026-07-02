// lib/screens/personnel_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';
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
  List<EntryLog> _history = [];
  List<Vehicle> _vehicles = [];
  bool _loading = true;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getPersonnelById(widget.personnelId),
        _api.getPersonnelHistory(widget.personnelId),
        _api.getVehiclesByOwner(widget.personnelId),
      ]);
      setState(() {
        _p = results[0] as Personnel;
        final hMap = results[1] as Map<String, dynamic>;
        _history = (hMap['logs'] as List).map((e) => EntryLog.fromJson(e)).toList();
        _vehicles = results[2] as List<Vehicle>;
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override Widget build(BuildContext context) {
    if (_loading) return const Scaffold(backgroundColor: AppColors.background,
      body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    if (_p == null) return const Scaffold(backgroundColor: AppColors.background,
      body: Center(child: Text('Not found', style: TextStyle(color: AppColors.textMuted))));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(slivers: [
        SliverAppBar(
          expandedHeight: 200, pinned: true, backgroundColor: AppColors.surface,
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              color: AppColors.surface,
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const SizedBox(height: 60),
                CircleAvatar(
                  radius: 40,
                  backgroundColor: AppColors.primary.withOpacity(0.2),
                  child: _p!.photo != null && _p!.photo!.isNotEmpty
                      ? ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: '${AppConstants.baseUrl.replaceAll('/api', '')}${_p!.photo}',
                            fit: BoxFit.cover,
                            width: 80,
                            height: 80,
                            placeholder: (context, url) => const CircularProgressIndicator(color: AppColors.primary),
                            errorWidget: (context, url, error) => const Icon(Icons.person, color: AppColors.primary, size: 40),
                          ),
                        )
                      : Text(
                          '${_p!.firstName.isNotEmpty ? _p!.firstName[0] : '?'}${_p!.lastName.isNotEmpty ? _p!.lastName[0] : ''}',
                          style: const TextStyle(color: AppColors.primary, fontSize: 28, fontWeight: FontWeight.bold),
                        ),
                ),
                const SizedBox(height: 10),
                Text(_p!.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                Text('${_p!.rank} · ${_p!.unit}', style: const TextStyle(color: AppColors.textSecondary)),
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
              _Badge(_p!.isInside ? 'INSIDE CAMP' : 'OUTSIDE', _p!.isInside ? AppColors.primary : AppColors.textMuted),
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

            // ── Registered Vehicles ──────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(children: [
                  const Text('REGISTERED VEHICLES', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
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
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(children: [
                  Icon(Icons.no_crash, color: AppColors.textMuted.withOpacity(0.5), size: 28),
                  const SizedBox(width: 12),
                  const Text('No vehicle on file', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ]),
              )
            else
              ..._vehicles.map((v) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: v.isBlacklisted
                          ? AppColors.danger.withOpacity(0.4)
                          : AppColors.border,
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
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary, letterSpacing: 1),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (v.brand != null && v.brand!.isNotEmpty) v.brand!,
                            if (v.model != null && v.model!.isNotEmpty) v.model!,
                            v.type.toUpperCase().replaceAll('_', ' '),
                          ].join(' · '),
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
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
                        v.isInside ? AppColors.primary : AppColors.textMuted,
                      ),
                    ]),
                  ]),
                ),
              )),
            const SizedBox(height: 24),

            // Activity history
            const Text('ENTRY/EXIT HISTORY', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            ..._history.map((log) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
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
                    Text('${log.action.toUpperCase()} · ${log.gate}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary)),
                    Text('by ${log.guardName ?? 'System'}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  ])),
                  Text(DateFormat('MMM d\nHH:mm').format(log.timestamp),
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                ]),
              ),
            )),
            if (_history.isEmpty) const Center(
              child: Padding(padding: EdgeInsets.all(24), child: Text('No history found', style: TextStyle(color: AppColors.textMuted)))),
          ]),
        )),
      ]),
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
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
    child: Column(children: children),
  );
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(flex: 2, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
      Expanded(flex: 3, child: Text(value, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500))),
    ]),
  );
}
