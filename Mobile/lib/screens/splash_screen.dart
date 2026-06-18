// lib/screens/splash_screen.dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fadeAnim, _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(duration: const Duration(milliseconds: 1500), vsync: this);
    _fadeAnim  = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _ctrl, curve: const Interval(0, 0.6, curve: Curves.easeIn)));
    _scaleAnim = Tween<double>(begin: 0.7, end: 1).animate(CurvedAnimation(parent: _ctrl, curve: const Interval(0, 0.6, curve: Curves.elasticOut)));
    _ctrl.forward();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: AnimatedBuilder(
          animation: _ctrl,
          builder: (_, __) => Opacity(
            opacity: _fadeAnim.value,
            child: Transform.scale(
              scale: _scaleAnim.value,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 100, height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary, width: 2),
                      color: AppColors.surface,
                    ),
                    child: const Icon(Icons.shield, size: 50, color: AppColors.primary),
                  ),
                  const SizedBox(height: 24),
                  Text(AppConstants.appName,
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: 4)),
                  const SizedBox(height: 8),
                  const Text('SECURITY MONITORING SYSTEM',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted, letterSpacing: 3)),
                  const SizedBox(height: 48),
                  const SizedBox(
                    width: 40, height: 2,
                    child: LinearProgressIndicator(
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
