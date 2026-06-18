// lib/theme/app_theme.dart
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform;

class AppColors {
  // Military Dark Theme
  static const Color background     = Color(0xFF0A0E1A);
  static const Color surface        = Color(0xFF111827);
  static const Color surfaceVariant = Color(0xFF1C2433);
  static const Color card           = Color(0xFF1A2234);

  // Accent Colors
  static const Color primary        = Color(0xFF00D4AA);   // Military teal
  static const Color primaryDark    = Color(0xFF00A884);
  static const Color secondary      = Color(0xFF3B82F6);   // Intel blue
  static const Color accent         = Color(0xFFFF6B35);   // Alert orange

  // Status Colors
  static const Color success        = Color(0xFF22C55E);
  static const Color warning        = Color(0xFFF59E0B);
  static const Color danger         = Color(0xFFEF4444);
  static const Color critical       = Color(0xFFDC2626);
  static const Color info           = Color(0xFF3B82F6);

  // Text Colors
  static const Color textPrimary    = Color(0xFFE2E8F0);
  static const Color textSecondary  = Color(0xFF94A3B8);
  static const Color textMuted      = Color(0xFF64748B);

  // Border
  static const Color border         = Color(0xFF1E293B);
  static const Color borderLight    = Color(0xFF2D3F55);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      canvasColor: AppColors.surface,
      primaryColor: AppColors.primary,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        error: AppColors.danger,
      ),
      fontFamily: 'Rajdhani',
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Rajdhani',
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: 1.2,
        ),
        iconTheme: IconThemeData(color: AppColors.textPrimary),
      ),
      cardTheme: const CardThemeData(
        color: AppColors.card,
        elevation: 0,
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        hintStyle: const TextStyle(color: AppColors.textMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.background,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(
            fontFamily: 'Rajdhani',
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          ),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontFamily: 'Rajdhani', fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontFamily: 'Rajdhani'),
      ),
      dividerColor: AppColors.border,
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: AppColors.textPrimary, fontFamily: 'Rajdhani', fontWeight: FontWeight.w700),
        displayMedium: TextStyle(color: AppColors.textPrimary, fontFamily: 'Rajdhani', fontWeight: FontWeight.w700),
        headlineLarge: TextStyle(color: AppColors.textPrimary, fontFamily: 'Rajdhani', fontWeight: FontWeight.w700),
        headlineMedium: TextStyle(color: AppColors.textPrimary, fontFamily: 'Rajdhani', fontWeight: FontWeight.w600),
        titleLarge: TextStyle(color: AppColors.textPrimary, fontFamily: 'Rajdhani', fontWeight: FontWeight.w600),
        titleMedium: TextStyle(color: AppColors.textPrimary, fontFamily: 'Rajdhani', fontWeight: FontWeight.w500),
        bodyLarge: TextStyle(color: AppColors.textSecondary, fontFamily: 'Rajdhani'),
        bodyMedium: TextStyle(color: AppColors.textSecondary, fontFamily: 'Rajdhani'),
        bodySmall: TextStyle(color: AppColors.textMuted, fontFamily: 'Rajdhani'),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      primaryColor: AppColors.primary,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: Colors.white,
        error: AppColors.danger,
      ),
      fontFamily: 'Rajdhani',
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Rajdhani',
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: Color(0xFF1E293B),
          letterSpacing: 1.2,
        ),
        iconTheme: IconThemeData(color: Color(0xFF1E293B)),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.05),
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontFamily: 'Rajdhani', fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: Color(0xFF94A3B8),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontFamily: 'Rajdhani', fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontFamily: 'Rajdhani'),
      ),
      dividerColor: const Color(0xFFE2E8F0),
    );
  }
}

class AppConstants {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5000/api';
    
    try {
      if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:5000/api';
    } catch (_) {}
    
    return 'http://localhost:5000/api';
  }

  static const String appName = 'CAMP MONITOR';
  static const String appVersion = '1.0.0';

  static const List<String> gates = ['Gate Alpha', 'Gate Bravo', 'Gate Charlie', 'Gate Delta', 'VIP Gate'];
  static const List<String> zones = ['Zone A - Admin', 'Zone B - Barracks', 'Zone C - Armory', 'Zone D - Motor Pool', 'Zone E - Medical'];
  static const List<String> ranks = ['Private', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Lieutenant', 'Captain', 'Major', 'Colonel', 'General', 'Civilian', 'Contractor'];
}
