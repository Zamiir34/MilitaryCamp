// lib/screens/log_entry_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'qr_scanner_screen.dart';
import 'dart:convert';

class LogEntryScreen extends StatefulWidget {
  final String type; // 'personnel' or 'vehicle'
  const LogEntryScreen({super.key, required this.type});
  @override State<LogEntryScreen> createState() => _LogEntryScreenState();
}

class _LogEntryScreenState extends State<LogEntryScreen> {
  final _api = ApiService();
  final _searchCtrl = TextEditingController();
  Personnel? _foundPersonnel;
  Vehicle? _foundVehicle;
  bool _searching = false, _logging = false;
  String _action = 'entry';
  String _gate = AppConstants.gates.first;
  String _authMethod = 'manual';
  final _purposeCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String? _error, _success;

  bool get isPersonnel => widget.type == 'personnel';

  Future<void> _search() async {
    if (_searchCtrl.text.trim().isEmpty) return;
    setState(() { _searching = true; _error = null; _foundPersonnel = null; _foundVehicle = null; });
    try {
      if (isPersonnel) {
        _foundPersonnel = await _api.searchByBadge(_searchCtrl.text.trim());
      } else {
        _foundVehicle = await _api.searchByPlate(_searchCtrl.text.trim().toUpperCase());
      }
    } catch (e) {
      setState(() => _error = 'Not found. Check the ${isPersonnel ? 'badge number' : 'plate number'}.');
    } finally {
      setState(() => _searching = false);
    }
  }

  Future<void> _scanQR() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const QRScannerScreen()),
    );

    if (result == null) return;

    setState(() { _searching = true; _error = null; _foundPersonnel = null; _foundVehicle = null; });
    try {
      final data = jsonDecode(result);
      final id = data['id'];
      final type = data['type'];

      if (type == 'personnel' && isPersonnel) {
        _foundPersonnel = await _api.getPersonnelById(id);
        _authMethod = 'qr_code';
      } else if (type == 'vehicle' && !isPersonnel) {
        _foundVehicle = await _api.getVehicleById(id);
        _authMethod = 'qr_code';
      } else {
        setState(() => _error = 'Invalid QR code for this section.');
      }
    } catch (e) {
      // If JSON parsing fails, try searching as raw badge/plate
      try {
        if (isPersonnel) {
          _foundPersonnel = await _api.searchByBadge(result);
        } else {
          _foundVehicle = await _api.searchByPlate(result);
        }
        _authMethod = 'qr_code';
      } catch (e2) {
        setState(() => _error = 'Invalid QR code format.');
      }
    } finally {
      setState(() => _searching = false);
    }
  }

  Future<void> _logEntry() async {
    if (isPersonnel && _foundPersonnel == null) return;
    if (!isPersonnel && _foundVehicle == null) return;
    setState(() { _logging = true; _error = null; _success = null; });
    try {
      if (isPersonnel) {
        await _api.logPersonnelEntry({
          'personnelId': _foundPersonnel!.id,
          'action': _action,
          'gate': _gate,
          'authMethod': _authMethod,
          'purpose': _purposeCtrl.text,
          'notes': _notesCtrl.text,
        });
      } else {
        await _api.logVehicleEntry({
          'vehicleId': _foundVehicle!.id,
          'action': _action,
          'gate': _gate,
          'authMethod': _authMethod,
          'purpose': _purposeCtrl.text,
          'notes': _notesCtrl.text,
        });
      }
      setState(() {
        _success = '${isPersonnel ? 'Personnel' : 'Vehicle'} ${_action.toUpperCase()} logged successfully!';
        _foundPersonnel = null; _foundVehicle = null;
        _searchCtrl.clear(); _purposeCtrl.clear(); _notesCtrl.clear();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_success!), backgroundColor: AppColors.success));
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _logging = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('LOG ${isPersonnel ? "PERSONNEL" : "VEHICLE"} ${_action.toUpperCase()}'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // Action Toggle
            _SectionLabel(label: 'ACTION'),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: _ActionBtn(label: 'ENTRY', icon: Icons.login, selected: _action == 'entry', color: AppColors.success, onTap: () => setState(() => _action = 'entry'))),
              const SizedBox(width: 12),
              Expanded(child: _ActionBtn(label: 'EXIT', icon: Icons.logout, selected: _action == 'exit', color: AppColors.warning, onTap: () => setState(() => _action = 'exit'))),
            ]),
            const SizedBox(height: 24),

            // Search
            _SectionLabel(label: isPersonnel ? 'FIND PERSONNEL BY BADGE' : 'FIND VEHICLE BY PLATE'),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: TextField(
                controller: _searchCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  hintText: isPersonnel ? 'e.g. MIL-001' : 'e.g. ABC-1234',
                  prefixIcon: Icon(isPersonnel ? Icons.badge_outlined : Icons.car_repair_outlined, color: AppColors.textMuted),
                ),
                onSubmitted: (_) => _search(),
              )),
              const SizedBox(width: 8),
              SizedBox(height: 52, child: ElevatedButton(
                onPressed: _searching ? null : _search,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16), minimumSize: const Size(60, 52)),
                child: _searching ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.background)) : const Icon(Icons.search),
              )),
              const SizedBox(width: 8),
              SizedBox(height: 52, child: ElevatedButton(
                onPressed: _searching ? null : _scanQR,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  backgroundColor: AppColors.secondary,
                  minimumSize: const Size(60, 52)
                ),
                child: const Icon(Icons.qr_code_scanner, color: Colors.white),
              )),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 10),
              _ErrorBanner(message: _error!),
            ],
            const SizedBox(height: 16),

            // Found subject card
            if (_foundPersonnel != null) _PersonnelCard(p: _foundPersonnel!),
            if (_foundVehicle != null) _VehicleCard(v: _foundVehicle!),

            if (_foundPersonnel != null || _foundVehicle != null) ...[
              const SizedBox(height: 24),
              // Gate Selection
              _SectionLabel(label: 'GATE / CHECKPOINT'),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _gate,
                dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(prefixIcon: Icon(Icons.door_back_door_outlined, color: AppColors.textMuted)),
                items: AppConstants.gates.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                onChanged: (v) => setState(() => _gate = v!),
              ),
              const SizedBox(height: 16),

              // Auth Method
              _SectionLabel(label: 'AUTH METHOD'),
              const SizedBox(height: 8),
              Wrap(spacing: 8, children: ['manual', 'qr_code', 'badge', 'biometric'].map((m) =>
                ChoiceChip(
                  label: Text(m.toUpperCase().replaceAll('_', ' '), style: const TextStyle(fontFamily: 'Rajdhani', fontSize: 11)),
                  selected: _authMethod == m,
                  selectedColor: AppColors.primary.withOpacity(0.2),
                  backgroundColor: AppColors.surfaceVariant,
                  side: BorderSide(color: _authMethod == m ? AppColors.primary : AppColors.border),
                  labelStyle: TextStyle(color: _authMethod == m ? AppColors.primary : AppColors.textMuted),
                  onSelected: (_) => setState(() => _authMethod = m),
                )
              ).toList()),
              const SizedBox(height: 16),

              // Purpose
              _SectionLabel(label: 'PURPOSE (OPTIONAL)'),
              const SizedBox(height: 8),
              TextField(controller: _purposeCtrl, decoration: const InputDecoration(hintText: 'State the purpose of entry/exit', prefixIcon: Icon(Icons.description_outlined, color: AppColors.textMuted))),
              const SizedBox(height: 16),

              // Notes
              _SectionLabel(label: 'NOTES (OPTIONAL)'),
              const SizedBox(height: 8),
              TextField(controller: _notesCtrl, maxLines: 2, decoration: const InputDecoration(hintText: 'Additional observations...', prefixIcon: Icon(Icons.notes_outlined, color: AppColors.textMuted))),
              const SizedBox(height: 28),

              // Submit
              SizedBox(height: 52, child: ElevatedButton(
                onPressed: _logging ? null : _logEntry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _action == 'entry' ? AppColors.success : AppColors.warning,
                  foregroundColor: Colors.white,
                ),
                child: _logging
                  ? const CircularProgressIndicator(strokeWidth: 2, color: Colors.white)
                  : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(_action == 'entry' ? Icons.login : Icons.logout, size: 20),
                      const SizedBox(width: 10),
                      Text('CONFIRM ${_action.toUpperCase()}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 1)),
                    ]),
              )),
            ],
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});
  @override Widget build(BuildContext context) => Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600));
}

class _ActionBtn extends StatelessWidget {
  final String label; final IconData icon; final bool selected; final Color color; final VoidCallback onTap;
  const _ActionBtn({required this.label, required this.icon, required this.selected, required this.color, required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: selected ? color.withOpacity(0.15) : AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: selected ? color : AppColors.border, width: selected ? 1.5 : 1),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, color: selected ? color : AppColors.textMuted, size: 18),
        const SizedBox(width: 8),
        Text(label, style: TextStyle(color: selected ? color : AppColors.textMuted, fontWeight: FontWeight.w700, letterSpacing: 1)),
      ]),
    ),
  );
}

class _PersonnelCard extends StatelessWidget {
  final Personnel p;
  const _PersonnelCard({required this.p});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surface, borderRadius: BorderRadius.circular(12),
      border: Border.all(color: p.isActive ? AppColors.primary.withOpacity(0.4) : AppColors.danger.withOpacity(0.4), width: 1.5),
    ),
    child: Row(children: [
      CircleAvatar(backgroundColor: AppColors.primary.withOpacity(0.2), child: Text(p.firstName.isNotEmpty ? p.firstName.substring(0, 1).toUpperCase() : 'P', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold))),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(p.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.textPrimary)),
        Text('${p.rank} · ${p.unit}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        Text(p.badgeNumber, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
      ])),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        _StatusBadge(label: p.status?.toUpperCase() ?? 'UNKNOWN', color: p.isActive ? AppColors.success : AppColors.danger),
        const SizedBox(height: 6),
        _StatusBadge(label: p.isInside ? 'INSIDE' : 'OUTSIDE', color: p.isInside ? AppColors.primary : AppColors.textMuted),
      ]),
    ]),
  );
}

class _VehicleCard extends StatelessWidget {
  final Vehicle v;
  const _VehicleCard({required this.v});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surface, borderRadius: BorderRadius.circular(12),
      border: Border.all(color: v.isBlacklisted ? AppColors.danger.withOpacity(0.6) : AppColors.secondary.withOpacity(0.4), width: 1.5),
    ),
    child: Row(children: [
      Container(width: 44, height: 44, decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
        child: const Icon(Icons.directions_car, color: AppColors.secondary)),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(v.plateNumber, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: AppColors.textPrimary, letterSpacing: 2)),
        Text('${v.brand ?? ''} ${v.model ?? ''} ${v.color != null ? '· ${v.color}' : ''}'.trim(), style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        if (v.ownerName != null) Text('Owner: ${v.ownerName}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
      ])),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        _StatusBadge(label: v.status?.toUpperCase() ?? 'UNKNOWN', color: v.isBlacklisted ? AppColors.danger : AppColors.success),
        const SizedBox(height: 6),
        _StatusBadge(label: v.isInside ? 'INSIDE' : 'OUTSIDE', color: v.isInside ? AppColors.primary : AppColors.textMuted),
      ]),
    ]),
  );
}

class _StatusBadge extends StatelessWidget {
  final String label; final Color color;
  const _StatusBadge({required this.label, required this.color});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
    child: Text(label, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 1)),
  );
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.danger.withOpacity(0.3))),
    child: Row(children: [
      const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 12))),
    ]),
  );
}
