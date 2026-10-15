import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Tipografía (espejo de la escala de `tokens.ts`).
///
/// Fuente recomendada: Hanken Grotesk (variable, distintiva, buenos numerales).
/// Evita Inter/Roboto/Plus Jakarta (sobreexpuestas). Para cambiarla, sustituir
/// únicamente [_base]. Todo monto debe usar [tabular] para numerales de ancho fijo.
abstract final class AppTextStyles {
  static TextStyle _base(double size, FontWeight weight, Color color) =>
      GoogleFonts.hankenGrotesk(
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: 1.15,
      );

  /// Numerales tabulares: evita saltos de ancho en columnas de dinero.
  static const List<FontFeature> tabular = [FontFeature.tabularFigures()];

  static TextStyle hero(Color c) => _base(46, FontWeight.w900, c)
      .copyWith(fontFeatures: tabular, letterSpacing: -0.5);
  static TextStyle h1(Color c) => _base(34, FontWeight.w900, c);
  static TextStyle h2(Color c) => _base(24, FontWeight.w900, c);
  static TextStyle h3(Color c) => _base(18, FontWeight.w800, c);
  static TextStyle body(Color c) => _base(15, FontWeight.w500, c)
      .copyWith(height: 1.4);
  static TextStyle small(Color c) => _base(13, FontWeight.w600, c);
  static TextStyle tiny(Color c) =>
      _base(11, FontWeight.w800, c).copyWith(letterSpacing: 0.6);

  /// Monto en una fila de lista / tarjeta.
  static TextStyle amount(Color c) =>
      _base(18, FontWeight.w900, c).copyWith(fontFeatures: tabular);

  static TextStyle get fallbackMuted => body(AppColors.mutedLight);
}
