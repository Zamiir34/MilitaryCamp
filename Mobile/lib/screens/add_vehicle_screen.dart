// lib/screens/add_vehicle_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

// Valid vehicle categories — map any personnel-only category (e.g. contractor) to closest match
const _vehicleCategories = ['military', 'civilian', 'government', 'visitor'];

String _mapToVehicleCategory(String? cat) {
  if (cat == null) return 'military';
  if (_vehicleCategories.contains(cat)) return cat;
  // contractor → civilian
  return 'civilian';
}

class AddVehicleScreen extends StatefulWidget {
  final String? initialOwnerId;
  final String? initialOwnerName;
  final String? initialOwnerPhone;
  final String? initialCategory;
  const AddVehicleScreen({super.key, this.initialOwnerId, this.initialOwnerName, this.initialOwnerPhone, this.initialCategory});
  @override State<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends State<AddVehicleScreen> {
  final _form = GlobalKey<FormState>();
  final _api = ApiService();
  bool _saving = false;
  String _type = 'car', _status = 'active';
  late String _category;
  final _f = <String, TextEditingController>{
    'plateNumber': TextEditingController(), 'brand': TextEditingController(),
    'model': TextEditingController(), 'color': TextEditingController(),
    'year': TextEditingController(),
    'ownerName': TextEditingController(), 'ownerPhone': TextEditingController(),
    'notes': TextEditingController(),
  };

  @override void initState() {
    super.initState();
    _category = _mapToVehicleCategory(widget.initialCategory);
    if (widget.initialOwnerName != null) _f['ownerName']!.text = widget.initialOwnerName!;
    if (widget.initialOwnerPhone != null) _f['ownerPhone']!.text = widget.initialOwnerPhone!;
  }

  @override void dispose() { _f.values.forEach((c) => c.dispose()); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final yearStr = _f['year']!.text.trim();
      await _api.createVehicle({
        'plateNumber': _f['plateNumber']!.text.toUpperCase(),
        'brand': _f['brand']!.text.trim(),
        'model': _f['model']!.text.trim(),
        'color': _f['color']!.text.trim(),
        'ownerName': _f['ownerName']!.text.trim(),
        'ownerPhone': _f['ownerPhone']!.text.trim(),
        'notes': _f['notes']!.text.trim(),
        'type': _type, 'category': _category, 'status': _status,
        if (yearStr.isNotEmpty) 'year': int.tryParse(yearStr),
        if (widget.initialOwnerId != null) 'owner': widget.initialOwnerId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehicle registered successfully'), backgroundColor: AppColors.success));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override Widget build(BuildContext context) {
    final hasOwner = widget.initialOwnerName != null;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('REGISTER VEHICLE'), actions: [
        TextButton(
          onPressed: _saving ? null : _save,
          child: _saving
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
            : const Text('SAVE', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
        ),
      ]),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(16), children: [

          // Owner banner — shown when coming from personnel registration
          if (hasOwner) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(children: [
                const Icon(Icons.person_pin_circle, color: AppColors.primary, size: 22),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('LINKED OWNER', style: TextStyle(fontSize: 10, color: AppColors.primary, letterSpacing: 1.5, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(widget.initialOwnerName!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  if (widget.initialOwnerPhone?.isNotEmpty == true)
                    Text(widget.initialOwnerPhone!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ])),
              ]),
            ),
          ],

          // VEHICLE DETAILS section
          _sectionLabel('VEHICLE DETAILS'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Column(children: [
              _field(_f['plateNumber']!, 'Plate Number *', required: true, hint: 'e.g. ABC-1234'),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _type, dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Vehicle Type'),
                items: ['car','truck','motorcycle','military_vehicle','ambulance','bus','other']
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.toUpperCase().replaceAll('_',' ')))).toList(),
                onChanged: (v) => setState(() => _type = v!),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: _field(_f['brand']!, 'Brand', hint: 'e.g. Toyota')),
                const SizedBox(width: 12),
                Expanded(child: _field(_f['model']!, 'Model', hint: 'e.g. Hilux')),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: _field(_f['color']!, 'Color', hint: 'e.g. White')),
                const SizedBox(width: 12),
                Expanded(child: _field(_f['year']!, 'Year', hint: 'e.g. 2023', keyboard: TextInputType.number)),
              ]),
            ]),
          ),

          const SizedBox(height: 20),

          // OWNERSHIP section
          _sectionLabel('OWNERSHIP'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Column(children: [
              _field(_f['ownerName']!, 'Owner Name'),
              const SizedBox(height: 12),
              _field(_f['ownerPhone']!, 'Owner Phone', keyboard: TextInputType.phone),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _category, dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Category'),
                items: _vehicleCategories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c.toUpperCase()))).toList(),
                onChanged: (v) => setState(() => _category = v!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _status, dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Status'),
                items: ['active','inactive','blacklisted']
                  .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                onChanged: (v) => setState(() => _status = v!),
              ),
            ]),
          ),

          const SizedBox(height: 20),

          // NOTES section
          _sectionLabel('ADDITIONAL NOTES'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: _field(_f['notes']!, 'Notes (optional)', maxLines: 3),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }

  Widget _sectionLabel(String label) => Text(
    label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600));

  Widget _field(TextEditingController ctrl, String label, {bool required = false, String? hint, TextInputType? keyboard, int maxLines = 1}) =>
    TextFormField(
      controller: ctrl, keyboardType: keyboard, maxLines: maxLines,
      decoration: InputDecoration(labelText: label, hintText: hint),
      validator: required ? (v) => v?.trim().isEmpty == true ? 'Required' : null : null,
    );
}

