import 'package:flutter/material.dart';

import '../state/session.dart';
import '../theme/app_theme.dart';
import '../widgets/lc_widgets.dart';

class YouScreen extends StatelessWidget {
  const YouScreen({super.key, required this.session});
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final user = session.user;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      children: [
        Text(
          'You',
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.8,
          ),
        ),
        const SizedBox(height: 16),
        LcCard(
          child: Row(
            children: [
              const LcMark(size: 52),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user?.name ?? 'Student', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                    const SizedBox(height: 4),
                    Text(user?.email ?? '', style: TextStyle(color: colors.muted, fontSize: 13)),
                    const SizedBox(height: 6),
                    Text(
                      user?.organizationName ?? '',
                      style: TextStyle(color: colors.muted, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const LcSection(title: 'APPEARANCE'),
        LcCard(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Column(
            children: [
              for (final mode in ThemeModePref.values)
                RadioListTile<ThemeModePref>(
                  value: mode,
                  groupValue: session.theme,
                  onChanged: (v) {
                    if (v != null) session.setTheme(v);
                  },
                  title: Text(switch (mode) {
                    ThemeModePref.system => 'Match system',
                    ThemeModePref.light => 'Light',
                    ThemeModePref.dark => 'Dark',
                  }),
                ),
            ],
          ),
        ),
        const LcSection(title: 'THIS DEVICE'),
        LcCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(session.demoMode ? 'Preview catalog' : 'Signed in to ${session.api.baseUrl}'),
              const SizedBox(height: 8),
              Text(
                '${session.drafts.length} offline draft${session.drafts.length == 1 ? '' : 's'}. Server wins on conflict — you choose keep mine or view theirs.',
                style: TextStyle(color: colors.muted, height: 1.45),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        OutlinedButton(
          onPressed: () async {
            final ok = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Sign out?'),
                content: const Text('Drafts stay on this phone until you clear app data.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                  FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
                ],
              ),
            );
            if (ok == true) await session.logout();
          },
          child: const Text('Sign out'),
        ),
      ],
    );
  }
}
