import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Tema global. El Inicio pinta sus superficies con [AppColors] directamente;
/// este tema fija el scaffold, el color de selección y el splash/ripple.
abstract final class AppTheme {
  static ThemeData dark() => _build(Brightness.dark, AppColors.navy);
  static ThemeData light() => _build(Brightness.light, AppColors.offWhite);

  static ThemeData _build(Brightness brightness, Color scaffold) {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.turquoise,
      brightness: brightness,
    ).copyWith(
      primary: AppColors.turquoise,
      secondary: AppColors.yellow,
      error: AppColors.coralAccessible,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scaffold,
      splashColor: AppColors.turquoise.withValues(alpha: 0.10),
      highlightColor: AppColors.turquoise.withValues(alpha: 0.06),
      // Objetivo táctil mínimo por accesibilidad.
      materialTapTargetSize: MaterialTapTargetSize.padded,
    );
  }
}
