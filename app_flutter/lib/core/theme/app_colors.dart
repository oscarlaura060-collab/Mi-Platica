import 'package:flutter/material.dart';

/// Fuente de verdad de color (espejo de `src/theme/tokens.ts`).
/// Ninguna pantalla debe escribir un color a mano.
abstract final class AppColors {
  // Fondos oscuros
  static const navy = Color(0xFF071A2A);
  static const navySoft = Color(0xFF0D2A3D);
  static const surfaceLow = Color(0xFF0A1D2D);
  static const surface = Color(0xFF0F2131);
  static const surfaceHigh = Color(0xFF1A2B3C);
  static const borderDark = Color(0xFF1C465C);

  // Acentos
  static const turquoise = Color(0xFF14C4D4);
  static const turquoiseDark = Color(0xFF0A8F9C);
  static const yellow = Color(0xFFFFD447);
  static const coral = Color(0xFFFF6F61);

  // Superficie clara
  static const offWhite = Color(0xFFF8F8F3);
  static const white = Color(0xFFFFFFFF);
  static const ink = Color(0xFF17222B);
  static const borderLight = Color(0xFFE6E7E2);

  // Texto secundario
  static const mutedLight = Color(0xFF9EB5C5); // sobre oscuro
  static const mutedDark = Color(0xFF7D8990); // sobre claro
  static const onSurface = Color(0xFFD2E4FB);

  // Fondos tonales de íconos/estados (claro)
  static const paleTurquoise = Color(0xFFE5FAFC);
  static const paleCoral = Color(0xFFFFF0ED);
  static const paleYellow = Color(0xFFFFF8D9);

  // Variantes accesibles — para TEXTO pequeño sobre fondo claro (WCAG AA)
  static const turquoiseAccessible = Color(0xFF0A8F9C);
  static const yellowAccessible = Color(0xFF9E7400);
  static const coralAccessible = Color(0xFFD93829);

  /// Ciclo de acentos para las tarjetas de cuenta.
  static const accountAccents = <Color>[turquoise, yellow, coral];
}
