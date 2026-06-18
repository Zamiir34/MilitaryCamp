// lib/screens/report_incident_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ReportIncidentScreen extends StatefulWidget {
  const ReportIncidentScreen({super.key});
  @override State<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  final _api = ApiService();
  final _descCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  String _type = 'security_breach';
  String _severity = 'high';
  bool _loading = false;

  Future<void> _submit() async {
    if (_descCtrl.text.isEmpty || _locCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields')));
      return;
    }
    setState(() => _loading = true);
    try {
      await _api.reportIncident({
        'type': _type,
        'severity': _severity,
        'location': _locCtrl.text,
        'description': _descCtrl.text,
      });
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ALARM ACTIVATED! Incident reported.'), backgroundColor: AppColors.danger)
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('REPORT INCIDENT')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _WarningBanner(),
            const SizedBox(height: 24),
            
            _Label('INCIDENT TYPE'),
            const SizedBox(height: 8),
            _TypeSelector(value: _type, onChanged: (v) => setState(() => _type = v)),
            
            const SizedBox(height: 20),
            _Label('SEVERITY LEVEL'),
            const SizedBox(height: 8),
            _SeveritySelector(value: _severity, onChanged: (v) => setState(() => _severity = v)),
            
            const SizedBox(height: 20),
            _Label('LOCATION / GATE'),
            const SizedBox(height: 8),
            TextField(controller: _locCtrl, decoration: const InputDecoration(hintText: 'e.g. Sector 7, Main Gate...')),
            
            const SizedBox(height: 20),
            _Label('DESCRIPTION'),
            const SizedBox(height: 8),
            TextField(controller: _descCtrl, maxLines: 4, decoration: const InputDecoration(hintText: 'Describe the situation...')),
            
            const SizedBox(height: 32),
            SizedBox(
              height: 54,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.danger,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.warning_amber_rounded),
                        SizedBox(width: 12),
                        Text('ACTIVATE ALARM & REPORT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WarningBanner extends StatelessWidget {
  const _WarningBanner();
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.danger.withOpacity(0.1),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.danger.withOpacity(0.3)),
    ),
    child: const Row(children: [
      Icon(Icons.gpp_maybe, color: AppColors.danger),
      SizedBox(width: 16),
      Expanded(child: Text('REPORTING AN INCIDENT WILL TRIGGER A BASE-WIDE SECURITY ALARM.', 
        style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 12))),
    ]),
  );
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override Widget build(BuildContext context) => Text(text, 
    style: const TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 1.5, fontWeight: FontWeight.bold));
}

class _TypeSelector extends StatelessWidget {
  final String value; final ValueChanged<String> onChanged;
  const _TypeSelector({required this.value, required this.onChanged});
  @override Widget build(BuildContext context) => Wrap(spacing: 8, children: [
    'security_breach', 'fire', 'medical', 'equipment_failure', 'other'
  ].map((t) => ChoiceChip(
    label: Text(t.toUpperCase().replaceFirst('_', ' ')),
    selected: value == t,
    onSelected: (_) => onChanged(t),
    selectedColor: AppColors.danger.withOpacity(0.2),
    backgroundColor: AppColors.surface,
    labelStyle: TextStyle(color: value == t ? AppColors.danger : AppColors.textSecondary, fontSize: 11),
    side: BorderSide(color: value == t ? AppColors.danger : AppColors.border),
  )).toList());
}

class _SeveritySelector extends StatelessWidget {
  final String value; final ValueChanged<String> onChanged;
  const _SeveritySelector({required this.value, required this.onChanged});
  @override Widget build(BuildContext context) => Row(children: [
    _SevBtn('high', value == 'high', AppColors.warning, () => onChanged('high')),
    const SizedBox(width: 12),
    _SevBtn('critical', value == 'critical', AppColors.danger, () => onChanged('critical')),
  ]);
}

class _SevBtn extends StatelessWidget {
  final String label; final bool sel; final Color color; final VoidCallback onTap;
  const _SevBtn(this.label, this.sel, this.color, this.onTap);
  @override Widget build(BuildContext context) => Expanded(child: GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: sel ? color.withOpacity(0.1) : AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: sel ? color : AppColors.border, width: sel ? 1.5 : 1),
      ),
      child: Center(child: Text(label.toUpperCase(), style: TextStyle(color: sel ? color : AppColors.textMuted, fontWeight: FontWeight.bold))),
    ),
  ));
}
