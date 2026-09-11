import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme/app_theme.dart';
import '../widgets/lc_widgets.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.session,
    required this.onOpenCollect,
    required this.onOpenTask,
  });

  final SessionController session;
  final VoidCallback onOpenCollect;
  final void Function(FieldTask task) onOpenTask;

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final home = session.home;
    final name = session.user?.name.split(' ').first ?? 'there';

    return RefreshIndicator(
      onRefresh: session.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          Text(
            'Good to see you, $name',
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.7,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            session.user?.programName ?? 'Research cohort',
            style: TextStyle(color: colors.muted, fontSize: 15),
          ),
          const SizedBox(height: 22),
          if (home == null)
            const LcSkeleton(height: 140)
          else
            LcCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LcChip(label: 'Pace', tone: ChipTone.accent),
                  const SizedBox(height: 12),
                  Text(
                    home.headline,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(home.detail, style: TextStyle(color: colors.muted, height: 1.45)),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      _Stat(label: 'Turned in', value: '${home.submittedCount}'),
                      _Stat(label: 'Open', value: '${home.openCount}'),
                      _Stat(label: 'Streak', value: '${home.streak}'),
                    ],
                  ),
                ],
              ),
            ),
          if (home?.nextTitle != null) ...[
            const SizedBox(height: 14),
            LcCard(
              onTap: () {
                final id = home!.nextAssignmentId;
                if (id == null) return;
                for (final task in session.collectTasks) {
                  if (task.id == id) {
                    onOpenTask(task);
                    return;
                  }
                }
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LcChip(label: 'Do this next', tone: ChipTone.accent),
                  const SizedBox(height: 10),
                  Text(home!.nextTitle!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 6),
                  Text(home.nextReason ?? '', style: TextStyle(color: colors.muted, height: 1.45)),
                  if (home.nextKind == 'writeup' || home.nextKind == 'catalog') ...[
                    const SizedBox(height: 8),
                    Text(
                      'Open this on the lab website.',
                      style: TextStyle(color: colors.muted, fontSize: 13),
                    ),
                  ],
                ],
              ),
            ),
          ],
          if (home?.nudgeBody != null) ...[
            const SizedBox(height: 14),
            LcCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LcChip(label: 'From Coach'),
                  const SizedBox(height: 10),
                  Text(
                    home!.nudgeTitle ?? 'A note',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 6),
                  Text(home.nudgeBody!, style: TextStyle(color: colors.muted, height: 1.45)),
                ],
              ),
            ),
          ],
          LcSection(
            title: 'NEXT TO COLLECT',
            action: TextButton(onPressed: onOpenCollect, child: const Text('All')),
          ),
          if (session.collectTasks.isEmpty)
            LcCard(
              child: Text(
                'No field collection yet. Writeups stay on the website.',
                style: TextStyle(color: colors.muted, height: 1.45),
              ),
            ),
          ...session.collectTasks.take(3).map(
                (task) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: LcCard(
                    onTap: () => onOpenTask(task),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(task.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              const SizedBox(height: 4),
                              Text(
                                task.dueAt == null
                                    ? 'No due date'
                                    : 'Due ${DateFormat.MMMd().format(task.dueAt!.toLocal())}',
                                style: TextStyle(color: colors.muted, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        LcChip(
                          label: task.submitted ? 'In' : 'Open',
                          tone: task.submitted ? ChipTone.success : ChipTone.accent,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          if (session.drafts.isNotEmpty) ...[
            const LcSection(title: 'SAVED ON THIS PHONE'),
            LcCard(
              child: Text(
                '${session.drafts.length} draft${session.drafts.length == 1 ? '' : 's'} waiting to sync. Nothing is discarded if the server already has a newer version.',
                style: TextStyle(color: colors.muted, height: 1.45),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: LcColors.of(context).muted, fontSize: 12)),
        ],
      ),
    );
  }
}
