// lib/theme/app_theme.dart
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform;
import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';

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

// ─── Theme-aware color helpers ──────────────────────────────────────────────
extension AppC on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  // Backgrounds
  Color get bgColor         => isDark ? AppColors.background     : Colors.white;
  Color get surfaceColor    => isDark ? AppColors.surface        : Colors.white;
  Color get surfaceVarColor => isDark ? AppColors.surfaceVariant : const Color(0xFFF1F5F9);
  Color get cardColor       => isDark ? AppColors.card           : Colors.white;

  // Text
  Color get textPrimary    => isDark ? AppColors.textPrimary   : const Color(0xFF0F172A);
  Color get textSecondary  => isDark ? AppColors.textSecondary : const Color(0xFF334155);
  Color get textMuted      => isDark ? AppColors.textMuted     : const Color(0xFF64748B);

  // Border
  Color get borderColor    => isDark ? AppColors.border      : const Color(0xFFE2E8F0);
  Color get borderLight    => isDark ? AppColors.borderLight  : const Color(0xFFCBD5E1);
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
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: Color(0xFF0F172A), fontFamily: 'Rajdhani', fontWeight: FontWeight.w700),
        displayMedium: TextStyle(color: Color(0xFF0F172A), fontFamily: 'Rajdhani', fontWeight: FontWeight.w700),
        headlineLarge: TextStyle(color: Color(0xFF0F172A), fontFamily: 'Rajdhani', fontWeight: FontWeight.w700),
        headlineMedium: TextStyle(color: Color(0xFF0F172A), fontFamily: 'Rajdhani', fontWeight: FontWeight.w600),
        titleLarge: TextStyle(color: Color(0xFF0F172A), fontFamily: 'Rajdhani', fontWeight: FontWeight.w600),
        titleMedium: TextStyle(color: Color(0xFF0F172A), fontFamily: 'Rajdhani', fontWeight: FontWeight.w500),
        bodyLarge: TextStyle(color: Color(0xFF334155), fontFamily: 'Rajdhani'),
        bodyMedium: TextStyle(color: Color(0xFF334155), fontFamily: 'Rajdhani'),
        bodySmall: TextStyle(color: Color(0xFF64748B), fontFamily: 'Rajdhani'),
      ),
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

  /// Frontend URL used in QR codes so phone cameras open the verify page.
  static const String webBaseUrl = String.fromEnvironment(
    'WEB_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static String verifyUrl(String id) => '$webBaseUrl/verify/$id';

  static const String appName = 'CAMP MONITOR';
  static const String appVersion = '1.0.0';

  static const List<String> notificationTypes = [
    'Unauthorized Access',
    'Blacklisted Vehicle',
    'Expired Permit',
    'Suspicious Activity',
    'Personnel Exit',
  ];

  static const List<String> gates = ['Main Gate', 'Vehicle Gate', 'Gate 2', 'Gate 3', 'Emergency Exit'];
  static const List<String> zones = ['Zone A - Admin', 'Zone B - Barracks', 'Zone C - Armory', 'Zone D - Motor Pool', 'Zone E - Medical'];
  static const List<String> ranks = ['Dable', 'Captan', 'Cornel', 'Gashaanle'];

  static String? normalizeZone(String? zone) {
    if (zone == null || zone.trim().isEmpty) return null;
    const labels = {
      'Zone A': 'Zone A - Admin',
      'Zone B': 'Zone B - Barracks',
      'Zone C': 'Zone C - Armory',
      'Zone D': 'Zone D - Motor Pool',
      'Zone E': 'Zone E - Medical',
      'HQ': 'Zone A - Admin',
      'All Zones': 'Zone A - Admin',
    };
    return labels[zone.trim()] ?? zone.trim();
  }
}

class SafeAvatar extends StatelessWidget {
  final String? photo;
  final double radius;
  final Widget fallback;

  const SafeAvatar({
    super.key,
    required this.photo,
    required this.radius,
    required this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    if (photo == null || photo!.trim().isEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: AppColors.primary.withOpacity(0.15),
        child: fallback,
      );
    }

    final trimmed = photo!.trim();

    // Check base64
    if (trimmed.startsWith('data:image') || (!trimmed.startsWith('http') && !trimmed.startsWith('/'))) {
      try {
        final base64Str = trimmed.contains(',') ? trimmed.split(',').last : trimmed;
        final bytes = base64Decode(base64Str);
        return CircleAvatar(
          radius: radius,
          backgroundColor: AppColors.primary.withOpacity(0.15),
          backgroundImage: MemoryImage(bytes),
        );
      } catch (_) {}
    }

    // Network / File URL
    final fullUrl = trimmed.startsWith('http')
        ? trimmed
        : '${AppConstants.baseUrl.replaceAll('/api', '')}${trimmed.startsWith('/') ? '' : '/'}$trimmed';

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.primary.withOpacity(0.15),
      child: ClipOval(
        child: CachedNetworkImage(
          imageUrl: fullUrl,
          fit: BoxFit.cover,
          width: radius * 2,
          height: radius * 2,
          placeholder: (context, url) => const CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
          errorWidget: (context, url, error) => fallback,
        ),
      ),
    );
  }
}
