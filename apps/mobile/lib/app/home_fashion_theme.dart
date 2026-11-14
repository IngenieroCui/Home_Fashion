import 'package:flutter/material.dart';

/// Home Fashion brand palette, shared with the web tokens (apps/web/src/app/tokens.css).
abstract final class HfColors {
  static const obsidian = Color(0xFF111111);
  static const graphite = Color(0xFF2B2B2B);
  static const softWhite = Color(0xFFF8F8F6);
  static const lightGray = Color(0xFFD9D9D6);
  static const electricBlue = Color(0xFF2F6BFF);

  /// Action fill: brand blue adjusted to 4.83:1 with white text.
  static const actionBlue = Color(0xFF2C66F7);
  static const coral = Color(0xFFFF6B4A);
  static const amber = Color(0xFFF4B63D);
  static const emerald = Color(0xFF11A683);
}

/// Semantic status tones. Light values keep WCAG AA (≥ 4.5:1) on their 12 % tint.
@immutable
class HfStatusColors extends ThemeExtension<HfStatusColors> {
  const HfStatusColors({
    required this.success,
    required this.warning,
    required this.danger,
    required this.info,
    required this.accent,
    required this.heroBackground,
    required this.heroForeground,
    required this.heroMuted,
  });

  final Color success;
  final Color warning;
  final Color danger;
  final Color info;
  final Color accent;
  final Color heroBackground;
  final Color heroForeground;
  final Color heroMuted;

  static const light = HfStatusColors(
    success: Color(0xFF0B7A60),
    warning: Color(0xFF7A5200),
    danger: Color(0xFFB42318),
    info: Color(0xFF1F4FD6),
    accent: Color(0xFFB53A1E),
    heroBackground: HfColors.obsidian,
    heroForeground: Color(0xFFFFFFFF),
    heroMuted: Color(0xFFB5B5B1),
  );

  static const dark = HfStatusColors(
    success: Color(0xFF4FD1AE),
    warning: HfColors.amber,
    danger: Color(0xFFFF8A80),
    info: Color(0xFF8DB0FF),
    accent: Color(0xFFFF8F75),
    heroBackground: Color(0xFF1C1C1C),
    heroForeground: Color(0xFFF2F2F0),
    heroMuted: Color(0xFFA3A3A0),
  );

  static HfStatusColors of(BuildContext context) =>
      Theme.of(context).extension<HfStatusColors>() ?? light;

  @override
  HfStatusColors copyWith({
    Color? success,
    Color? warning,
    Color? danger,
    Color? info,
    Color? accent,
    Color? heroBackground,
    Color? heroForeground,
    Color? heroMuted,
  }) =>
      HfStatusColors(
        success: success ?? this.success,
        warning: warning ?? this.warning,
        danger: danger ?? this.danger,
        info: info ?? this.info,
        accent: accent ?? this.accent,
        heroBackground: heroBackground ?? this.heroBackground,
        heroForeground: heroForeground ?? this.heroForeground,
        heroMuted: heroMuted ?? this.heroMuted,
      );

  @override
  HfStatusColors lerp(ThemeExtension<HfStatusColors>? other, double t) {
    if (other is! HfStatusColors) return this;
    return HfStatusColors(
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      info: Color.lerp(info, other.info, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      heroBackground: Color.lerp(heroBackground, other.heroBackground, t)!,
      heroForeground: Color.lerp(heroForeground, other.heroForeground, t)!,
      heroMuted: Color.lerp(heroMuted, other.heroMuted, t)!,
    );
  }
}

const _lightScheme = ColorScheme(
  brightness: Brightness.light,
  primary: HfColors.actionBlue,
  onPrimary: Color(0xFFFFFFFF),
  primaryContainer: Color(0xFFEAF0FF),
  onPrimaryContainer: Color(0xFF0A2A80),
  secondary: HfColors.obsidian,
  onSecondary: Color(0xFFFFFFFF),
  secondaryContainer: Color(0xFFE9E9E5),
  onSecondaryContainer: HfColors.obsidian,
  tertiary: Color(0xFFB53A1E),
  onTertiary: Color(0xFFFFFFFF),
  tertiaryContainer: Color(0xFFFFEDE8),
  onTertiaryContainer: Color(0xFF6E1E0C),
  error: Color(0xFFB42318),
  onError: Color(0xFFFFFFFF),
  errorContainer: Color(0xFFFDECEA),
  onErrorContainer: Color(0xFF7A1A12),
  surface: Color(0xFFFFFFFF),
  onSurface: HfColors.obsidian,
  onSurfaceVariant: Color(0xFF5C5C59),
  surfaceContainerLowest: Color(0xFFFFFFFF),
  surfaceContainerLow: HfColors.softWhite,
  surfaceContainer: Color(0xFFF0F0ED),
  surfaceContainerHigh: Color(0xFFE9E9E5),
  surfaceContainerHighest: Color(0xFFE2E2DE),
  outline: Color(0xFFB9B9B5),
  outlineVariant: HfColors.lightGray,
  inverseSurface: HfColors.obsidian,
  onInverseSurface: Color(0xFFF2F2F0),
  inversePrimary: Color(0xFF8DB0FF),
  shadow: Color(0xFF000000),
  scrim: Color(0xFF000000),
);

const _darkScheme = ColorScheme(
  brightness: Brightness.dark,
  primary: Color(0xFF7FA3FF),
  onPrimary: Color(0xFF0B1B47),
  primaryContainer: Color(0xFF1B3A99),
  onPrimaryContainer: Color(0xFFE2EAFF),
  secondary: Color(0xFFF2F2F0),
  onSecondary: HfColors.obsidian,
  secondaryContainer: Color(0xFF2E2E2E),
  onSecondaryContainer: Color(0xFFF2F2F0),
  tertiary: Color(0xFFFF8F75),
  onTertiary: Color(0xFF3D0D02),
  tertiaryContainer: Color(0xFF5C1F10),
  onTertiaryContainer: Color(0xFFFFDAD1),
  error: Color(0xFFFF8A80),
  onError: Color(0xFF3B0905),
  errorContainer: Color(0xFF5C1712),
  onErrorContainer: Color(0xFFFFDAD6),
  surface: Color(0xFF151515),
  onSurface: Color(0xFFF2F2F0),
  onSurfaceVariant: Color(0xFFB5B5B1),
  surfaceContainerLowest: Color(0xFF0C0C0C),
  surfaceContainerLow: Color(0xFF1A1A1A),
  surfaceContainer: Color(0xFF202020),
  surfaceContainerHigh: Color(0xFF262626),
  surfaceContainerHighest: Color(0xFF2E2E2E),
  outline: Color(0xFF6B6B68),
  outlineVariant: Color(0xFF3A3A38),
  inverseSurface: Color(0xFFF2F2F0),
  onInverseSurface: HfColors.obsidian,
  inversePrimary: HfColors.actionBlue,
  shadow: Color(0xFF000000),
  scrim: Color(0xFF000000),
);

ThemeData buildHomeFashionTheme(Brightness brightness) {
  final isLight = brightness == Brightness.light;
  final scheme = isLight ? _lightScheme : _darkScheme;
  final background = isLight ? HfColors.softWhite : const Color(0xFF0C0C0C);
  final base = isLight
      ? Typography.material2021().black
      : Typography.material2021().white;
  final textTheme = base
      .apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface)
      .copyWith(
        headlineSmall: base.headlineSmall
            ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.3),
        titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      );
  final radius12 = BorderRadius.circular(12);
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    extensions: [isLight ? HfStatusColors.light : HfStatusColors.dark],
    scaffoldBackgroundColor: background,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    textTheme: textTheme,
    dividerTheme: DividerThemeData(color: scheme.outlineVariant, space: 24),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: scheme.inverseSurface,
      contentTextStyle: TextStyle(color: scheme.onInverseSurface),
      shape: RoundedRectangleBorder(borderRadius: radius12),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: scheme.surface,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: const Size(48, 48))),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: scheme.onSurface,
        side: BorderSide(color: scheme.outline),
        shape: RoundedRectangleBorder(borderRadius: radius12),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: isLight ? const Color(0xFF2458E6) : scheme.primary,
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        shape: RoundedRectangleBorder(borderRadius: radius12),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      backgroundColor: scheme.surface,
      selectedColor: scheme.primaryContainer,
      checkmarkColor: scheme.onPrimaryContainer,
      labelStyle:
          TextStyle(color: scheme.onSurface, fontWeight: FontWeight.w600),
      secondaryLabelStyle: TextStyle(
          color: scheme.onPrimaryContainer, fontWeight: FontWeight.w700),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: scheme.primary,
      linearTrackColor: scheme.surfaceContainerHighest,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: background,
      surfaceTintColor: Colors.transparent,
      foregroundColor: scheme.onSurface,
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      titleTextStyle: TextStyle(
          color: scheme.onSurface, fontSize: 20, fontWeight: FontWeight.w800),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: scheme.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: false,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: scheme.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surfaceContainerLowest,
      border: OutlineInputBorder(borderRadius: radius12),
      enabledBorder: OutlineInputBorder(
          borderRadius: radius12,
          borderSide: BorderSide(color: scheme.outline)),
      focusedBorder: OutlineInputBorder(
          borderRadius: radius12,
          borderSide: BorderSide(color: scheme.primary, width: 2)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );
}
