// lib/screens/add_personnel_screen.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'add_vehicle_screen.dart';

class AddPersonnelScreen extends StatefulWidget {
  final String? initialCategory;
  const AddPersonnelScreen({super.key, this.initialCategory});
  @override State<AddPersonnelScreen> createState() => _AddPersonnelScreenState();
}

// Official military units
const _kUnits = [
  'Taliska 18',
  'Taliska 20',
  'Taliska 64',
  'Guutada Gor Gor',
];

class _AddPersonnelScreenState extends State<AddPersonnelScreen> {
  final _form = GlobalKey<FormState>();
  final _api = ApiService();
  bool _saving = false;
  String _category = 'military', _status = 'active';
  String _selectedZone = 'Zone A';
  String _selectedRank = AppConstants.ranks.first;
  String _selectedUnit = _kUnits.first; // unit dropdown selection
  String? _transferredFrom; // tracks where personnel transferred from
  int _accessLevel = 1;
  final _fields = <String, TextEditingController>{
    'firstName': TextEditingController(), 'lastName': TextEditingController(),
    'militaryId': TextEditingController(),
    'badgeNumber': TextEditingController(), 'nationalId': TextEditingController(),
    'phone': TextEditingController(), 'email': TextEditingController(),
    'bloodType': TextEditingController(),
  };

  // ignore: unused_field
  XFile? _imageFile;
  Uint8List? _imageBytes;
  String? _base64Photo;
  bool _drivesCar = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null) {
      _category = widget.initialCategory!;
      if (widget.initialCategory == 'visitor') {
        _selectedUnit = _kUnits.last; // default visitors to Guutada Gor Gor
        final uniqueId = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
        _fields['badgeNumber']!.text = 'VIS-$uniqueId';
      }
    }
  }

  @override void dispose() { for (final c in _fields.values) { c.dispose(); } super.dispose(); }

  Future<void> _takePhoto() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 80,
      );
      if (image != null) {
        final bytes = await image.readAsBytes();
        final base64Str = base64Encode(bytes);
        setState(() {
          _imageFile = image;
          _imageBytes = bytes;
          _base64Photo = 'data:${image.mimeType ?? 'image/jpeg'};base64,$base64Str';
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error taking photo: $e'), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(
        source: source,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 80,
      );
      if (image != null) {
        final bytes = await image.readAsBytes();
        final base64Str = base64Encode(bytes);
        setState(() {
          _imageFile = image;
          _imageBytes = bytes;
          _base64Photo = 'data:${image.mimeType ?? 'image/jpeg'};base64,$base64Str';
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error selecting image: $e'), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    
    // Validate photo for visitors
    if (_category == 'visitor' && _base64Photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Visitor registration requires a photo capture.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final newPersonnel = await _api.createPersonnel({
        'fullName': '${_fields['firstName']!.text} ${_fields['lastName']!.text}',
        'militaryId': _fields['militaryId']!.text,
        'rank': _selectedRank, 'unit': _selectedUnit,
        if (_transferredFrom != null && _transferredFrom!.isNotEmpty) 'transferredFrom': _transferredFrom,
        'badgeNumber': _fields['badgeNumber']!.text, 'idNumber': _fields['nationalId']!.text,
        'phone': _fields['phone']!.text, 'email': _fields['email']!.text,
        'bloodType': _fields['bloodType']!.text,
        'type': 'Military',
        'status': _status == 'active' ? 'Active' : _status == 'inactive' ? 'Inactive' : 'Suspended',
        'authorizedZones': [_selectedZone],
        if (_base64Photo != null) 'photo': _base64Photo,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Personnel registered successfully'), backgroundColor: AppColors.success));
        if (_drivesCar) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => AddVehicleScreen(
                initialOwnerId: newPersonnel.id,
                initialOwnerName: '${_fields['firstName']!.text} ${_fields['lastName']!.text}',
                initialOwnerPhone: _fields['phone']!.text,
                initialCategory: _category,
              ),
            ),
          );
        } else {
          if (mounted) {
            Navigator.pop(context);
          }
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _buildPhotoSection() {
    final isVisitor = _category == 'visitor';
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 24),
        child: Column(
          children: [
            Stack(
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.surface,
                    border: Border.all(
                      color: _imageBytes == null && isVisitor
                          ? AppColors.danger.withValues(alpha: 0.8)
                          : AppColors.primary.withValues(alpha: 0.8),
                      width: 2.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: ClipOval(
                    child: _imageBytes != null
                        ? Image.memory(
                            _imageBytes!,
                            fit: BoxFit.cover,
                            width: 120,
                            height: 120,
                          )
                        : Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.camera_enhance_outlined,
                                  size: 36,
                                  color: isVisitor ? AppColors.danger : AppColors.textMuted,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  isVisitor ? 'PHOTO REQ.' : 'NO PHOTO',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isVisitor ? AppColors.danger : AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                  ),
                ),
                if (_imageBytes != null)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: AppColors.danger,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.close, color: Colors.white, size: 14),
                        padding: EdgeInsets.zero,
                        onPressed: () {
                          setState(() {
                            _imageFile = null;
                            _imageBytes = null;
                            _base64Photo = null;
                          });
                        },
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: _takePhoto,
                  icon: const Icon(Icons.photo_camera, size: 16),
                  label: const Text('TAKE PHOTO'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library, size: 16),
                  label: const Text('GALLERY'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textSecondary,
                    side: const BorderSide(color: AppColors.border),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('REGISTER PERSONNEL'), actions: [
        TextButton(onPressed: _saving ? null : _save, child: _saving
          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
          : const Text('SAVE', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold))),
      ]),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          _buildPhotoSection(),
          _Section(label: 'PERSONAL INFORMATION', children: [
            _Row([_Field(ctrl: _fields['firstName']!, label: 'First Name', required: true),
                  _Field(ctrl: _fields['lastName']!,  label: 'Last Name',  required: true)]),
            _Field(ctrl: _fields['nationalId']!, label: 'National ID', required: true),
            _Field(ctrl: _fields['phone']!, label: 'Phone Number'),
            _Field(ctrl: _fields['email']!, label: 'Email', keyboardType: TextInputType.emailAddress),
            _Field(ctrl: _fields['bloodType']!, label: 'Blood Type (e.g. A+)'),
          ]),
          const SizedBox(height: 16),
          _Section(label: 'MILITARY INFORMATION', children: [
            _Field(ctrl: _fields['militaryId']!, label: 'Military ID Card', required: true,
              hint: 'e.g. MIL-12345'),
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DropdownButtonFormField<String>(
                value: _selectedRank,
                dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Rank *'),
                items: AppConstants.ranks
                    .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedRank = v!),
              ),
            ),
            // Unit dropdown — official units only
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DropdownButtonFormField<String>(
                value: _selectedUnit,
                dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Unit *'),
                items: _kUnits
                    .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedUnit = v!),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DropdownButtonFormField<String?>(
                value: _transferredFrom,
                dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Transferred From (Optional)'),
                items: const [
                  DropdownMenuItem(value: null, child: Text('-- None --')),
                  DropdownMenuItem(value: '1, Wasaarada gaashan dhiga', child: Text('1, Wasaarada gaashan dhiga')),
                  DropdownMenuItem(value: '2, Xallane', child: Text('2, Xallane')),
                  DropdownMenuItem(value: '3, Danab', child: Text('3, Danab')),
                ],
                onChanged: (v) => setState(() => _transferredFrom = v),
              ),
            ),
            _Field(ctrl: _fields['badgeNumber']!, label: 'Badge Number', required: true,
              hint: 'e.g. MIL-001, CIV-001'),
            const SizedBox(height: 8),
            _Dropdown(label: 'Category', value: _category,
              items: const ['military'],
              onChanged: (v) => setState(() => _category = v!)),
            const SizedBox(height: 12),
            _Dropdown(label: 'Status', value: _status,
              items: const ['active','inactive','suspended','on_leave'],
              onChanged: (v) => setState(() => _status = v!)),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DropdownButtonFormField<String>(
                value: _selectedZone,
                dropdownColor: AppColors.surfaceVariant,
                decoration: const InputDecoration(labelText: 'Authorized Zone *'),
                items: ['Zone A', 'Zone B', 'Zone C', 'HQ', 'All Zones']
                    .map((z) => DropdownMenuItem(value: z, child: Text(z)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedZone = v!),
              ),
            ),
            Text('Access Level: $_accessLevel', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            Slider(
              value: _accessLevel.toDouble(), min: 1, max: 5, divisions: 4,
              activeColor: AppColors.primary, inactiveColor: AppColors.border,
              label: 'Level $_accessLevel',
              onChanged: (v) => setState(() => _accessLevel = v.round()),
            ),
          ]),
          const SizedBox(height: 16),
          _Section(label: 'VEHICLE ACCESS', children: [
            Row(
              children: [
                const Icon(Icons.directions_car, color: AppColors.textMuted),
                const SizedBox(width: 12),
                Expanded(
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Drives a Vehicle', style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
                      Text('Prompt to register vehicle details next', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                    ],
                  ),
                ),
                Switch(
                  value: _drivesCar,
                  activeThumbColor: AppColors.primary,
                  onChanged: (v) => setState(() => _drivesCar = v),
                ),
              ],
            ),
          ]),
        ]),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String label; final List<Widget> children;
  const _Section({required this.label, required this.children});
  @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
    const SizedBox(height: 10),
    Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
    ),
  ]);
}

class _Row extends StatelessWidget {
  final List<Widget> children;
  const _Row(this.children);
  @override Widget build(BuildContext context) => Row(
    children: children.expand((w) => [Expanded(child: w), const SizedBox(width: 12)]).toList()..removeLast(),
  );
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl; final String label;
  final bool required; final String? hint; final TextInputType? keyboardType;
  const _Field({required this.ctrl, required this.label, this.required = false, this.hint, this.keyboardType});
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl, keyboardType: keyboardType,
      decoration: InputDecoration(labelText: '$label${required ? ' *' : ''}', hintText: hint),
      validator: required ? (v) => v?.isEmpty == true ? 'Required' : null : null,
    ),
  );
}

class _Dropdown extends StatelessWidget {
  final String label, value; final List<String> items; final ValueChanged<String?> onChanged;
  const _Dropdown({required this.label, required this.value, required this.items, required this.onChanged});
  @override Widget build(BuildContext context) => DropdownButtonFormField<String>(
    initialValue: value, dropdownColor: AppColors.surfaceVariant,
    decoration: InputDecoration(labelText: label),
    items: items.map((i) => DropdownMenuItem(value: i, child: Text(i.toUpperCase().replaceAll('_',' ')))).toList(),
    onChanged: onChanged,
  );
}
