// lib/screens/qr_scanner_screen.dart
// Uses conditional imports to avoid importing mobile_scanner on web.
// On web: _qr_scanner_stub.dart (no native deps)
// On mobile/desktop: _qr_scanner_impl.dart (uses mobile_scanner)
import 'package:flutter/material.dart';
import '_qr_scanner_stub.dart'
    if (dart.library.io) '_qr_scanner_impl.dart' as impl;

class QRScannerScreen extends StatelessWidget {
  const QRScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return impl.buildQRScanner(context);
  }
}
