import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class VisitorPortalScreen extends StatefulWidget {
  const VisitorPortalScreen({super.key});
  @override State<VisitorPortalScreen> createState() => _VisitorPortalScreenState();
}

class _VisitorPortalScreenState extends State<VisitorPortalScreen> {
  final _api = ApiService();
  int _step = 1;
  bool _loading = false;
  String _email = '';
  String _maskedEmail = '';
  String _code = '';
  Map<String, dynamic>? _visitorData;

  @override
  void initState() {
    super.initState();
    _checkExistingToken();
  }

  Future<void> _checkExistingToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('visitor_token');
    if (token != null) {
      setState(() => _loading = true);
      try {
        final data = await _api.getVisitorMe(token);
        setState(() {
          _visitorData = data;
          _step = 3;
          _loading = false;
        });
      } catch (_) {
        prefs.remove('visitor_token');
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _requestOtp() async {
    if (_email.isEmpty || !_email.contains('@')) {
      _showError('Enter a valid email address');
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await _api.requestVisitorOtp(_email);
      setState(() {
        _maskedEmail = res['emailMasked'] ?? _email;
        _step = 2;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      _showError(e.toString());
    }
  }

  Future<void> _verifyOtp() async {
    if (_code.length != 6) return;
    setState(() => _loading = true);
    try {
      final res = await _api.verifyVisitorOtp(_email, _code);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('visitor_token', res['token']);
      setState(() {
        _visitorData = res['visitor'];
        _step = 3;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      _showError(e.toString());
    }
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('visitor_token');
    setState(() {
      _step = 1;
      _email = '';
      _code = '';
      _visitorData = null;
    });
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.danger));
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.success));
  }

  Future<void> _downloadQrCode() async {
    try {
      final visitorId = _visitorData?['visitorId']?.toString();
      if (visitorId == null || visitorId.isEmpty) {
        _showError('QR Code not available');
        return;
      }

      PermissionStatus status;
      if (Theme.of(context).platform == TargetPlatform.android) {
        status = await Permission.storage.request();
      } else {
        status = await Permission.photos.request();
      }

      if (!status.isGranted) {
        _showError('Storage permission is required to save QR code');
        return;
      }

      Uint8List? bytes;
      final stored = _visitorData?['qrCode']?.toString();
      if (stored != null && stored.startsWith('data:image')) {
        bytes = base64Decode(stored.split(',').last);
      } else {
        final painter = QrPainter(
          data: AppConstants.verifyUrl(visitorId),
          version: QrVersions.auto,
          gapless: true,
          color: const Color(0xFF000000),
          emptyColor: const Color(0xFFFFFFFF),
        );
        final pic = await painter.toImageData(512);
        bytes = pic?.buffer.asUint8List();
      }

      if (bytes == null) {
        _showError('Failed to create QR image');
        return;
      }

      final result = await ImageGallerySaver.saveImage(
        bytes,
        quality: 100,
        name: 'QRCode_$visitorId',
      );

      if (result['isSuccess'] == true || result['filePath'] != null) {
        _showSuccess('QR image saved to gallery');
      } else {
        _showError('Failed to save QR image');
      }
    } catch (e) {
      _showError('Error saving QR image: $e');
    }
  }

  Widget _buildStep1() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.shield_outlined, size: 64, color: AppColors.primary),
        const SizedBox(height: 16),
        const Text('VISITOR PORTAL', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
        const SizedBox(height: 8),
        const Text('Access your approved visit details and QR pass.', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
        const SizedBox(height: 32),
        TextField(
          decoration: const InputDecoration(labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined)),
          keyboardType: TextInputType.emailAddress,
          onChanged: (v) => _email = v.trim(),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _loading ? null : _requestOtp,
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('REQUEST ACCESS CODE'),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _step = 1)),
        const Icon(Icons.vpn_key_outlined, size: 64, color: AppColors.secondary),
        const SizedBox(height: 16),
        const Text('ENTER ACCESS CODE', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text('We sent a 6-digit code to $_maskedEmail', style: const TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
        const SizedBox(height: 32),
        TextField(
          decoration: const InputDecoration(labelText: '6-Digit Code', counterText: ''),
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 24, letterSpacing: 12, fontWeight: FontWeight.bold),
          onChanged: (v) {
            _code = v;
            if (v.length == 6) _verifyOtp();
          },
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _loading ? null : _verifyOtp,
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('VERIFY & ACCESS'),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3() {
    if (_visitorData == null) return const SizedBox();
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(children: [Icon(Icons.check_circle, color: AppColors.success), SizedBox(width: 8), Text('APPROVED', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold))]),
              TextButton.icon(onPressed: _logout, icon: const Icon(Icons.logout, color: AppColors.danger, size: 16), label: const Text('Logout', style: TextStyle(color: AppColors.danger))),
            ],
          ),
          const SizedBox(height: 24),
          Text(_visitorData!['fullName'] ?? 'Unknown', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          Text('${(_visitorData!['visitorType'] ?? '').toString().toUpperCase()} VISITOR - ID: ${_visitorData!['visitorId']}', style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 32),
          if (_visitorData!['visitorId'] != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
              child: QrImageView(
                data: AppConstants.verifyUrl(_visitorData!['visitorId'].toString()),
                version: QrVersions.auto,
                size: 200,
                backgroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _downloadQrCode,
                icon: const Icon(Icons.download_rounded),
                label: const Text('DOWNLOAD QR IMAGE'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ] else ...[
            const Icon(Icons.qr_code, size: 64, color: AppColors.textMuted),
            const Text('QR Code not available.'),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Visitor Access')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: _step == 1 ? _buildStep1() : (_step == 2 ? _buildStep2() : _buildStep3()),
        ),
      ),
    );
  }
}

