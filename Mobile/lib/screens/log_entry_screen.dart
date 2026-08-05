// lib/screens/log_entry_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'qr_scanner_screen.dart';
import 'dart:convert';

class LogEntryScreen extends StatefulWidget {
  final String action; // 'entry' | 'exit'
  final String? initialSubjectType; // 'Personnel' | 'Vehicle' | 'Visitor'
  const LogEntryScreen({super.key, this.action = 'entry', this.initialSubjectType});

  static String modalForAction(String action) => action == 'exit' ? 'Exit' : 'Entry';

  @override State<LogEntryScreen> createState() => _LogEntryScreenState();
}

class _LogEntryScreenState extends State<LogEntryScreen> {
  final _api = ApiService();
  final _searchCtrl = TextEditingController();
  final _purposeCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  String _subjectType = 'Personnel';
  String _gate = AppConstants.gates.first;
  bool _isAuthorized = true;
  bool _searching = false;
  bool _logging = false;
  String? _error;

  String? _subjectName;
  String? _subjectId;
  String? _driverName;
  String? _vehicleId;
  String? _category;
  Map<String, dynamic>? _selectedPreview;

  bool get isEntry => widget.action == 'entry';

  @override
  void initState() {
    super.initState();
    if (widget.initialSubjectType != null) {
      _subjectType = widget.initialSubjectType!;
    }
  }

  Future<void> _search() async {
    final query = _searchCtrl.text.trim();
    if (query.isEmpty) return;
    setState(() { _searching = true; _error = null; _clearSelection(); });
    try {
      if (_subjectType == 'Personnel') {
        final p = await _api.searchByBadge(query);
        _applyPersonnel(p);
      } else if (_subjectType == 'Vehicle') {
        final v = await _api.searchByPlate(query.toUpperCase());
        _applyVehicle(v);
      } else {
        final data = await _api.getVisitors(search: query);
        final list = (data['data'] ?? data['visitors'] ?? []) as List;
        if (list.isEmpty) throw Exception('Visitor not found');
        final v = VisitorModel.fromJson(list.first as Map<String, dynamic>);
        _applyVisitor(v);
      }
    } catch (e) {
      setState(() => _error = 'Not found. Check the search value.');
    } finally {
      setState(() => _searching = false);
    }
  }

  void _clearSelection() {
    _subjectName = null;
    _subjectId = null;
    _driverName = null;
    _vehicleId = null;
    _category = null;
    _selectedPreview = null;
  }

  void _applyPersonnel(Personnel p) {
    _subjectName = p.fullName;
    _subjectId = p.personnelId;
    _driverName = p.hasVehicle ? p.fullName : null;
    _category = p.type;
    _isAuthorized = p.isActive;
    _selectedPreview = {'name': p.fullName, 'detail': '${p.rank} · ${p.unit}', 'id': p.badgeNumber};
  }

  void _applyVehicle(Vehicle v) {
    final vehicleName = [v.brand, v.model].where((s) => s != null && s.isNotEmpty).join(' ').trim();
    final display = vehicleName.isEmpty ? v.plateNumber : '$vehicleName (${v.plateNumber})';
    _subjectName = display;
    _subjectId = v.plateNumber;
    _driverName = v.ownerName;
    _vehicleId = v.id;
    _isAuthorized = !v.isBlacklisted && v.status == 'active';
    _selectedPreview = {'name': display, 'detail': v.ownerName ?? 'No owner', 'id': v.plateNumber};
  }

  void _applyVisitor(VisitorModel v) {
    _subjectName = v.fullName;
    _subjectId = v.visitorId;
    _driverName = v.hasVehicle ? v.fullName : null;
    _category = v.visitorType;
    _isAuthorized = v.status == 'Approved';
    _selectedPreview = {'name': v.fullName, 'detail': v.organization ?? v.visitorType, 'id': v.visitorId};
  }

  Future<void> _scanQR() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const QRScannerScreen()),
    );
    if (result == null) return;

    setState(() { _searching = true; _error = null; _clearSelection(); });
    try {
      String? id;
      String? type;

      if (result.contains('/verify/')) {
        id = result.split('/').last;
        if (id.startsWith('PER-')) type = 'personnel';
        else if (id.startsWith('VEH-')) type = 'vehicle';
        else if (id.startsWith('VIS-')) type = 'visitor';
      } else {
        final data = jsonDecode(result);
        id = data['id']?.toString() ?? data['plate']?.toString();
        type = data['type']?.toString().toLowerCase();
      }

      if (type == 'personnel' && _subjectType == 'Personnel' && id != null) {
        _applyPersonnel(await _api.getPersonnelById(id));
      } else if (type == 'vehicle' && _subjectType == 'Vehicle' && id != null) {
        _applyVehicle(await _api.getVehicleById(id));
      } else if (type == 'visitor' && _subjectType == 'Visitor' && id != null) {
        _applyVisitor(await _api.getVisitorById(id));
      } else {
        setState(() => _error = 'Invalid QR code for selected type.');
      }
    } catch (_) {
      _searchCtrl.text = result;
      await _search();
    } finally {
      setState(() => _searching = false);
    }
  }

  Future<void> _submit() async {
    if (_subjectName == null) return;
    setState(() { _logging = true; _error = null; });
    try {
      final body = {
        'type': _subjectType,
        'subjectName': _subjectName,
        'subjectId': _subjectId,
        if (_driverName != null) 'driverName': _driverName,
        if (_vehicleId != null) 'vehicle': _vehicleId,
        if (_category != null) 'category': _category,
        'gate': _gate,
        'purpose': _purposeCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
        'isAuthorized': _isAuthorized,
      };
      if (isEntry) {
        await _api.recordEntry(body);
      } else {
        await _api.recordExit(body);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${isEntry ? 'Entry' : 'Exit'} recorded successfully'),
          backgroundColor: AppColors.success,
        ));
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _logging = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final actionColor = isEntry ? AppColors.success : AppColors.warning;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('RECORD ${LogEntryScreen.modalForAction(widget.action).toUpperCase()}'),
        backgroundColor: actionColor.withOpacity(0.15),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _SectionLabel(label: 'SUBJECT TYPE'),
            const SizedBox(height: 8),
            Row(children: [
              for (final t in ['Personnel', 'Vehicle', 'Visitor'])
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(right: t != 'Visitor' ? 8 : 0),
                    child: _TypeChip(
                      label: t.toUpperCase(),
                      selected: _subjectType == t,
                      onTap: () => setState(() { _subjectType = t; _clearSelection(); _searchCtrl.clear(); _error = null; }),
                    ),
                  ),
                ),
            ]),
            const SizedBox(height: 20),
            _SectionLabel(label: 'FIND ${_subjectType.toUpperCase()}'),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: TextField(
                controller: _searchCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  hintText: _subjectType == 'Personnel' ? 'Badge number' : (_subjectType == 'Vehicle' ? 'Plate number' : 'Visitor name or ID'),
                  prefixIcon: Icon(_subjectType == 'Vehicle' ? Icons.directions_car : Icons.search, color: AppColors.textMuted),
                ),
                onSubmitted: (_) => _search(),
              )),
              const SizedBox(width: 8),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _searching ? null : _search,
                  child: _searching ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.search),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _searching ? null : _scanQR,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
                  child: const Icon(Icons.qr_code_scanner, color: Colors.white),
                ),
              ),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 10),
              _ErrorBanner(message: _error!),
            ],
            if (_selectedPreview != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: actionColor.withOpacity(0.4), width: 1.5),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_selectedPreview!['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  Text(_selectedPreview!['detail'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  Text(_selectedPreview!['id'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                ]),
              ),
              const SizedBox(height: 20),
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
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Authorized Access', style: TextStyle(fontSize: 13)),
                value: _isAuthorized,
                activeColor: AppColors.success,
                onChanged: (v) => setState(() => _isAuthorized = v),
              ),
              const SizedBox(height: 8),
              TextField(controller: _purposeCtrl, decoration: const InputDecoration(labelText: 'Purpose (optional)', prefixIcon: Icon(Icons.description_outlined, color: AppColors.textMuted))),
              const SizedBox(height: 12),
              TextField(controller: _notesCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Notes (optional)', prefixIcon: Icon(Icons.notes_outlined, color: AppColors.textMuted))),
              const SizedBox(height: 24),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _logging ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: actionColor, foregroundColor: Colors.white),
                  child: _logging
                      ? const CircularProgressIndicator(strokeWidth: 2, color: Colors.white)
                      : Text('CONFIRM ${LogEntryScreen.modalForAction(widget.action).toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1)),
                ),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _TypeChip({required this.label, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withOpacity(0.15) : AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: selected ? 1.5 : 1),
          ),
          child: Center(child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: selected ? AppColors.primary : AppColors.textMuted))),
        ),
      );
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});
  @override
  Widget build(BuildContext context) => Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600));
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.danger.withOpacity(0.3))),
        child: Row(children: [
          const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 12))),
        ]),
      );
}
