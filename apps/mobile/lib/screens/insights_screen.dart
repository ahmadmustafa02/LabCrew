import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme/app_theme.dart';
import '../widgets/lc_widgets.dart';

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen> {
  FieldTask? _task;
  List<CohortColumn> _columns = [];
  bool _loading = false;
  String? _error;

  List<FieldTask> get _eligible => widget.session.collectTasks;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _pickDefault());
  }

  Future<void> _pickDefault() async {
    if (_eligible.isEmpty) return;
    final preferred = widget.session.lastInsightTaskId;
    final task = _eligible.cast<FieldTask?>().firstWhere(
          (t) => t?.id == preferred,
          orElse: () => _eligible.first,
        );
    if (task != null) await _load(task);
  }

  Future<void> _load(FieldTask task) async {
    setState(() {
      _task = task;
      _loading = true;
      _error = null;
    });
    try {
      final cols = await widget.session.cohort(task);
      if (!mounted) return;
      setState(() {
        _columns = cols;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      children: [
        Text(
          'Insights',
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.8,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Your series vs the cohort mean — only when enough classmates have submitted.',
          style: TextStyle(color: colors.muted, height: 1.45),
        ),
        const SizedBox(height: 16),
        if (_eligible.isEmpty)
          LcCard(
            child: Text(
              'Charts appear after a collection assignment has numeric columns.',
              style: TextStyle(color: colors.muted),
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _eligible
                .map(
                  (t) => ChoiceChip(
                    label: Text(t.title),
                    selected: _task?.id == t.id,
                    onSelected: (_) => _load(t),
                  ),
                )
                .toList(),
          ),
        const SizedBox(height: 16),
        if (_loading) const LcSkeleton(height: 220),
        if (_error != null)
          LcCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_error!, style: TextStyle(color: colors.danger)),
                TextButton(onPressed: _task == null ? null : () => _load(_task!), child: const Text('Retry')),
              ],
            ),
          ),
        if (!_loading && _columns.isEmpty && _error == null && _task != null)
          LcCard(
            child: Text(
              'No numeric series yet. Submit a few rows on Collect, then pull to refresh.',
              style: TextStyle(color: colors.muted, height: 1.45),
            ),
          ),
        ..._columns.map((col) {
          final you = col.ownMean;
          final them = col.cohortMean;
          final groups = <_BarGroup>[
            if (you != null) _BarGroup('You', you, accent),
            if (them != null) _BarGroup('Cohort', them, colors.muted),
          ];
          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: LcCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(col.columnName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                  const SizedBox(height: 4),
                  Text(
                    them == null
                        ? 'Cohort mean hidden until enough people submit.'
                        : 'n = ${col.contributorCount}  ·  ${col.flaggedCount} flagged cells',
                    style: TextStyle(color: colors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  if (groups.isEmpty)
                    Text('No numeric values in this column yet.', style: TextStyle(color: colors.muted))
                  else
                    SizedBox(
                      height: 180,
                      child: Semantics(
                        label: '${col.columnName} comparison. Your mean ${you ?? 'n/a'}, cohort ${them ?? 'hidden'}.',
                        child: BarChart(
                          BarChartData(
                            alignment: BarChartAlignment.spaceAround,
                            gridData: FlGridData(
                              show: true,
                              drawVerticalLine: false,
                              getDrawingHorizontalLine: (_) => FlLine(color: colors.line, strokeWidth: 1),
                            ),
                            borderData: FlBorderData(show: false),
                            titlesData: FlTitlesData(
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              leftTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  reservedSize: 36,
                                  getTitlesWidget: (v, _) => Text(
                                    v.toStringAsFixed(0),
                                    style: TextStyle(fontSize: 10, color: colors.muted),
                                  ),
                                ),
                              ),
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  getTitlesWidget: (v, _) {
                                    final i = v.toInt();
                                    if (i < 0 || i >= groups.length) return const SizedBox.shrink();
                                    return Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(groups[i].label, style: TextStyle(fontSize: 12, color: colors.muted)),
                                    );
                                  },
                                ),
                              ),
                            ),
                            barGroups: [
                              for (var i = 0; i < groups.length; i++)
                                BarChartGroupData(
                                  x: i,
                                  barRods: [
                                    BarChartRodData(
                                      toY: groups[i].value,
                                      width: 28,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                                      color: groups[i].color,
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  if (col.ownValues.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Your values: ${col.ownValues.map((v) => v.toStringAsFixed(1)).join(' · ')}',
                      style: TextStyle(fontSize: 12, color: colors.muted, height: 1.4),
                    ),
                  ],
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _BarGroup {
  const _BarGroup(this.label, this.value, this.color);
  final String label;
  final double value;
  final Color color;
}
