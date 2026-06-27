// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';
import 'visitor_portal_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _form = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(duration: const Duration(milliseconds: 800), vsync: this);
    _fadeAnim  = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeIn));
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut));
    _animCtrl.forward();
  }

  @override
  void dispose() { _animCtrl.dispose(); _usernameCtrl.dispose(); _passwordCtrl.dispose(); super.dispose(); }

  Future<void> _login() async {
    if (!_form.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final ok = await auth.login(_usernameCtrl.text.trim(), _passwordCtrl.text);
    if (!ok && mounted && auth.status != AuthStatus.requireVerification) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Login failed'), backgroundColor: AppColors.danger));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Consumer<AuthProvider>(
          builder: (_, auth, __) {
            if (auth.status == AuthStatus.requireVerification) {
              return _OtpScreen(
                maskedEmail: auth.pendingEmail ?? '***',
                userId: auth.pendingUserId ?? '',
              );
            }
            return FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 40),
                      // Logo
                      Center(
                        child: Container(
                          width: 88, height: 88,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.surface,
                            border: Border.all(color: AppColors.primary.withOpacity(0.4), width: 1.5),
                            boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.15), blurRadius: 30)],
                          ),
                          child: const Icon(Icons.shield_outlined, color: AppColors.primary, size: 44),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text('CAMP MONITOR', textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: 4)),
                      const SizedBox(height: 6),
                      const Text('SECURE ACCESS PORTAL', textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 3)),
                      const SizedBox(height: 48),

                      // Form
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Form(
                          key: _form,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text('AUTHENTICATION', style: TextStyle(fontSize: 12, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 20),
                              TextFormField(
                                controller: _usernameCtrl,
                                decoration: const InputDecoration(
                                  labelText: 'Username / Email',
                                  prefixIcon: Icon(Icons.person_outline, color: AppColors.textMuted),
                                ),
                                validator: (v) => v?.isEmpty == true ? 'Required' : null,
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _passwordCtrl,
                                obscureText: _obscure,
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textMuted),
                                  suffixIcon: IconButton(
                                    icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.textMuted),
                                    onPressed: () => setState(() => _obscure = !_obscure),
                                  ),
                                ),
                                validator: (v) => v?.isEmpty == true ? 'Required' : null,
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton(
                                onPressed: auth.loading ? null : _login,
                                child: auth.loading
                                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.background))
                                  : const Text('AUTHENTICATE'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      // Security notice
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.warning.withOpacity(0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.info_outline, color: AppColors.warning, size: 16),
                            SizedBox(width: 8),
                            Expanded(child: Text('Authorized personnel only. All access is monitored and logged.',
                              style: TextStyle(color: AppColors.warning, fontSize: 11))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Center(
                        child: TextButton(
                          onPressed: () {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const VisitorPortalScreen()));
                          },
                          child: const Text('Visitor Access Portal', style: TextStyle(color: AppColors.primary, decoration: TextDecoration.underline)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ─── OTP Verification Screen ─────────────────────────────────────────────────
class _OtpScreen extends StatefulWidget {
  final String maskedEmail;
  final String userId;
  const _OtpScreen({required this.maskedEmail, required this.userId});
  @override State<_OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<_OtpScreen> {
  final List<TextEditingController> _ctrls = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _resending = false;
  bool _submitting = false; // guard against double-submit

  @override
  void dispose() {
    for (final c in _ctrls) c.dispose();
    for (final f in _focusNodes) f.dispose();
    super.dispose();
  }

  String get _code => _ctrls.map((c) => c.text).join();

  Future<void> _verify() async {
    final code = _code;
    if (code.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit code'), backgroundColor: AppColors.danger));
      return;
    }
    if (_submitting) return; // prevent double-submit
    _submitting = true;
    final auth = context.read<AuthProvider>();
    final ok = await auth.verifyEmail(widget.userId, code);
    _submitting = false;
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Invalid code'), backgroundColor: AppColors.danger));
      // Clear inputs
      for (final c in _ctrls) c.clear();
      _focusNodes[0].requestFocus();
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.resendVerification(widget.userId);
    if (mounted) {
      setState(() => _resending = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'New code sent!' : (auth.error ?? 'Failed to resend')),
        backgroundColor: ok ? AppColors.primary : AppColors.danger,
      ));
      if (ok) {
        for (final c in _ctrls) c.clear();
        _focusNodes[0].requestFocus();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 60),
          // Icon
          Center(
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.surface,
                border: Border.all(color: AppColors.primary.withOpacity(0.4), width: 1.5),
                boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.15), blurRadius: 30)],
              ),
              child: const Icon(Icons.mark_email_unread_outlined, color: AppColors.primary, size: 36),
            ),
          ),
          const SizedBox(height: 24),
          const Text('EMAIL VERIFICATION', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: 3)),
          const SizedBox(height: 8),
          Text('Code sent to\n${widget.maskedEmail}', textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.5)),
          const SizedBox(height: 40),

          // OTP digit fields
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(6, (i) {
              return Container(
                width: 46, height: 56,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _ctrls[i].text.isNotEmpty ? AppColors.primary : AppColors.border,
                    width: 1.5,
                  ),
                ),
                child: TextField(
                  controller: _ctrls[i],
                  focusNode: _focusNodes[i],
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary),
                  decoration: const InputDecoration(counterText: '', border: InputBorder.none),
                  onChanged: (val) {
                    setState(() {});
                    if (val.isNotEmpty && i < 5) {
                      _focusNodes[i + 1].requestFocus();
                    } else if (val.isEmpty && i > 0) {
                      _focusNodes[i - 1].requestFocus();
                    }
                    // Auto-submit when all 6 entered
                    if (_code.length == 6) _verify();
                  },
                ),
              );
            }),
          ),
          const SizedBox(height: 32),

          Consumer<AuthProvider>(
            builder: (_, auth, __) => ElevatedButton(
              onPressed: auth.loading ? null : _verify,
              child: auth.loading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.background))
                : const Text('VERIFY & ACCESS'),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () => context.read<AuthProvider>().logout(),
                child: const Text('← Back', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
              ),
              TextButton(
                onPressed: _resending ? null : _resend,
                child: _resending
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                  : const Text('Resend code', style: TextStyle(color: AppColors.primary, fontSize: 13)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
