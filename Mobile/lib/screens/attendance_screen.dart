// lib/screens/attendance_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final _api = ApiService();
  bool _loading = true;
  bool _submitting = false;
  Map<String, dynamic>? _todayRecord;
  List<dynamic> _teamRecords = [];
  late DateTime _startTime;
  late DateTime _endTime;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startTime = DateTime(now.year, now.month, now.day);
    _endTime = DateTime(now.year, now.month, now.day, 23, 59);
    _loadData();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final user = context.read<AuthProvider>().user;
      final canViewTeam = user?.isOfficer == true;
      final todayData = await _api.checkTodayAttendance();
      final teamData = canViewTeam
          ? await _api.getTeamAttendance(
              startTime: _startTime.toUtc().toIso8601String(),
              endTime: _endTime.toUtc().toIso8601String(),
            )
          : <dynamic>[];

      setState(() {
        if (todayData['checkedIn'] == true) {
          _todayRecord = todayData['record'];
        } else {
          _todayRecord = null;
        }
        _teamRecords = teamData;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading attendance: $e'), backgroundColor: AppColors.danger),
        );
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _handleCheckIn() async {
    setState(() => _submitting = true);
    try {
      await _api.checkInAttendance('');
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Checked In successfully!'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to check in: $e'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _handleCheckOut() async {
    setState(() => _submitting = true);
    try {
      await _api.checkOutAttendance('');
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Checked Out successfully!'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to check out: $e'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _buildStatusCard() {
    final hasCheckedIn = _todayRecord != null;
    final hasCheckedOut = hasCheckedIn && _todayRecord!['checkOutTime'] != null;

    String shiftDuration = '--';
    if (hasCheckedIn && _todayRecord!['checkInTime'] != null) {
      try {
        final checkInTime = DateTime.parse(_todayRecord!['checkInTime']);
        final endTime = hasCheckedOut ? DateTime.parse(_todayRecord!['checkOutTime']) : DateTime.now();
        final diff = endTime.difference(checkInTime);
        final hours = diff.inHours;
        final mins = diff.inMinutes.remainder(60);
        shiftDuration = '${hours}h ${mins}m';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('TODAY\'S SHIFT', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('CHECK IN', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                  const SizedBox(height: 4),
                  Text(
                    hasCheckedIn && _todayRecord!['checkInTime'] != null
                        ? DateFormat('HH:mm').format(DateTime.parse(_todayRecord!['checkInTime']))
                        : '--:--',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.success),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('CHECK OUT', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                  const SizedBox(height: 4),
                  Text(
                    hasCheckedOut
                        ? DateFormat('HH:mm').format(DateTime.parse(_todayRecord!['checkOutTime']))
                        : '--:--',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: hasCheckedOut ? AppColors.warning : AppColors.textMuted),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('DURATION', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                  const SizedBox(height: 4),
                  Text(
                    shiftDuration,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          if (!hasCheckedIn)
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _handleCheckIn,
                icon: _submitting ? const SizedBox() : const Icon(Icons.login),
                label: _submitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('CHECK IN NOW', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            )
          else if (!hasCheckedOut)
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _handleCheckOut,
                icon: _submitting ? const SizedBox() : const Icon(Icons.logout),
                label: _submitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('CHECK OUT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.warning,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, color: AppColors.success),
                  SizedBox(width: 8),
                  Text('Shift Completed', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _pickDateTime({required bool isStart}) async {
    final initial = isStart ? _startTime : _endTime;
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (pickedTime == null || !mounted) return;

    final combined = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    setState(() {
      if (isStart) {
        _startTime = combined;
      } else {
        _endTime = combined;
      }
    });
  }

  Future<void> _applyTeamRange() async {
    if (_startTime.isAfter(_endTime)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Start time must be before end time'), backgroundColor: AppColors.danger),
      );
      return;
    }
    final user = context.read<AuthProvider>().user;
    if (user?.isOfficer != true) return;
    setState(() => _loading = true);
    try {
      final teamData = await _api.getTeamAttendance(
        startTime: _startTime.toUtc().toIso8601String(),
        endTime: _endTime.toUtc().toIso8601String(),
      );
      if (mounted) {
        setState(() {
          _teamRecords = teamData;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load guard attendance: $e'), backgroundColor: AppColors.danger),
        );
        setState(() => _loading = false);
      }
    }
  }

  String _formatDateTime(DateTime value) => DateFormat('yyyy-MM-dd HH:mm').format(value);

  Widget _buildTeamSection(String? role) {
    final title = role == 'SecurityOfficer' ? 'GUARD ATTENDANCE' : 'TEAM ATTENDANCE';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.groups_outlined, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pickDateTime(isStart: true),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('START TIME', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text(_formatDateTime(_startTime), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pickDateTime(isStart: false),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('END TIME', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text(_formatDateTime(_endTime), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _applyTeamRange,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              child: const Text('APPLY RANGE'),
            ),
          ),
          const SizedBox(height: 16),
          if (_teamRecords.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'No attendance records for the selected time range.',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            )
          else
            ..._teamRecords.map((rec) {
              final user = rec['user'] as Map<String, dynamic>? ?? {};
              final checkIn = rec['checkInTime']?.toString();
              final checkOut = rec['checkOutTime']?.toString();
              final recordDate = rec['date']?.toString() ?? (checkIn != null ? checkIn.substring(0, 10) : '--');
              final completed = checkOut != null && checkOut.isNotEmpty;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user['fullName']?.toString() ?? 'Unknown',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      recordDate,
                      style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${user['rank'] ?? 'N/A'} • ${user['role'] ?? 'Guard'} • Badge ${user['badgeNumber'] ?? 'N/A'}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CHECK IN', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                              Text(
                                checkIn != null ? DateFormat('HH:mm:ss').format(DateTime.parse(checkIn)) : '--',
                                style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CHECK OUT', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                              Text(
                                completed ? DateFormat('HH:mm:ss').format(DateTime.parse(checkOut)) : '--',
                                style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: (completed ? AppColors.secondary : AppColors.success).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            completed ? 'Completed' : 'On Duty',
                            style: TextStyle(
                              color: completed ? AppColors.secondary : AppColors.success,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canViewTeam = user?.isOfficer == true;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Check In / Out'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildStatusCard(),
                  if (canViewTeam) ...[
                    const SizedBox(height: 20),
                    _buildTeamSection(user?.role),
                  ],
                ],
              ),
            ),
    );
  }
}
