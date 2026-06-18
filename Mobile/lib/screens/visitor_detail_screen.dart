// lib/screens/visitor_detail_screen.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'log_entry_screen.dart';

class VisitorDetailScreen extends StatefulWidget {
  final String visitorId;
  const VisitorDetailScreen({super.key, required this.visitorId});

  @override
  State<VisitorDetailScreen> createState() => _VisitorDetailScreenState();
}

class _VisitorDetailScreenState extends State<VisitorDetailScreen> {
  final _api = ApiService();
  VisitorModel? _visitor;
  List<EntryLog> _history = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getVisitorById(widget.visitorId),
        _api.getVisitorHistory(widget.visitorId),
      ]);
      
      setState(() {
        _visitor = results[0] as VisitorModel;
        final hMap = results[1] as Map<String, dynamic>;
        _history = (hMap['logs'] as List).map((e) => EntryLog.fromJson(e)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    
    if (_visitor == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: Text('Visitor not found', style: TextStyle(color: AppColors.textMuted))),
      );
    }

    final isMilitary = _visitor!.visitorType == 'Military';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.surface,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.surface,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 60),
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.primary.withOpacity(0.2),
                      child: _visitor!.photo != null && _visitor!.photo!.isNotEmpty
                          ? ClipOval(
                              child: _visitor!.photo!.startsWith('data:')
                                  ? Image.memory(
                                      base64Decode(_visitor!.photo!.split(',').last),
                                      fit: BoxFit.cover,
                                      width: 80,
                                      height: 80,
                                    )
                                  : CachedNetworkImage(
                                      imageUrl: _visitor!.photo!.startsWith('http')
                                          ? _visitor!.photo!
                                          : '${AppConstants.baseUrl.replaceAll('/api', '')}${_visitor!.photo}',
                                      fit: BoxFit.cover,
                                      width: 80,
                                      height: 80,
                                      placeholder: (context, url) => const CircularProgressIndicator(color: AppColors.primary),
                                      errorWidget: (context, url, error) => Icon(
                                        isMilitary ? Icons.shield : Icons.person,
                                        color: AppColors.primary,
                                        size: 40,
                                      ),
                                    ),
                            )
                          : Text(
                              _visitor!.fullName.isNotEmpty ? _visitor!.fullName[0].toUpperCase() : '?',
                              style: const TextStyle(color: AppColors.primary, fontSize: 28, fontWeight: FontWeight.bold),
                            ),
                    ),
                    const SizedBox(height: 10),
                    Text(_visitor!.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    Text(
                      isMilitary 
                          ? '${_visitor!.organization ?? 'Military Member'}' 
                          : 'Civilian Visitor',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.swap_horiz),
                tooltip: 'Log Entry/Exit',
                onPressed: () => Navigator.push(
                  context, 
                  MaterialPageRoute(builder: (_) => const LogEntryScreen(type: 'personnel')),
                ).then((_) => _load()),
              ),
            ],
          ),
          
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Status Row
                  Row(
                    children: [
                      _Badge(_visitor!.status.toUpperCase(), 
                          _visitor!.status == 'Approved' ? AppColors.success : AppColors.warning),
                      const SizedBox(width: 8),
                      _Badge(_visitor!.visitorType.toUpperCase(), AppColors.secondary),
                      const SizedBox(width: 8),
                      if (_visitor!.hasVehicle)
                        const _Badge('HAS VEHICLE', AppColors.primary),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Info Card
                  _InfoCard(
                    children: [
                      _InfoRow('Visitor ID', _visitor!.visitorId),
                      _InfoRow(isMilitary ? 'Military ID' : 'National ID', _visitor!.idNumber),
                      _InfoRow('Phone', _visitor!.phone),
                      if (_visitor!.email != null && _visitor!.email!.isNotEmpty)
                        _InfoRow('Email', _visitor!.email!),
                      _InfoRow('Purpose of Visit', _visitor!.purposeOfVisit),
                      if (_visitor!.hostName != null && _visitor!.hostName!.isNotEmpty)
                        _InfoRow('Host / Officer', _visitor!.hostName!),
                      _InfoRow('Visit Date', DateFormat('yyyy-MM-dd HH:mm').format(_visitor!.visitDate)),
                      if (_visitor!.notes != null && _visitor!.notes!.isNotEmpty)
                        _InfoRow('Notes', _visitor!.notes!),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // QR Code Section
                  _QRCodeCard(visitor: _visitor!),
                  const SizedBox(height: 24),
                  
                  // Vehicle Section (if has vehicle)
                  if (_visitor!.hasVehicle) ...[
                    const Text('REGISTERED VEHICLE', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.directions_car, color: AppColors.primary, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _visitor!.vehiclePlate ?? 'NO PLATE',
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary, letterSpacing: 1),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  [
                                    if (_visitor!.vehicleColor != null && _visitor!.vehicleColor!.isNotEmpty) _visitor!.vehicleColor!,
                                    if (_visitor!.vehicleModel != null && _visitor!.vehicleModel!.isNotEmpty) _visitor!.vehicleModel!,
                                    'Car Details'
                                  ].join(' · '),
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  
                  // Activity History
                  const Text('ENTRY/EXIT HISTORY', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  if (_history.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No history found', style: TextStyle(color: AppColors.textMuted)),
                      ),
                    )
                  else
                    ..._history.map((log) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: (log.isEntry ? AppColors.success : AppColors.warning).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Icon(
                                    log.isEntry ? Icons.login : Icons.logout,
                                    color: log.isEntry ? AppColors.success : AppColors.warning,
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${log.action.toUpperCase()} · ${log.gate}',
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary),
                                      ),
                                      Text(
                                        'by ${log.guardName ?? 'System'}',
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  DateFormat('MMM d\nHH:mm').format(log.timestamp),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QRCodeCard extends StatelessWidget {
  final VisitorModel visitor;
  const _QRCodeCard({required this.visitor});

  @override
  Widget build(BuildContext context) {
    // Generate verification link QR matching web app:
    // http://<client-host>/verify/<visitorId>
    final baseUrl = AppConstants.baseUrl.replaceAll('/api', '');
    final qrData = '$baseUrl/verify/${visitor.visitorId}';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('IDENTIFICATION QR', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w800)),
              Icon(Icons.qr_code_2, size: 16, color: AppColors.primary.withOpacity(0.5)),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: AppColors.primary.withOpacity(0.1), blurRadius: 20, spreadRadius: 2),
              ],
            ),
            child: QrImageView(
              data: qrData,
              version: QrVersions.auto,
              size: 180.0,
              gapless: false,
              eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Colors.black),
              dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Colors.black),
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 2, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
          Expanded(flex: 3, child: Text(value, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}
