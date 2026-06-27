// lib/screens/reports_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final _api = ApiService();
  bool _loading = true;
  Map<String, dynamic>? _report;

  late DateTime _start;
  late DateTime _end;
  String _type = '';
  String _gate = '';
  String _action = '';
  String _isAuthorized = '';

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _start = DateTime(now.year, now.month, now.day);
    _end = _start;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final res = await _api.getReportRange(
        startDate: _fmtDate(_start),
        endDate: _fmtDate(_end),
        type: _type.isEmpty ? null : _type,
        gate: _gate.isEmpty ? null : _gate,
        action: _action.isEmpty ? null : _action,
        isAuthorized: _isAuthorized.isEmpty ? null : _isAuthorized,
      );
      if (mounted) setState(() { _report = res; _loading = false; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _report = {
            'summary': {'total': 0, 'entries': 0, 'exits': 0, 'personnel': 0, 'vehicles': 0, 'visitors': 0, 'unauthorized': 0},
            'logs': [],
            'trendData': [],
            'gateData': [],
            'isSingleDay': true,
          };
        });
      }
    }
  }

  void _resetFilters() {
    final now = DateTime.now();
    setState(() {
      _start = DateTime(now.year, now.month, now.day);
      _end = _start;
      _type = '';
      _gate = '';
      _action = '';
      _isAuthorized = '';
    });
    _load();
  }

  void _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _start, end: _end),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(primary: AppColors.primary, surface: AppColors.surface),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() { _start = picked.start; _end = picked.end; });
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _report?['summary'] as Map<String, dynamic>?;
    final logs = (_report?['logs'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final trendData = (_report?['trendData'] as List?) ?? [];
    final gateData = (_report?['gateData'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('ACTIVITY REPORTS'),
        actions: [
          IconButton(icon: const Icon(Icons.calendar_month), onPressed: _selectDateRange),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _PeriodBanner(start: _start, end: _end),
                    const SizedBox(height: 16),
                    _buildFilters(),
                    const SizedBox(height: 16),
                    if (summary != null) ...[
                      _buildSummary(summary),
                      const SizedBox(height: 20),
                    ],
                    if (logs.isNotEmpty) ...[
                      if (trendData.isNotEmpty) ...[
                        _SectionTitle('MOVEMENT TREND'),
                        const SizedBox(height: 10),
                        _buildTrendChart(trendData),
                        const SizedBox(height: 20),
                      ],
                      if (gateData.isNotEmpty) ...[
                        _SectionTitle('TRAFFIC BY GATE'),
                        const SizedBox(height: 10),
                        _buildGateChart(gateData),
                        const SizedBox(height: 20),
                      ],
                    ],
                    _SectionTitle('ACCESS MOVEMENT LEDGER (${logs.length})'),
                    const SizedBox(height: 10),
                    if (logs.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: _cardDeco(),
                        child: const Center(
                          child: Text('No records match the selected filters.',
                              style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        ),
                      )
                    else
                      ...logs.map((log) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _ReportLogCard(log: log),
                          )),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: _cardDeco(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('FILTERS', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _filterDropdown('Type', _type, const ['', 'Personnel', 'Vehicle', 'Visitor'], (v) => setState(() => _type = v ?? ''))),
            const SizedBox(width: 8),
            Expanded(child: _filterDropdown('Action', _action, const ['', 'Entry', 'Exit'], (v) => setState(() => _action = v ?? ''))),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: _filterDropdown('Gate', _gate, ['', ...AppConstants.gates], (v) => setState(() => _gate = v ?? ''))),
            const SizedBox(width: 8),
            Expanded(child: _filterDropdown('Auth', _isAuthorized, const ['', 'true', 'false'], (v) => setState(() => _isAuthorized = v ?? ''), labels: const {'': 'All', 'true': 'Authorized', 'false': 'Unauthorized'})),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.analytics_outlined, size: 16),
                label: const Text('GENERATE REPORT'),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(onPressed: _resetFilters, child: const Text('RESET')),
          ]),
        ],
      ),
    );
  }

  Widget _filterDropdown(String label, String value, List<String> options, ValueChanged<String?> onChanged, {Map<String, String>? labels}) {
    return DropdownButtonFormField<String>(
      value: value,
      dropdownColor: AppColors.surfaceVariant,
      decoration: InputDecoration(labelText: label, isDense: true),
      items: options.map((o) => DropdownMenuItem(value: o, child: Text(labels?[o] ?? (o.isEmpty ? 'All' : o), style: const TextStyle(fontSize: 12)))).toList(),
      onChanged: onChanged,
    );
  }

  Widget _buildSummary(Map<String, dynamic> s) {
    final items = [
      ('TOTAL', s['total'], AppColors.textPrimary),
      ('ENTRIES', s['entries'], AppColors.success),
      ('EXITS', s['exits'], AppColors.warning),
      ('PERSONNEL', s['personnel'], AppColors.primary),
      ('VEHICLES', s['vehicles'], AppColors.secondary),
      ('VISITORS', s['visitors'], AppColors.accent),
      ('VIOLATIONS', s['unauthorized'], AppColors.danger),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items.map((item) {
        final (label, val, color) = item;
        return SizedBox(
          width: (MediaQuery.of(context).size.width - 48) / 3,
          child: _SummaryBox(label, '${val ?? 0}', color),
        );
      }).toList(),
    );
  }

  Widget _buildTrendChart(List trendData) {
    return Container(
      height: 200,
      padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
      decoration: _cardDeco(),
      child: LineChart(LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: trendData.asMap().entries.map((e) => FlSpot(e.key.toDouble(), (e.value['entries'] as num? ?? 0).toDouble())).toList(),
            isCurved: true, color: AppColors.success, barWidth: 2, dotData: const FlDotData(show: false),
          ),
          LineChartBarData(
            spots: trendData.asMap().entries.map((e) => FlSpot(e.key.toDouble(), (e.value['exits'] as num? ?? 0).toDouble())).toList(),
            isCurved: true, color: AppColors.warning, barWidth: 2, dotData: const FlDotData(show: false),
          ),
        ],
      )),
    );
  }

  Widget _buildGateChart(List gateData) {
    return Container(
      height: 180,
      padding: const EdgeInsets.all(16),
      decoration: _cardDeco(),
      child: BarChart(BarChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: gateData.asMap().entries.map((e) {
          final colors = [AppColors.primary, AppColors.secondary, AppColors.success, AppColors.warning, AppColors.accent];
          return BarChartGroupData(
            x: e.key,
            barRods: [BarChartRodData(toY: (e.value['count'] as num? ?? 0).toDouble(), color: colors[e.key % colors.length], width: 16, borderRadius: BorderRadius.circular(4))],
          );
        }).toList(),
      )),
    );
  }

  BoxDecoration _cardDeco() => BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      );
}

class _ReportLogCard extends StatelessWidget {
  final Map<String, dynamic> log;
  const _ReportLogCard({required this.log});

  String _val(String? v) => (v == null || v.isEmpty || v == '--') ? '—' : v;

  Color _typeColor(String? type) {
    switch (type) {
      case 'Personnel': return AppColors.primary;
      case 'Vehicle': return AppColors.success;
      case 'Visitor': return AppColors.accent;
      default: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final createdAt = log['createdAt'] != null ? DateTime.tryParse(log['createdAt']) : null;
    final isEntry = (log['action'] ?? '').toString() == 'Entry';
    final type = log['type']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: _typeColor(type).withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
            child: Text(type.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _typeColor(type))),
          ),
          const SizedBox(width: 8),
          Text(isEntry ? '▲ ENTRY' : '▼ EXIT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: isEntry ? AppColors.success : AppColors.warning)),
          const Spacer(),
          if (createdAt != null)
            Text(DateFormat('yyyy-MM-dd HH:mm').format(createdAt), style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        ]),
        const SizedBox(height: 8),
        Text(log['subjectName']?.toString() ?? '—', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        _detailRow('Vehicle Name', _val(log['vehicleName']?.toString())),
        _detailRow('Owner Name', _val(log['ownerName']?.toString())),
        _detailRow('Plate Number', _val(log['plateNumber']?.toString())),
        _detailRow('Record ID', _val(log['recordId']?.toString())),
        _detailRow('Driver', _val(log['driverName']?.toString())),
        _detailRow('Gate', log['gate']?.toString() ?? '—'),
        Row(children: [
          const Text('Authorized: ', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
          Text(log['isAuthorized'] == false ? 'NO' : 'YES',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: log['isAuthorized'] == false ? AppColors.danger : AppColors.success)),
        ]),
        if (log['logId'] != null) ...[
          const SizedBox(height: 4),
          Text(log['logId'].toString(), style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        ],
      ]),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 90, child: Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted))),
            Expanded(child: Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary))),
          ],
        ),
      );
}

class _PeriodBanner extends StatelessWidget {
  final DateTime start, end;
  const _PeriodBanner({required this.start, required this.end});
  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM yyyy');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary.withOpacity(0.25)),
      ),
      child: Row(children: [
        const Icon(Icons.date_range, color: AppColors.primary, size: 16),
        const SizedBox(width: 10),
        Text('${fmt.format(start)}  →  ${fmt.format(end)}',
            style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
      ]),
    );
  }
}

class _SummaryBox extends StatelessWidget {
  final String label, value;
  final Color color;
  const _SummaryBox(this.label, this.value, this.color);
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(children: [
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 7, color: AppColors.textMuted, letterSpacing: 0.5), textAlign: TextAlign.center),
        ]),
      );
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);
  @override
  Widget build(BuildContext context) => Text(title,
      style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.bold));
}
