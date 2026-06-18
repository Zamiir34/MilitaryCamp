// lib/screens/qr_scanner_screen.dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../theme/app_theme.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();
  bool _screenOpened = false;
  bool _permissionGranted = false;

  @override
  void initState() {
    super.initState();
    _checkPermission();
  }

  Future<void> _checkPermission() async {
    final status = await Permission.camera.request();
    setState(() {
      _permissionGranted = status.isGranted;
    });
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('SCAN IDENTIFICATION'),
        actions: [
          IconButton(
            color: Colors.white,
            icon: ValueListenableBuilder(
              valueListenable: cameraController.torchState,
              builder: (context, state, child) {
                switch (state) {
                  case TorchState.off:
                    return const Icon(Icons.flash_off, color: Colors.grey);
                  case TorchState.on:
                    return const Icon(Icons.flash_on, color: Colors.yellow);
                }
              },
            ),
            iconSize: 32.0,
            onPressed: () => cameraController.toggleTorch(),
          ),
          IconButton(
            color: Colors.white,
            icon: ValueListenableBuilder(
              valueListenable: cameraController.cameraFacingState,
              builder: (context, state, child) {
                switch (state) {
                  case CameraFacing.front:
                    return const Icon(Icons.camera_front);
                  case CameraFacing.back:
                    return const Icon(Icons.camera_rear);
                }
              },
            ),
            iconSize: 32.0,
            onPressed: () => cameraController.switchCamera(),
          ),
        ],
      ),
      body: !_permissionGranted
        ? const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.camera_alt_outlined, size: 64, color: AppColors.textMuted),
                SizedBox(height: 16),
                Text('Camera permission is required to scan QR codes',
                    style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          )
        : Stack(
            children: [
              MobileScanner(
                controller: cameraController,
                onDetect: (capture) {
                  final List<Barcode> barcodes = capture.barcodes;
                  if (barcodes.isNotEmpty && !_screenOpened) {
                    _screenOpened = true;
                    final String code = barcodes.first.rawValue ?? "---";
                    debugPrint('Barcode found! $code');
                    Navigator.pop(context, code);
                  }
                },
              ),
              // Scanner Overlay
              Center(
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.primary, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Stack(
                    children: [
                      Positioned(
                        top: 0,
                        left: 0,
                        child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.primary, width: 4), left: BorderSide(color: AppColors.primary, width: 4)))),
                      ),
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.primary, width: 4), right: BorderSide(color: AppColors.primary, width: 4)))),
                      ),
                      Positioned(
                        bottom: 0,
                        left: 0,
                        child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.primary, width: 4), left: BorderSide(color: AppColors.primary, width: 4)))),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.primary, width: 4), right: BorderSide(color: AppColors.primary, width: 4)))),
                      ),
                    ],
                  ),
                ),
              ),
              const Positioned(
                bottom: 100,
                left: 0,
                right: 0,
                child: Center(
                  child: Text(
                    'Align QR code within the frame',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),
            ],
          ),
    );
  }
}
