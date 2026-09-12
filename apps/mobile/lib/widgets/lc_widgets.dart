import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

class LcCard extends StatelessWidget {
  const LcCard({super.key, required this.child, this.padding, this.onTap});

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final card = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: padding ?? const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(LcTokens.radius),
        border: Border.all(color: colors.line),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(LcTokens.radius),
        child: card,
      ),
    );
  }
}

class LcChip extends StatelessWidget {
  const LcChip({super.key, required this.label, this.tone = ChipTone.neutral});

  final String label;
  final ChipTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final Color fg = switch (tone) {
      ChipTone.accent => Theme.of(context).colorScheme.primary,
      ChipTone.success => colors.success,
      ChipTone.warn => colors.warn,
      ChipTone.neutral => colors.muted,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: fg.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }
}

enum ChipTone { neutral, accent, success, warn }

class LcMark extends StatelessWidget {
  const LcMark({super.key, this.size = 36});
  final double size;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      child: Text(
        'L',
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: size * 0.48,
          color: accent,
          letterSpacing: -0.6,
        ),
      ),
    );
  }
}

class LcSection extends StatelessWidget {
  const LcSection({super.key, required this.title, this.action});
  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 10),
      child: Row(
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.2,
              color: LcColors.of(context).muted,
            ),
          ),
          const Spacer(),
          if (action != null) action!,
        ],
      ),
    );
  }
}

class LcSkeleton extends StatelessWidget {
  const LcSkeleton({super.key, this.height = 88});
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: LcColors.of(context).panel,
        borderRadius: BorderRadius.circular(LcTokens.radius),
      ),
    );
  }
}
