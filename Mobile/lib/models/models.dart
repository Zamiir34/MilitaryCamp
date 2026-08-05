// lib/models/models.dart
import '../theme/app_theme.dart';

class User {
  final String id, name, email, role;
  final String? rank, badgeNumber, profileImage, assignedZone;
  final bool isActive, isOnDuty;
  final DateTime? lastLogin;

  User({required this.id, required this.name, required this.email, required this.role, this.rank, this.badgeNumber, this.profileImage, this.assignedZone, this.isActive = true, this.isOnDuty = false, this.lastLogin});

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['_id'] ?? '', name: j['fullName'] ?? j['name'] ?? '',
    email: j['email'] ?? '', role: j['role'] ?? 'guard',
    rank: j['rank'], badgeNumber: j['badgeNumber'], profileImage: j['profileImage'],
    assignedZone: j['assignedZone']?.toString(),
    isActive: j['isActive'] ?? true,
    isOnDuty: j['isOnDuty'] ?? false,
    lastLogin: j['lastLogin'] != null ? DateTime.tryParse(j['lastLogin']) : null,
  );

  String? get displayZone => AppConstants.normalizeZone(assignedZone);

  bool get isAdmin   => role == 'Administrator' || role == 'admin';
  bool get isOfficer => role == 'SecurityOfficer' || role == 'officer' || role == 'Administrator' || role == 'admin';
  bool get isGuard   => role == 'Guard' || role == 'guard';
}

class Personnel {
  final String id, personnelId, firstName, lastName, rank, unit, badgeNumber, nationalId;
  final String? photo, qrCode, phone, email, category, status, currentStatus, bloodType, militaryId, personnelType;
  final bool hasVehicle;
  final int accessLevel;
  final DateTime? createdAt;

  Personnel({required this.id, required this.personnelId, required this.firstName, required this.lastName, required this.rank, required this.unit, required this.badgeNumber, required this.nationalId, this.photo, this.qrCode, this.phone, this.email, this.category = 'military', this.status = 'active', this.currentStatus = 'outside', this.bloodType, this.militaryId, this.personnelType, this.hasVehicle = false, this.accessLevel = 1, this.createdAt});

  factory Personnel.fromJson(Map<String, dynamic> j) {
    final full = j['fullName']?.toString() ?? '';
    final parts = full.split(' ').where((p) => p.isNotEmpty).toList();
    return Personnel(
      id: j['_id'] ?? '',
      personnelId: j['personnelId'] ?? '',
      firstName: j['firstName']?.toString() ?? (parts.isNotEmpty ? parts.first : ''),
      lastName: j['lastName']?.toString() ?? (parts.length > 1 ? parts.sublist(1).join(' ') : ''),
      rank: j['rank'] ?? '',
      unit: j['unit'] ?? '',
      badgeNumber: j['badgeNumber'] ?? j['idNumber'] ?? '',
      nationalId: j['nationalId'] ?? j['idNumber'] ?? '',
      photo: j['photo'],
      qrCode: j['qrCode'],
      phone: j['phone'],
      email: j['email'],
      category: j['category'],
      status: j['status'],
      currentStatus: j['currentStatus'],
      bloodType: j['bloodType'],
      militaryId: j['militaryId'],
      personnelType: j['type']?.toString(),
      hasVehicle: j['hasVehicle'] == true,
      accessLevel: j['accessLevel'] ?? 1,
      createdAt: j['createdAt'] != null ? DateTime.tryParse(j['createdAt']) : null,
    );
  }

  String get fullName {
    final name = '$firstName $lastName'.trim();
    return name.isNotEmpty ? name : personnelId;
  }
  bool get isInside   => currentStatus == 'inside';
  bool get isActive   => (status ?? '').toLowerCase() == 'active';
  String get type => personnelType ?? category ?? 'Military';
}

class Vehicle {
  final String id, vehicleId, plateNumber, type;
  final String? brand, model, color, ownerName, ownerPhone, qrCode, category, status, currentStatus, photo;
  final int? year;
  final int accessLevel;
  final DateTime? createdAt;

  Vehicle({required this.id, required this.vehicleId, required this.plateNumber, required this.type, this.brand, this.model, this.color, this.ownerName, this.ownerPhone, this.qrCode, this.category = 'military', this.status = 'active', this.currentStatus = 'outside', this.photo, this.year, this.accessLevel = 1, this.createdAt});

  factory Vehicle.fromJson(Map<String, dynamic> j) => Vehicle(
    id: j['_id'] ?? '', vehicleId: j['vehicleId'] ?? '',
    plateNumber: j['plateNumber'] ?? '', type: j['type'] ?? 'car',
    brand: j['brand'], model: j['model'], color: j['color'],
    ownerName: j['ownerName'], ownerPhone: j['ownerPhone'],
    qrCode: j['qrCode'], category: j['category'],
    status: j['status'], currentStatus: j['currentStatus'],
    photo: j['photo'], year: j['year'], accessLevel: j['accessLevel'] ?? 1,
    createdAt: j['createdAt'] != null ? DateTime.tryParse(j['createdAt']) : null,
  );

  bool get isInside => currentStatus == 'inside';
  bool get isBlacklisted => status == 'blacklisted';
}

class EntryLog {
  final String id, logId, type, action, gate;
  final String? subjectName, subjectId, authMethod, purpose, notes, guardName, status;
  final String? driverName, vehicleName, ownerName, plateNumber, recordId, recordedByName;
  final bool isAuthorized;
  final Map<String, dynamic>? personnelSnapshot, vehicleSnapshot;
  final DateTime timestamp;

  EntryLog({
    required this.id,
    required this.logId,
    required this.type,
    required this.action,
    required this.gate,
    this.subjectName,
    this.subjectId,
    this.authMethod,
    this.purpose,
    this.notes,
    this.guardName,
    this.status,
    this.driverName,
    this.vehicleName,
    this.ownerName,
    this.plateNumber,
    this.recordId,
    this.recordedByName,
    this.isAuthorized = true,
    this.personnelSnapshot,
    this.vehicleSnapshot,
    required this.timestamp,
  });

  factory EntryLog.fromJson(Map<String, dynamic> j) {
    final vehicle = j['vehicle'];
    String? ownerFromVehicle;
    if (vehicle is Map) ownerFromVehicle = vehicle['ownerName']?.toString();

    return EntryLog(
      id: j['_id'] ?? '',
      logId: j['logId'] ?? '',
      type: j['type'] ?? '',
      action: j['action'] ?? '',
      gate: j['gate'] ?? '',
      subjectName: j['subjectName']?.toString(),
      subjectId: j['subjectId']?.toString(),
      authMethod: j['authMethod']?.toString(),
      purpose: j['purpose']?.toString(),
      notes: j['notes']?.toString(),
      guardName: j['guardName']?.toString() ?? j['recordedByName']?.toString(),
      status: j['status']?.toString(),
      driverName: j['driverName']?.toString(),
      vehicleName: j['vehicleName']?.toString(),
      ownerName: j['ownerName']?.toString() ?? ownerFromVehicle,
      plateNumber: j['plateNumber']?.toString(),
      recordId: j['recordId']?.toString(),
      recordedByName: j['recordedByName']?.toString(),
      isAuthorized: j['isAuthorized'] != false,
      personnelSnapshot: j['personnelSnapshot'],
      vehicleSnapshot: j['vehicleSnapshot'],
      timestamp: j['createdAt'] != null
          ? DateTime.parse(j['createdAt'])
          : (j['timestamp'] != null ? DateTime.parse(j['timestamp']) : DateTime.now()),
    );
  }

  bool get isEntry => action.toLowerCase() == 'entry';

  String get displayName {
    if (subjectName != null && subjectName!.isNotEmpty) return subjectName!;
    if (type.toLowerCase() == 'personnel' && personnelSnapshot != null) {
      return personnelSnapshot!['name']?.toString() ?? 'Unknown';
    }
    if (type.toLowerCase() == 'vehicle' && vehicleSnapshot != null) {
      return vehicleSnapshot!['plateNumber']?.toString() ?? 'Unknown';
    }
    return 'Unknown';
  }

  String get displayId => subjectId ?? recordId ?? '--';
}

class Alert {
  final String id, type, severity, title, message;
  final bool isRead, isResolved;
  final DateTime createdAt;
  final String? gate;
  final String? zone;
  final String? reporterName;
  final String? reporterRank;

  Alert({
    required this.id,
    required this.type,
    required this.severity,
    required this.title,
    required this.message,
    this.isRead = false,
    this.isResolved = false,
    required this.createdAt,
    this.gate,
    this.zone,
    this.reporterName,
    this.reporterRank,
  });

  factory Alert.fromJson(Map<String, dynamic> j) {
    final reportedBy = j['reportedBy'];
    String? reporterName;
    String? reporterRank;
    if (reportedBy is Map) {
      reporterName = reportedBy['fullName']?.toString();
      reporterRank = reportedBy['rank']?.toString();
    }

    return Alert(
      id: j['_id'] ?? '',
      type: j['type'] ?? '',
      severity: j['severity'] ?? 'medium',
      title: j['title'] ?? j['type'] ?? '',
      message: j['message'] ?? '',
      isRead: j['isRead'] ?? false,
      isResolved: j['isResolved'] ?? false,
      createdAt: j['createdAt'] != null ? DateTime.parse(j['createdAt']) : DateTime.now(),
      gate: j['gate'],
      zone: j['zone'],
      reporterName: reporterName,
      reporterRank: reporterRank,
    );
  }
}

class DashboardStats {
  final int totalPersonnel, activePersonnel, insidePersonnel;
  final int totalVehicles, activeVehicles, insideVehicles;
  final int todayEntries, todayExits;
  final int unreadAlerts, criticalAlerts;
  final int visitorEntriesToday, unresolvedAlerts;
  final int personnelEntriesToday, vehicleEntriesToday;

  DashboardStats({
    required this.totalPersonnel, required this.activePersonnel, required this.insidePersonnel,
    required this.totalVehicles, required this.activeVehicles, required this.insideVehicles,
    required this.todayEntries, required this.todayExits,
    required this.unreadAlerts, required this.criticalAlerts,
    this.visitorEntriesToday = 0, this.unresolvedAlerts = 0,
    this.personnelEntriesToday = 0, this.vehicleEntriesToday = 0,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> j) {
    // Handle BOTH response shapes:
    // - /dashboard/stats  → nested { personnel: {total,active,inside}, vehicles: {}, today: {}, alerts: {} }
    // - /dashboard        → flat   { totalPersonnel, totalVehicles, todayEntries, ... }
    final isFlat = j.containsKey('totalPersonnel') || j.containsKey('todayEntries');

    if (isFlat) {
      return DashboardStats(
        totalPersonnel: j['totalPersonnel'] ?? 0,
        activePersonnel: j['totalPersonnel'] ?? 0,
        insidePersonnel: 0,
        totalVehicles: j['totalVehicles'] ?? 0,
        activeVehicles: j['totalVehicles'] ?? 0,
        insideVehicles: 0,
        todayEntries: j['todayEntries'] ?? 0,
        todayExits: j['todayExits'] ?? 0,
        unreadAlerts: j['unresolvedAlerts'] ?? 0,
        criticalAlerts: 0,
        visitorEntriesToday: j['visitorEntriesToday'] ?? 0,
        unresolvedAlerts: j['unresolvedAlerts'] ?? 0,
        personnelEntriesToday: j['personnelEntriesToday'] ?? 0,
        vehicleEntriesToday: j['vehicleEntriesToday'] ?? 0,
      );
    }

    // Nested shape
    final p = j['personnel'] ?? {};
    final v = j['vehicles'] ?? {};
    final t = j['today'] ?? {};
    final a = j['alerts'] ?? {};
    return DashboardStats(
      totalPersonnel: p['total'] ?? 0, activePersonnel: p['active'] ?? 0, insidePersonnel: p['inside'] ?? 0,
      totalVehicles: v['total'] ?? 0, activeVehicles: v['active'] ?? 0, insideVehicles: v['inside'] ?? 0,
      todayEntries: t['entries'] ?? 0, todayExits: t['exits'] ?? 0,
      unreadAlerts: a['unread'] ?? 0, criticalAlerts: a['critical'] ?? 0,
      visitorEntriesToday: t['visitors'] ?? 0,
      unresolvedAlerts: a['unread'] ?? 0,
      personnelEntriesToday: t['personnel'] ?? 0,
      vehicleEntriesToday: t['vehicles'] ?? 0,
    );
  }
}

// ─── Chart Data ────────────────────────────────────────────────────
class ChartDataPoint {
  final String date;
  final int entries, exits;
  ChartDataPoint({required this.date, required this.entries, required this.exits});
  factory ChartDataPoint.fromJson(Map<String, dynamic> j) => ChartDataPoint(
    date: j['date'] ?? '', entries: j['entries'] ?? 0, exits: j['exits'] ?? 0,
  );
}

// ─── Guard Status ──────────────────────────────────────────────────
class GuardStatus {
  final String id, fullName, role;
  final String? rank, badgeNumber;
  final bool isOnDuty;

  GuardStatus({required this.id, required this.fullName, required this.role, this.rank, this.badgeNumber, required this.isOnDuty});

  factory GuardStatus.fromJson(Map<String, dynamic> j) => GuardStatus(
    id: j['_id'] ?? '',
    fullName: j['fullName'] ?? j['name'] ?? 'Unknown',
    role: j['role'] ?? 'guard',
    rank: j['rank'],
    badgeNumber: j['badgeNumber'],
    isOnDuty: j['isOnDuty'] ?? false,
  );

  String get initials => fullName.split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join().toUpperCase();
}

// ─── Chat ──────────────────────────────────────────────────────────
class ChatUser {
  final String id, fullName, role;
  final String? rank;

  ChatUser({required this.id, required this.fullName, required this.role, this.rank});

  factory ChatUser.fromJson(Map<String, dynamic> j) => ChatUser(
    id: j['_id'] ?? '',
    fullName: j['fullName'] ?? j['name'] ?? 'Unknown',
    role: j['role'] ?? 'Guard',
    rank: j['rank'],
  );

  String get initials => fullName.split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join().toUpperCase();
}

class ChatMessage {
  final String id, content;
  final ChatUser? sender;
  final String? recipientId;
  final bool read;
  final DateTime createdAt;

  ChatMessage({required this.id, required this.content, this.sender, this.recipientId, this.read = false, required this.createdAt});

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
    id: j['_id'] ?? '',
    content: j['content'] ?? '',
    sender: j['sender'] != null && j['sender'] is Map ? ChatUser.fromJson(j['sender']) : null,
    recipientId: j['recipient'] is Map ? j['recipient']['_id'] : j['recipient'],
    read: j['read'] ?? false,
    createdAt: j['createdAt'] != null ? DateTime.parse(j['createdAt']) : DateTime.now(),
  );
}

class ChatConversation {
  final ChatUser user;
  final ChatMessage? lastMessage;
  final int unread;

  ChatConversation({required this.user, this.lastMessage, this.unread = 0});

  factory ChatConversation.fromJson(Map<String, dynamic> j) => ChatConversation(
    user: ChatUser.fromJson(j['user']),
    lastMessage: j['lastMessage'] != null ? ChatMessage.fromJson(j['lastMessage']) : null,
    unread: j['unread'] ?? 0,
  );
}

class VisitorModel {
  final String id;
  final String visitorId;
  final String fullName;
  final String visitorType; // 'Military' | 'Civilian'
  final String idNumber;
  final String phone;
  final String? email;
  final String? organization;
  final String purposeOfVisit;
  final String? hostName;
  final DateTime visitDate;
  final String? expectedDuration;
  final String? photo;
  final String? qrCode;
  final String? vehiclePlate;
  final String? vehicleModel;
  final String? vehicleColor;
  final bool hasVehicle;
  final String status; // 'Pending', 'Approved', 'Denied', 'Completed'
  final String? notes;
  final DateTime? createdAt;

  VisitorModel({
    required this.id,
    required this.visitorId,
    required this.fullName,
    required this.visitorType,
    required this.idNumber,
    required this.phone,
    this.email,
    this.organization,
    required this.purposeOfVisit,
    this.hostName,
    required this.visitDate,
    this.expectedDuration,
    this.photo,
    this.qrCode,
    this.vehiclePlate,
    this.vehicleModel,
    this.vehicleColor,
    this.hasVehicle = false,
    required this.status,
    this.notes,
    this.createdAt,
  });

  factory VisitorModel.fromJson(Map<String, dynamic> j) {
    return VisitorModel(
      id: j['_id'] ?? '',
      visitorId: j['visitorId'] ?? '',
      fullName: j['fullName'] ?? '',
      visitorType: j['visitorType'] ?? 'Civilian',
      idNumber: j['idNumber'] ?? '',
      phone: j['phone'] ?? '',
      email: j['email'],
      organization: j['organization'],
      purposeOfVisit: j['purposeOfVisit'] ?? '',
      hostName: j['hostName'],
      visitDate: j['visitDate'] != null ? DateTime.parse(j['visitDate']) : DateTime.now(),
      expectedDuration: j['expectedDuration'],
      photo: j['photo'],
      qrCode: j['qrCode'],
      vehiclePlate: j['vehiclePlate'],
      vehicleModel: j['vehicleModel'],
      vehicleColor: j['vehicleColor'],
      hasVehicle: j['hasVehicle'] ?? false,
      status: j['status'] ?? 'Pending',
      notes: j['notes'],
      createdAt: j['createdAt'] != null ? DateTime.tryParse(j['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'fullName': fullName,
    'visitorType': visitorType,
    'idNumber': idNumber,
    'phone': phone,
    if (email != null) 'email': email,
    if (organization != null) 'organization': organization,
    'purposeOfVisit': purposeOfVisit,
    if (hostName != null) 'hostName': hostName,
    'visitDate': visitDate.toIso8601String(),
    if (expectedDuration != null) 'expectedDuration': expectedDuration,
    if (photo != null) 'photo': photo,
    if (qrCode != null) 'qrCode': qrCode,
    if (vehiclePlate != null) 'vehiclePlate': vehiclePlate,
    if (vehicleModel != null) 'vehicleModel': vehicleModel,
    if (vehicleColor != null) 'vehicleColor': vehicleColor,
    'hasVehicle': hasVehicle,
    'status': status,
    if (notes != null) 'notes': notes,
  };
}
