import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme/app_theme.dart';
import '../widgets/lc_widgets.dart';

class CollectScreen extends StatelessWidget {
  const CollectScreen({
    super.key,
    required this.session,
    required this.onOpenTask,
  });

  final SessionController session;
  final void Function(FieldTask task) onOpenTask;

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final list = session.collectTasks;

    return RefreshIndicator(
      onRefresh: session.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          Text(
            'Collect',
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Schema-validated rows. Cleaned on the server. Visible here as your own series.',
            style: TextStyle(color: colors.muted, height: 1.45),
          ),
          const SizedBox(height: 20),
          if (list.isEmpty)
            LcCard(
              child: Text(
                'No collection assignments yet. Your director attaches a data schema on the web app.',
                style: TextStyle(color: colors.muted, height: 1.45),
              ),
            )
          else
            ...list.map(
              (task) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: LcCard(
                  onTap: () => onOpenTask(task),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              task.title,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                            ),
                          ),
                          if (session.drafts.containsKey(task.id))
                            const LcChip(label: 'Draft', tone: ChipTone.warn)
                          else
                            LcChip(
                              label: task.submitted ? 'Submitted' : 'Ready',
                              tone: task.submitted ? ChipTone.success : ChipTone.accent,
                            ),
                        ],
                      ),
                      if (task.description != null && task.description!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          task.description!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: colors.muted, height: 1.4),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (task.dueAt != null)
                            LcChip(label: DateFormat.MMMd().format(task.dueAt!.toLocal())),
                          if (task.columns.isNotEmpty)
                            LcChip(label: '${task.columns.length} fields'),
                          if (task.requireData) const LcChip(label: 'Data required', tone: ChipTone.warn),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
