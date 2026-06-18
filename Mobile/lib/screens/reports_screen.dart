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
  Map<String, dynamic>? _data;
  DateTime _start = DateTime.now().subtract(const Duration(days: 7));
  DateTime _end = DateTime.now();

  // Registration filter
  String _regFilter = 'all'; // all | military | civilian | contractor | visitor

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final res = await _api.getReport(
        startDate: _start.toIso8601String(),
        endDate: _end.toIso8601String(),
      );
      if (mounted) setState(() { _data = res; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────
  List<Map<String, dynamic>> get _filteredPersonnel {
    final list = (_data!['registrations']['personnel'] as List)
        .cast<Map<String, dynamic>>();
    if (_regFilter == 'all') return list;
    return list.where((p) => p['category'] == _regFilter).toList();
  }

  Color _categoryColor(String? cat) {
    switch (cat) {
      case 'military':    return AppColors.primary;
      case 'civilian':    return AppColors.secondary;
      case 'contractor':  return AppColors.warning;
      case 'visitor':     return AppColors.accent;
      default:            return AppColors.textMuted;
    }
  }

  // ─── Build ────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
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
        : _data == null
          ? const Center(child: Text('Failed to load report data'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [

                  // ── Date period banner ────────────────────────
                  _PeriodBanner(start: _start, end: _end),
                  const SizedBox(height: 20),

                  // ── Summary row 1: entry/exit stats ──────────
                  _SectionTitle('ENTRY / EXIT ACTIVITY'),
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(child: _SummaryBox('TOTAL LOGS',  '${_data!['summary']['total']}',       AppColors.primary)),
                    const SizedBox(width: 10),
                    Expanded(child: _SummaryBox('DENIED',      '${_data!['summary']['denied']}',      AppColors.danger)),
                    const SizedBox(width: 10),
                    Expanded(child: _SummaryBox('FLAGGED',     '${_data!['summary']['flagged']}',     AppColors.warning)),
                  ]),
                  const SizedBox(height: 10),

                  // ── Summary row 2: registration stats ─────────
                  Row(children: [
                    Expanded(child: _SummaryBox('NEW PERSONNEL', '${_data!['summary']['newPersonnel']}', AppColors.success)),
                    const SizedBox(width: 10),
                    Expanded(child: _SummaryBox('NEW VEHICLES',  '${_data!['summary']['newVehicles']}',  AppColors.secondary)),
                    const SizedBox(width: 10),
                    const Expanded(child: SizedBox()),
                  ]),
                  const SizedBox(height: 24),

                  // ── Gate Activity Chart ───────────────────────
                  _SectionTitle('ACTIVITY BY GATE'),
                  const SizedBox(height: 12),
                  _buildGateChart(),
                  const SizedBox(height: 24),

                  // ── Daily Trend Chart ─────────────────────────
                  _SectionTitle('DAILY TREND'),
                  const SizedBox(height: 12),
                  _buildDailyChart(),
                  const SizedBox(height: 28),

                  // ── Recent Registrations ──────────────────────
                  _buildRegistrationsSection(),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  // ─── Gate Chart ───────────────────────────────────────────────
  Widget _buildGateChart() {
    final list = (_data!['charts']['byGate'] as List);
    if (list.isEmpty) return _emptyChart('No entry log data for this period');
    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: _cardDeco(),
      child: PieChart(PieChartData(
        sections: list.asMap().entries.map((e) {
          final colors = [AppColors.primary, AppColors.secondary, AppColors.success, AppColors.warning, AppColors.accent];
          return PieChartSectionData(
            color: colors[e.key % colors.length],
            value: (e.value['count'] as int).toDouble(),
            title: '${e.value['count']}',
            radius: 50,
            titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            badgeWidget: Text(e.value['_id'] ?? 'Other', style: const TextStyle(fontSize: 8, color: AppColors.textMuted)),
            badgePositionPercentageOffset: 1.4,
          );
        }).toList(),
      )),
    );
  }

  // ─── Daily Chart ──────────────────────────────────────────────
  Widget _buildDailyChart() {
    final list = (_data!['charts']['daily'] as List);
    if (list.isEmpty) return _emptyChart('No daily data for this period');
    return Container(
      height: 250,
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
      decoration: _cardDeco(),
      child: LineChart(LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: list.asMap().entries.map((e) => FlSpot(e.key.toDouble(), (e.value['entries'] as int).toDouble())).toList(),
            isCurved: true, color: AppColors.success, barWidth: 3, dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: true, color: AppColors.success.withOpacity(0.1)),
          ),
          LineChartBarData(
            spots: list.asMap().entries.map((e) => FlSpot(e.key.toDouble(), (e.value['exits'] as int).toDouble())).toList(),
            isCurved: true, color: AppColors.warning, barWidth: 3, dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: true, color: AppColors.warning.withOpacity(0.1)),
          ),
        ],
      )),
    );
  }

  // ─── Registrations Section ────────────────────────────────────
  Widget _buildRegistrationsSection() {
    final total = (_data!['registrations']['personnel'] as List).length;
    final filtered = _filteredPersonnel;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Header
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(children: [
            _SectionTitle('RECENT REGISTRATIONS'),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('$total',
                style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w700)),
            ),
          ]),
        ],
      ),
      const SizedBox(height: 10),

      // Category filter chips
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          for (final f in ['all', 'military', 'civilian', 'contractor', 'visitor'])
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _FilterChip(
                label: f.toUpperCase(),
                selected: _regFilter == f,
                color: f == 'all' ? AppColors.primary : _categoryColor(f),
                onTap: () => setState(() => _regFilter = f),
              ),
            ),
        ]),
      ),
      const SizedBox(height: 12),

      // List
      if (filtered.isEmpty)
        Container(
          padding: const EdgeInsets.all(24),
          decoration: _cardDeco(),
          child: Column(children: [
            Icon(Icons.person_search, size: 40, color: AppColors.textMuted.withOpacity(0.4)),
            const SizedBox(height: 12),
            const Text('No registrations in this period',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ]),
        )
      else
        ...filtered.asMap().entries.map((entry) {
          final i = entry.key;
          final p = entry.value;
          final name = '${p['firstName']} ${p['lastName']}';
          final cat  = p['category'] as String? ?? 'military';
          final date = DateTime.tryParse(p['createdAt'] ?? '') ?? DateTime.now();
          final hasVehicle = p['hasVehicle'] == true;

          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: _cardDeco(),
              child: Row(children: [
                // Index number
                SizedBox(
                  width: 24,
                  child: Text('${i + 1}',
                    style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700,
                      color: AppColors.textMuted.withOpacity(0.5))),
                ),
                const SizedBox(width: 8),

                // Avatar / initials
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: _categoryColor(cat).withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${p['firstName']?[0] ?? '?'}${p['lastName']?[0] ?? ''}',
                      style: TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700,
                        color: _categoryColor(cat)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Name + details
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Flexible(
                      child: Text(name,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                        overflow: TextOverflow.ellipsis),
                    ),
                    if (hasVehicle) ...[
                      const SizedBox(width: 6),
                      const Tooltip(
                        message: 'Has registered vehicle',
                        child: Icon(Icons.directions_car, size: 13, color: AppColors.primary),
                      ),
                    ],
                  ]),
                  const SizedBox(height: 2),
                  Text('${p['rank'] ?? ''} · ${p['badgeNumber'] ?? ''}',
                    style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis),
                ])),

                const SizedBox(width: 10),

                // Right column: category badge + date
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: _categoryColor(cat).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _categoryColor(cat).withOpacity(0.3)),
                    ),
                    child: Text(cat.toUpperCase(),
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700,
                        color: _categoryColor(cat), letterSpacing: 0.5)),
                  ),
                  const SizedBox(height: 4),
                  Text(DateFormat('dd MMM').format(date),
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                  Text(DateFormat('HH:mm').format(date),
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                ]),
              ]),
            ),
          );
        }),
    ]);
  }

  // ─── Date picker ──────────────────────────────────────────────
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

  BoxDecoration _cardDeco() => BoxDecoration(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: AppColors.border),
  );

  Widget _emptyChart(String msg) => Container(
    padding: const EdgeInsets.all(24),
    decoration: _cardDeco(),
    child: Center(child: Text(msg, style: const TextStyle(color: AppColors.textMuted))),
  );
}

// ─── Shared widgets ───────────────────────────────────────────────────────────

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
  final String label, value; final Color color;
  const _SummaryBox(this.label, this.value, this.color);
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withOpacity(0.1),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withOpacity(0.3)),
    ),
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textMuted, letterSpacing: 1),
        textAlign: TextAlign.center),
    ]),
  );
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);
  @override Widget build(BuildContext context) => Text(title,
    style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.bold));
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: selected ? color.withOpacity(0.2) : AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: selected ? color : AppColors.border, width: selected ? 1.5 : 1),
      ),
      child: Text(label,
        style: TextStyle(
          fontSize: 10, fontWeight: FontWeight.w700,
          color: selected ? color : AppColors.textMuted,
          letterSpacing: 0.5,
        )),
    ),
  );
}
