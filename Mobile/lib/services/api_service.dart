// lib/services/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override String toString() => message;
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  Future<String?> get token async {
    if (_token != null) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    return _token;
  }

  Future<void> setToken(String t) async {
    _token = t;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', t);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('current_user');
  }

  Future<Map<String, String>> _headers() async {
    final t = await token;
    return {
      'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  Future<dynamic> _get(String path) async {
    final res = await http.get(Uri.parse('${AppConstants.baseUrl}$path'), headers: await _headers());
    return _handle(res);
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('${AppConstants.baseUrl}$path'),
      headers: await _headers(), body: jsonEncode(body));
    return _handle(res);
  }

  Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    final res = await http.put(Uri.parse('${AppConstants.baseUrl}$path'),
      headers: await _headers(), body: jsonEncode(body));
    return _handle(res);
  }

  Future<dynamic> _patch(String path, [Map<String, dynamic>? body]) async {
    final res = await http.patch(Uri.parse('${AppConstants.baseUrl}$path'),
      headers: await _headers(), body: body != null ? jsonEncode(body) : null);
    return _handle(res);
  }

  Future<dynamic> _delete(String path) async {
    final res = await http.delete(Uri.parse('${AppConstants.baseUrl}$path'), headers: await _headers());
    return _handle(res);
  }

  dynamic _handle(http.Response res) {
    final data = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    throw ApiException(data['message'] ?? 'Request failed', statusCode: res.statusCode);
  }

  // ─── Auth ────────────────────────────────────────────────
  /// Returns the raw JSON map. Caller must check for 'requireVerification' key.
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('${AppConstants.baseUrl}/auth/login'),
      headers: await _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = _handle(res);
    // Only set token when login is complete (no verification required)
    if (data['token'] != null) {
      await setToken(data['token']);
    }
    return data;
  }

  Future<Map<String, dynamic>> verifyEmail(String userId, String code) async {
    final res = await http.post(
      Uri.parse('${AppConstants.baseUrl}/auth/verify-email'),
      headers: await _headers(),
      body: jsonEncode({'userId': userId, 'code': code}),
    );
    final data = _handle(res);
    if (data['token'] != null) await setToken(data['token']);
    return data;
  }

  Future<void> resendVerification(String userId) async {
    await _post('/auth/resend-verification', {'userId': userId});
  }

  Future<User> getMe() async {
    final data = await _get('/auth/me');
    // /auth/me returns the user object directly (not wrapped in { user: ... })
    return User.fromJson(data is Map<String, dynamic> ? data : data['user']);
  }

  Future<void> changePassword(String current, String newPass) async {
    await _put('/auth/change-password', {'currentPassword': current, 'newPassword': newPass});
  }

  Future<Map<String, dynamic>> toggleDuty() async {
    return await _put('/auth/duty', {});
  }

  // ─── Dashboard ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getDashboardStats() async => await _get('/dashboard/stats');

  /// Full dashboard data matching the web — includes stats, chart, recent activity, guards
  Future<Map<String, dynamic>> getDashboardFull() async => await _get('/dashboard');

  /// Personal guard activity summary
  Future<Map<String, dynamic>> getMyActivity() async => await _get('/dashboard/my-activity');

  // ─── Personnel ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getPersonnel({int page = 1, String? search, String? status, String? category}) async {
    var path = '/personnel?page=$page&limit=20';
    if (search != null && search.isNotEmpty) path += '&search=$search';
    if (status != null) path += '&status=$status';
    if (category != null) path += '&category=$category';
    return await _get(path);
  }

  Future<Personnel> getPersonnelById(String id) async {
    final data = await _get('/personnel/$id');
    return Personnel.fromJson(data['personnel'] ?? data);
  }

  Future<Personnel> searchByBadge(String badge) async {
    final data = await _get('/personnel/search/badge/$badge');
    return Personnel.fromJson(data['personnel'] ?? data);
  }

  Future<Personnel> createPersonnel(Map<String, dynamic> body) async {
    final data = await _post('/personnel', body);
    return Personnel.fromJson(data['personnel'] ?? data);
  }

  Future<Personnel> updatePersonnel(String id, Map<String, dynamic> body) async {
    final data = await _put('/personnel/$id', body);
    return Personnel.fromJson(data is Map<String, dynamic> && data['personnel'] != null ? data['personnel'] : data);
  }

  Future<void> deletePersonnel(String id) async => await _delete('/personnel/$id');

  // ─── Guard Account Management for Personnel ────────────────
  Future<Map<String, dynamic>> getGuardAccount(String personnelId) async {
    return await _get('/personnel/$personnelId/guard-account');
  }

  Future<Map<String, dynamic>> issueGuardAccount(String personnelId, Map<String, dynamic> body) async {
    return await _post('/personnel/$personnelId/guard-account', body);
  }

  Future<Map<String, dynamic>> resetGuardAccountPassword(String personnelId, String newPassword) async {
    return await _put('/personnel/$personnelId/guard-account/password', {'password': newPassword});
  }

  // ─── Vehicles ────────────────────────────────────────────────
  Future<Map<String, dynamic>> getVehicles({int page = 1, String? search, String? status}) async {
    var path = '/vehicles?page=$page&limit=20';
    if (search != null && search.isNotEmpty) path += '&search=$search';
    if (status != null) path += '&status=$status';
    return await _get(path);
  }

  Future<Vehicle> getVehicleById(String id) async {
    final data = await _get('/vehicles/$id');
    return Vehicle.fromJson(data['vehicle']);
  }

  Future<List<Vehicle>> getVehiclesByOwner(String personnelId) async {
    try {
      final data = await _get('/vehicles/owner/$personnelId');
      return (data['vehicles'] as List).map((v) => Vehicle.fromJson(v)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<Vehicle> searchByPlate(String plate) async {
    final data = await _get('/vehicles/search/plate/$plate');
    return Vehicle.fromJson(data['vehicle'] ?? data);
  }

  Future<Vehicle> createVehicle(Map<String, dynamic> body) async {
    final data = await _post('/vehicles', body);
    return Vehicle.fromJson(data['vehicle'] ?? data);
  }

  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> body) async {
    final data = await _put('/vehicles/$id', body);
    return Vehicle.fromJson(data['vehicle'] ?? data);
  }

  // ─── Entry Logs ──────────────────────────────────────────────
  Future<Map<String, dynamic>> getEntryLogs({
    int page = 1,
    int limit = 30,
    String? search,
    String? type,
    String? action,
    String? gate,
    String? date,
  }) async {
    var path = '/entries?page=$page&limit=$limit';
    if (search != null && search.isNotEmpty) path += '&search=${Uri.encodeComponent(search)}';
    if (type != null && type.isNotEmpty) path += '&type=$type';
    if (action != null && action.isNotEmpty) path += '&action=$action';
    if (gate != null && gate.isNotEmpty) path += '&gate=${Uri.encodeComponent(gate)}';
    if (date != null && date.isNotEmpty) path += '&date=$date';
    return await _get(path);
  }

  List<EntryLog> parseEntryLogs(Map<String, dynamic> data) {
    final raw = data['data'] ?? data['logs'] ?? [];
    return (raw as List).map((e) => EntryLog.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<EntryLog>> getTodayLogs() async {
    final now = DateTime.now();
    final date = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    final data = await getEntryLogs(date: date, limit: 200);
    return parseEntryLogs(data);
  }

  Future<List<EntryLog>> getRecentLogs({int limit = 10}) async {
    final data = await getEntryLogs(limit: limit);
    return parseEntryLogs(data);
  }

  Future<EntryLog> recordEntry(Map<String, dynamic> body) async {
    final data = await _post('/entries/entry', body);
    return EntryLog.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<EntryLog> recordExit(Map<String, dynamic> body) async {
    final data = await _post('/entries/exit', body);
    return EntryLog.fromJson(Map<String, dynamic>.from(data as Map));
  }

  @Deprecated('Use recordEntry instead')
  Future<EntryLog> logPersonnelEntry(Map<String, dynamic> body) async {
    return recordEntry({
      'type': 'Personnel',
      'subjectName': body['subjectName'] ?? body['personnelName'] ?? '',
      'subjectId': body['personnelId'] ?? body['subjectId'] ?? '',
      'gate': body['gate'] ?? 'Main Gate',
      'purpose': body['purpose'],
      'notes': body['notes'],
      'authMethod': body['authMethod'],
      'isAuthorized': body['isAuthorized'] ?? true,
    });
  }

  @Deprecated('Use recordEntry instead')
  Future<EntryLog> logVehicleEntry(Map<String, dynamic> body) async {
    return recordEntry({
      'type': 'Vehicle',
      'subjectName': body['subjectName'] ?? body['plateNumber'] ?? '',
      'subjectId': body['subjectId'] ?? body['plateNumber'] ?? '',
      'vehicle': body['vehicleId'] ?? body['vehicle'],
      'driverName': body['driverName'],
      'gate': body['gate'] ?? 'Main Gate',
      'purpose': body['purpose'],
      'notes': body['notes'],
      'authMethod': body['authMethod'],
      'isAuthorized': body['isAuthorized'] ?? true,
    });
  }

  // ─── Alerts ──────────────────────────────────────────────────
  Future<Map<String, dynamic>> getAlerts({bool? isRead, bool? isResolved, String? severity, int limit = 30}) async {
    var path = '/alerts?page=1&limit=$limit';
    if (isRead != null) path += '&isRead=$isRead';
    if (isResolved != null) path += '&isResolved=$isResolved';
    if (severity != null) path += '&severity=$severity';
    return await _get(path);
  }

  Future<int> getUnreadAlertsCount() async {
    final data = await _get('/alerts/unread-count');
    return data['count'] ?? 0;
  }

  Future<void> markAlertRead(String id) async => await _patch('/alerts/$id/read');
  Future<void> markAllAlertsRead() async => await _patch('/alerts/mark-all-read');

  // ─── Reports ─────────────────────────────────────────────────
  Future<Map<String, dynamic>> getReportRange({
    required String startDate,
    required String endDate,
    String? type,
    String? gate,
    String? action,
    String? isAuthorized,
  }) async {
    var path = '/reports/range?startDate=$startDate&endDate=$endDate';
    if (type != null && type.isNotEmpty) path += '&type=$type';
    if (gate != null && gate.isNotEmpty) path += '&gate=${Uri.encodeComponent(gate)}';
    if (action != null && action.isNotEmpty) path += '&action=$action';
    if (isAuthorized != null && isAuthorized.isNotEmpty) path += '&isAuthorized=$isAuthorized';
    return await _get(path);
  }

  Future<Map<String, dynamic>> getReport({String? startDate, String? endDate}) async {
    var path = '/reports';
    if (startDate != null) path += '?startDate=$startDate';
    if (endDate != null)   path += '${startDate != null ? '&' : '?'}endDate=$endDate';
    return await _get(path);
  }

  Future<Map<String, dynamic>> getPersonnelHistory(String id) async => await _get('/reports/personnel/$id');
  Future<Map<String, dynamic>> getVehicleHistory(String id) async   => await _get('/reports/vehicle/$id');

  Future<Map<String, dynamic>> createNotification({
    required String type,
    required String message,
    String? zone,
    String? gate,
  }) async {
    return await _post('/alerts', {
      'type': type,
      'message': message,
      if (zone != null && zone.isNotEmpty) 'zone': zone,
      if (gate != null && gate.isNotEmpty) 'gate': gate,
    });
  }

  @Deprecated('Use createNotification instead')
  Future<Map<String, dynamic>> sendGuardNotification({
    required String message,
    required String zone,
    String? gate,
  }) async {
    return createNotification(type: 'Suspicious Activity', message: message, zone: zone, gate: gate);
  }

  // ─── User Management (admin only) ────────────────────────────
  Future<List<dynamic>> getUsers() async {
    final data = await _get('/users');
    return data as List;
  }

  Future<Map<String, dynamic>> createUser(Map<String, dynamic> body) async {
    return await _post('/users', body);
  }

  Future<Map<String, dynamic>> updateUser(String id, Map<String, dynamic> body) async {
    return await _put('/users/$id', body);
  }

  Future<void> deleteUser(String id) async {
    await _delete('/users/$id');
  }

  Future<Map<String, dynamic>> toggleUserStatus(String id) async {
    return await _put('/users/$id/toggle', {});
  }

  Future<void> resetUserPassword(String id, String newPassword) async {
    await _put('/users/$id/reset-password', {'newPassword': newPassword});
  }

  // ─── Chat ────────────────────────────────────────────────────
  Future<List<ChatUser>> getChatUsers() async {
    final data = await _get('/chat/users');
    return (data as List).map((u) => ChatUser.fromJson(u)).toList();
  }

  Future<List<ChatConversation>> getConversations() async {
    final data = await _get('/chat/conversations');
    return (data as List).map((c) => ChatConversation.fromJson(c)).toList();
  }

  Future<List<ChatMessage>> getMessages(String userId) async {
    final data = await _get('/chat/messages/$userId');
    return (data as List).map((m) => ChatMessage.fromJson(m)).toList();
  }

  Future<ChatMessage> sendMessage(String recipientId, String content) async {
    final data = await _post('/chat/messages', {'recipientId': recipientId, 'content': content});
    return ChatMessage.fromJson(data);
  }

  Future<void> markMessagesRead(String userId) async {
    await _put('/chat/messages/$userId/read', {});
  }

  // ─── Visitors ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getVisitors({int page = 1, String? search, String? status}) async {
    var path = '/visitors?page=$page&limit=20';
    if (search != null && search.isNotEmpty) path += '&search=$search';
    if (status != null) path += '&status=$status';
    final data = await _get(path);
    return data;
  }

  Future<VisitorModel> getVisitorById(String id) async {
    final data = await _get('/visitors/$id');
    return VisitorModel.fromJson(data);
  }

  Future<VisitorModel> createVisitor(Map<String, dynamic> body) async {
    final data = await _post('/visitors', body);
    return VisitorModel.fromJson(data);
  }

  Future<VisitorModel> updateVisitor(String id, Map<String, dynamic> body) async {
    final data = await _put('/visitors/$id', body);
    return VisitorModel.fromJson(data);
  }

  Future<void> deleteVisitor(String id) async => await _delete('/visitors/$id');

  Future<Map<String, dynamic>> getVisitorHistory(String id) async => await _get('/reports/visitor/$id');

  // ─── Attendance ───────────────────────────────────────────────
  Future<Map<String, dynamic>> checkTodayAttendance() async {
    try {
      return await _get('/attendance/today');
    } catch (e) {
      return {'checkedIn': false};
    }
  }

  Future<Map<String, dynamic>> checkInAttendance(String notes) async {
    return await _post('/attendance/check-in', {'notes': notes});
  }

  Future<Map<String, dynamic>> checkOutAttendance(String notes) async {
    return await _post('/attendance/check-out', {'notes': notes});
  }

  Future<List<dynamic>> getAttendanceHistory() async {
    final data = await _get('/attendance/history');
    return data as List<dynamic>;
  }

  Future<List<dynamic>> getTeamAttendance({String? date, String? startTime, String? endTime}) async {
    final params = <String, String>{};
    if (startTime != null && startTime.isNotEmpty && endTime != null && endTime.isNotEmpty) {
      params['startTime'] = startTime;
      params['endTime'] = endTime;
    } else if (date != null && date.isNotEmpty) {
      params['date'] = date;
    }
    final query = params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
    final data = await _get('/attendance/all${query.isNotEmpty ? '?$query' : ''}');
    return data as List<dynamic>;
  }

  // ─── Public Visitor Auth ──────────────────────────────────────
  Future<Map<String, dynamic>> requestVisitorOtp(String email) async {
    final res = await http.post(Uri.parse('${AppConstants.baseUrl}/public/visitor-auth/request-otp'),
        headers: {'Content-Type': 'application/json'}, body: jsonEncode({'email': email}));
    return _handle(res);
  }

  Future<Map<String, dynamic>> verifyVisitorOtp(String email, String code) async {
    final res = await http.post(Uri.parse('${AppConstants.baseUrl}/public/visitor-auth/verify-otp'),
        headers: {'Content-Type': 'application/json'}, body: jsonEncode({'email': email, 'code': code}));
    return _handle(res);
  }

  Future<Map<String, dynamic>> getVisitorMe(String token) async {
    final res = await http.get(Uri.parse('${AppConstants.baseUrl}/public/visitor-auth/me'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'});
    return _handle(res);
  }
}
