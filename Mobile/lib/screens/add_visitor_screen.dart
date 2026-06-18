// lib/screens/add_visitor_screen.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AddVisitorScreen extends StatefulWidget {
  const AddVisitorScreen({super.key});

  @override
  State<AddVisitorScreen> createState() => _AddVisitorScreenState();
}

class _AddVisitorScreenState extends State<AddVisitorScreen> {
  final _form = GlobalKey<FormState>();
  final _api = ApiService();
  bool _saving = false;
  
  String _visitorType = 'Military'; // 'Military' or 'Civilian'
  bool _hasVehicle = false;
  
  final _fullNameCtrl = TextEditingController();
  final _idNumberCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _orgCtrl = TextEditingController();
  final _hostCtrl = TextEditingController();
  final _purposeCtrl = TextEditingController();
  final _plateCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();
  
  DateTime _visitDate = DateTime.now();

  Uint8List? _imageBytes;
  String? _base64Photo;

  @override
  void initState() {
    super.initState();
    _purposeCtrl.text = 'Facility Access / Official Visit';
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _idNumberCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _orgCtrl.dispose();
    _hostCtrl.dispose();
    _purposeCtrl.dispose();
    _plateCtrl.dispose();
    _modelCtrl.dispose();
    _colorCtrl.dispose();
    super.dispose();
  }

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

  Future<void> _selectDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _visitDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            onPrimary: AppColors.background,
            surface: AppColors.surface,
            onSurface: AppColors.textPrimary,
          ),
        ),
        child: child!,
      ),
    );

    if (date == null) return;

    if (mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_visitDate),
        builder: (context, child) => Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: AppColors.background,
              surface: AppColors.surface,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        ),
      );

      if (time != null) {
        setState(() {
          _visitDate = DateTime(date.year, date.month, date.day, time.hour, time.minute);
        });
      }
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    
    if (_base64Photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_visitorType == 'Military' 
            ? 'Military visitor registration requires uploading/taking a photo of their Military ID.'
            : 'Civilian visitor registration requires a face photo capture.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final body = {
        'fullName': _visitorType == 'Military' && _fullNameCtrl.text.trim().isEmpty 
            ? 'Military Visitor' 
            : _fullNameCtrl.text.trim(),
        'visitorType': _visitorType,
        'idNumber': _visitorType == 'Military' && _idNumberCtrl.text.trim().isEmpty 
            ? 'MIL-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}' 
            : _idNumberCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim().isNotEmpty ? _emailCtrl.text.trim() : null,
        'organization': _orgCtrl.text.trim().isNotEmpty ? _orgCtrl.text.trim() : null,
        'purposeOfVisit': _visitorType == 'Military' && _purposeCtrl.text.trim().isEmpty 
            ? 'Facility Access / Official Visit' 
            : _purposeCtrl.text.trim(),
        'hostName': _hostCtrl.text.trim().isNotEmpty ? _hostCtrl.text.trim() : null,
        'visitDate': _visitDate.toIso8601String(),
        'photo': _base64Photo,
        'hasVehicle': _hasVehicle,
        'vehiclePlate': _hasVehicle ? _plateCtrl.text.trim() : null,
        'vehicleModel': _hasVehicle && _modelCtrl.text.trim().isNotEmpty ? _modelCtrl.text.trim() : null,
        'vehicleColor': _hasVehicle && _colorCtrl.text.trim().isNotEmpty ? _colorCtrl.text.trim() : null,
        'status': 'Pending',
      };
      
      await _api.createVisitor(body);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Visitor registered successfully'), backgroundColor: AppColors.success),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _buildPhotoSection() {
    final label = _visitorType == 'Military' ? 'MILITARY ID PHOTO' : 'VISITOR FACE PHOTO';
    final desc = _visitorType == 'Military'
        ? 'Upload or capture a photo of the Military ID card.'
        : 'Capture a clear facial photo of the civilian visitor.';

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
                      color: _imageBytes == null
                          ? AppColors.danger.withOpacity(0.8)
                          : AppColors.primary.withOpacity(0.8),
                      width: 2.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
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
                                  color: AppColors.danger,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'PHOTO REQ.',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.danger,
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
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), textAlign: TextAlign.center),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('REGISTER VISITOR'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : const Text('SAVE', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Category Selector
            _Section(
              label: 'VISITOR CATEGORY',
              children: [
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _visitorType = 'Military';
                            _purposeCtrl.text = 'Facility Access / Official Visit';
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _visitorType == 'Military' ? AppColors.primary.withOpacity(0.15) : AppColors.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _visitorType == 'Military' ? AppColors.primary : AppColors.border,
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.shield, color: _visitorType == 'Military' ? AppColors.primary : AppColors.textSecondary),
                              const SizedBox(height: 6),
                              const Text('MILITARY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(height: 2),
                              const Text('Official facility visit', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _visitorType = 'Civilian';
                            _purposeCtrl.text = 'Personal / Official Visit to Officer';
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: _visitorType == 'Civilian' ? AppColors.primary.withOpacity(0.15) : AppColors.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _visitorType == 'Civilian' ? AppColors.primary : AppColors.border,
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.person, color: _visitorType == 'Civilian' ? AppColors.primary : AppColors.textSecondary),
                              const SizedBox(height: 6),
                              const Text('CIVILIAN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(height: 2),
                              const Text('Visiting specific officer', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            _buildPhotoSection(),
            
            if (_visitorType != 'Military') ...[
              _Section(
                label: 'VISITOR DETAILS',
                children: [
                  _Field(ctrl: _fullNameCtrl, label: 'Full Name', required: true),
                  _Field(
                    ctrl: _idNumberCtrl, 
                    label: 'National ID Number', 
                    required: true,
                  ),
                  _Field(ctrl: _phoneCtrl, label: 'Phone Number', required: true, keyboardType: TextInputType.phone),
                  _Field(ctrl: _emailCtrl, label: 'Email', keyboardType: TextInputType.emailAddress),
                  _Field(
                    ctrl: _orgCtrl, 
                    label: 'Organization / Rank',
                    hint: 'e.g. Ministry of Health',
                  ),
                  _Field(
                    ctrl: _hostCtrl, 
                    label: 'Military Officer to Visit',
                    required: true,
                    hint: 'Enter officer\'s full name',
                  ),
                  _Field(ctrl: _purposeCtrl, label: 'Purpose of Visit', required: true),
                  
                  // Visit Date Selector
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      onTap: _selectDateTime,
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: 'Visit Date & Time *'),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              DateFormat('yyyy-MM-dd HH:mm').format(_visitDate),
                              style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
                            ),
                            const Icon(Icons.calendar_today, size: 16, color: AppColors.primary),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Vehicle Section
              _Section(
                label: 'VEHICLE ACCESS',
                children: [
                  Row(
                    children: [
                      const Icon(Icons.directions_car, color: AppColors.textMuted),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Has a vehicle?', style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
                            Text('Collect vehicle details for gate access', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                          ],
                        ),
                      ),
                      Switch(
                        value: _hasVehicle,
                        activeThumbColor: AppColors.primary,
                        activeTrackColor: AppColors.primary.withOpacity(0.3),
                        onChanged: (v) => setState(() => _hasVehicle = v),
                      ),
                    ],
                  ),
                  if (_hasVehicle) ...[
                    const SizedBox(height: 16),
                    _Field(ctrl: _plateCtrl, label: 'Vehicle Plate Number', required: true, hint: 'e.g. MIL-4472 or LH-123-AB'),
                    _Field(ctrl: _modelCtrl, label: 'Vehicle Model', hint: 'e.g. Toyota Hilux'),
                    _Field(ctrl: _colorCtrl, label: 'Vehicle Color', hint: 'e.g. Olive Green or White'),
                  ]
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String label;
  final List<Widget> children;
  const _Section({required this.label, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final bool required;
  final String? hint;
  final TextInputType? keyboardType;

  const _Field({
    required this.ctrl,
    required this.label,
    this.required = false,
    this.hint,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: ctrl,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: '$label${required ? ' *' : ''}',
          hintText: hint,
          alignLabelWithHint: true,
        ),
        validator: required ? (v) => v?.trim().isEmpty == true ? 'Required' : null : null,
      ),
    );
  }
}
