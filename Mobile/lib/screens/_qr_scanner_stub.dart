// lib/screens/_qr_scanner_stub.dart
// Web stub — no mobile_scanner dependency
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

Widget buildQRScanner(BuildContext context) {
  return Scaffold(
    backgroundColor: context.bgColor,
    appBar: AppBar(title: const Text('SCAN IDENTIFICATION')),
    body: Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.qr_code_scanner,
              size: 80, color: AppColors.primary.withOpacity(0.5)),
          const SizedBox(height: 24),
          Text(
            'QR Scanner not available on web',
            style: TextStyle(
              color: context.textSecondary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Please use the mobile app to scan QR codes.',
            style: TextStyle(color: context.textMuted, fontSize: 14),
          ),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Go Back'),
          ),
        ],
      ),
    ),
  );
}
