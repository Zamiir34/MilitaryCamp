// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'services/auth_provider.dart';
import 'services/theme_provider.dart';
import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_nav_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/my_work_screen.dart';
import 'screens/vehicle_screen.dart';
import 'screens/alerts_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb) {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  }
  runApp(const MilitaryCampApp());
}

class MilitaryCampApp extends StatelessWidget {
  const MilitaryCampApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (_, themeProv, __) {
          // Update system UI overlay to match current theme
          final isDark = themeProv.isDark;
          if (!kIsWeb) {
            SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
              statusBarColor: Colors.transparent,
              statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
              systemNavigationBarColor: isDark ? AppColors.surface : Colors.white,
            ));
          }
          return MaterialApp(
            title: AppConstants.appName,
            debugShowCheckedModeBanner: false,
            themeMode: themeProv.mode,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            home: const AppWrapper(),
            routes: {
              '/login':    (_) => const LoginScreen(),
              '/main':     (_) => const MainNavScreen(),
              '/splash':   (_) => const SplashScreen(),
              '/chat':     (_) => const ChatScreen(),
              '/my-work':  (_) => const MyWorkScreen(),
              '/vehicles': (_) => const VehicleScreen(),
              '/alerts':   (_) => const AlertsScreen(),
            },
          );
        },
      ),
    );
  }
}

class AppWrapper extends StatefulWidget {
  const AppWrapper({super.key});
  @override State<AppWrapper> createState() => _AppWrapperState();
}

class _AppWrapperState extends State<AppWrapper> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().checkAuth();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (_, auth, __) {
        switch (auth.status) {
          case AuthStatus.unknown:
            return const SplashScreen();
          case AuthStatus.authenticated:
            return const MainNavScreen();
          case AuthStatus.unauthenticated:
            return const LoginScreen();
          case AuthStatus.requireVerification:
            // LoginScreen reads AuthProvider and shows OTP panel automatically
            return const LoginScreen();
        }
      },
    );
  }
}
