// lib/screens/attendance_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
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

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final todayData = await _api.checkTodayAttendance();

      setState(() {
        if (todayData['checkedIn'] == true) {
          _todayRecord = todayData['record'];
        } else {
          _todayRecord = null;
        }
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

  @override
  Widget build(BuildContext context) {
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
                ],
              ),
            ),
    );
  }
}
