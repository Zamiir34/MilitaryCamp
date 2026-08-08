// lib/services/auth_provider.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import 'api_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated, requireVerification }

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.unknown;
  User? _user;
  String? _error;
  bool _loading = false;

  // Holds pending verification info
  String? _pendingUserId;
  String? _pendingEmail; // already masked by backend

  AuthStatus get status     => _status;
  User?       get user      => _user;
  String?     get error     => _error;
  bool        get loading   => _loading;
  bool        get isLoggedIn => _status == AuthStatus.authenticated;
  String?     get pendingUserId => _pendingUserId;
  String?     get pendingEmail  => _pendingEmail;

  final _api = ApiService();

  Future<void> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    final userJson = prefs.getString('current_user');
    if (token != null && userJson != null) {
      try {
        _user = User.fromJson(jsonDecode(userJson));
        _status = AuthStatus.authenticated;
        notifyListeners();
        // Refresh user data
        _user = await _api.getMe();
        await prefs.setString('current_user', jsonEncode(_userToJson(_user!)));
        notifyListeners();
      } catch (_) {
        await logout();
      }
    } else {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
    }
  }

  /// Returns true on full success, false on error.
  /// On requireVerification, returns false but status becomes [AuthStatus.requireVerification].
  Future<bool> login(String email, String password) async {
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await _api.login(email, password);

      if (data['requireVerification'] == true) {
        _pendingUserId = data['userId']?.toString();
        _pendingEmail  = data['email']?.toString();
        _status = AuthStatus.requireVerification;
        _loading = false; notifyListeners();
        return false; // caller should show OTP screen
      }

      // Persist token explicitly
      if (data['token'] != null) {
        await _api.setToken(data['token'].toString());
      }
      _user = User.fromJson(data['user']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', jsonEncode(data['user']));
      _status = AuthStatus.authenticated;
      _loading = false; notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString(); _loading = false; notifyListeners();
      return false;
    }
  }

  Future<bool> verifyEmail(String userId, String code) async {
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await _api.verifyEmail(userId, code);
      // Persist token explicitly after OTP verification
      if (data['token'] != null) {
        await _api.setToken(data['token'].toString());
      }
      _user = User.fromJson(data['user']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', jsonEncode(data['user']));
      _pendingUserId = null;
      _pendingEmail  = null;
      _status = AuthStatus.authenticated;
      _loading = false; notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString(); _loading = false; notifyListeners();
      return false;
    }
  }

  Future<bool> resendVerification(String userId) async {
    try {
      await _api.resendVerification(userId);
      return true;
    } catch (e) {
      _error = e.toString(); notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('current_user');
    _user = null;
    _pendingUserId = null;
    _pendingEmail  = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    if (_status != AuthStatus.authenticated) return;
    try {
      _user = await _api.getMe();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', jsonEncode(_userToJson(_user!)));
      notifyListeners();
    } catch (_) {}
  }

  /// Toggle on-duty / off-duty status
  Future<({bool success, String message})> toggleDuty() async {
    try {
      final data = await _api.toggleDuty();
      final updated = await _api.getMe();
      _user = updated;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', jsonEncode(_userToJson(_user!)));
      notifyListeners();
      return (success: true, message: data['message']?.toString() ?? 'Duty status updated');
    } catch (e) {
      return (success: false, message: e.toString());
    }
  }

  void clearError() { _error = null; notifyListeners(); }

  /// Helper to convert User back to a JSON-compatible map for persistence
  Map<String, dynamic> _userToJson(User u) => {
    '_id': u.id,
    'fullName': u.name,
    'email': u.email,
    'role': u.role,
    'rank': u.rank,
    'badgeNumber': u.badgeNumber,
    'profileImage': u.profileImage,
    'isActive': u.isActive,
    'isOnDuty': u.isOnDuty,
    'lastLogin': u.lastLogin?.toIso8601String(),
    if (u.assignedZone != null) 'assignedZone': u.assignedZone,
  };
}
