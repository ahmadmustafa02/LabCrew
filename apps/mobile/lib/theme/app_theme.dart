import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

abstract final class LcTheme {
  static ThemeData light() => _build(
        brightness: Brightness.light,
        bg: LcTokens.bgLight,
        surface: LcTokens.surfaceLight,
        elevated: LcTokens.elevatedLight,
        ink: LcTokens.inkLight,
        muted: LcTokens.mutedLight,
        line: LcTokens.lineLight,
        accent: LcTokens.accentLight,
        accentSoft: LcTokens.accentSoftLight,
        success: LcTokens.successLight,
        warn: LcTokens.warnLight,
        danger: LcTokens.dangerLight,
        panel: LcTokens.panelLight,
        overlay: SystemUiOverlayStyle.dark,
      );

  static ThemeData dark() => _build(
        brightness: Brightness.dark,
        bg: LcTokens.bgDark,
        surface: LcTokens.surfaceDark,
        elevated: LcTokens.elevatedDark,
        ink: LcTokens.inkDark,
        muted: LcTokens.mutedDark,
        line: LcTokens.lineDark,
        accent: LcTokens.accentDark,
        accentSoft: LcTokens.accentSoftDark,
        success: LcTokens.successDark,
        warn: LcTokens.warnDark,
        danger: LcTokens.dangerDark,
        panel: LcTokens.panelDark,
        overlay: SystemUiOverlayStyle.light,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color bg,
    required Color surface,
    required Color elevated,
    required Color ink,
    required Color muted,
    required Color line,
    required Color accent,
    required Color accentSoft,
    required Color success,
    required Color warn,
    required Color danger,
    required Color panel,
    required SystemUiOverlayStyle overlay,
  }) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: accent,
      onPrimary: brightness == Brightness.dark ? LcTokens.bgDark : Colors.white,
      secondary: accent,
      onSecondary: Colors.white,
      error: danger,
      onError: Colors.white,
      surface: surface,
      onSurface: ink,
      outline: line,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
    );

    return base.copyWith(
      scaffoldBackgroundColor: bg,
      canvasColor: bg,
      cardColor: surface,
      dividerColor: line,
      splashFactory: InkRipple.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: overlay,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: ink,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: accentSoft,
        elevation: 0,
        height: 72,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? accent : muted,
          );
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: panel,
        hintStyle: TextStyle(color: muted),
        labelStyle: TextStyle(color: muted, fontWeight: FontWeight.w500),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: accent, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: danger),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 54),
          backgroundColor: accent,
          foregroundColor: scheme.onPrimary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 54),
          foregroundColor: ink,
          side: BorderSide(color: line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: elevated,
        contentTextStyle: TextStyle(color: ink),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      extensions: [
        LcColors(
          muted: muted,
          line: line,
          accentSoft: accentSoft,
          success: success,
          warn: warn,
          danger: danger,
          panel: panel,
          elevated: elevated,
        ),
      ],
    );
  }
}

class LcColors extends ThemeExtension<LcColors> {
  const LcColors({
    required this.muted,
    required this.line,
    required this.accentSoft,
    required this.success,
    required this.warn,
    required this.danger,
    required this.panel,
    required this.elevated,
  });

  final Color muted;
  final Color line;
  final Color accentSoft;
  final Color success;
  final Color warn;
  final Color danger;
  final Color panel;
  final Color elevated;

  static LcColors of(BuildContext context) => Theme.of(context).extension<LcColors>()!;

  @override
  LcColors copyWith({
    Color? muted,
    Color? line,
    Color? accentSoft,
    Color? success,
    Color? warn,
    Color? danger,
    Color? panel,
    Color? elevated,
  }) {
    return LcColors(
      muted: muted ?? this.muted,
      line: line ?? this.line,
      accentSoft: accentSoft ?? this.accentSoft,
      success: success ?? this.success,
      warn: warn ?? this.warn,
      danger: danger ?? this.danger,
      panel: panel ?? this.panel,
      elevated: elevated ?? this.elevated,
    );
  }

  @override
  LcColors lerp(ThemeExtension<LcColors>? other, double t) {
    if (other is! LcColors) return this;
    return LcColors(
      muted: Color.lerp(muted, other.muted, t)!,
      line: Color.lerp(line, other.line, t)!,
      accentSoft: Color.lerp(accentSoft, other.accentSoft, t)!,
      success: Color.lerp(success, other.success, t)!,
      warn: Color.lerp(warn, other.warn, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      panel: Color.lerp(panel, other.panel, t)!,
      elevated: Color.lerp(elevated, other.elevated, t)!,
    );
  }
}
