import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Escala de espaciado: múltiplos de 4.
/// `space(4)` = 16 (margen lateral), `space(6)` = 24 (separación entre bloques).
double space(num n) => n * 4.0;

abstract final class AppRadius {
  static const double sm = 10;
  static const double md = 16; // cards de cuenta, coach, mood
  static const double lg = 24; // card del saldo
  static const double xl = 30;
  static const double sheet = 34; // esquinas superiores de la hoja clara
  static const double pill = 999;
}

/// Área de toque mínima exigida por WCAG 2.1 (AA): 48x48 dp.
abstract final class AppTouch {
  static const double minTarget = 48;
}

abstract final class AppShadows {
  /// Cards sobre navy (shadow-md).
  static const List<BoxShadow> soft = [
    BoxShadow(color: Color(0x33000000), blurRadius: 14, offset: Offset(0, 6)),
  ];

  /// Hero del saldo (shadow-xl).
  static const List<BoxShadow> hero = [
    BoxShadow(color: Color(0x40000000), blurRadius: 24, offset: Offset(0, 10)),
  ];

  /// Hoja clara inferior (shadow-2xl): proyecta hacia arriba.
  static const List<BoxShadow> sheet = [
    BoxShadow(color: Color(0x1F071A2A), blurRadius: 32, offset: Offset(0, -6)),
  ];
}

/// Duraciones de las microinteracciones y transiciones.
abstract final class AppMotion {
  static const Duration press = Duration(milliseconds: 120);
  static const Duration crossFade = Duration(milliseconds: 200);
  static const Duration shimmer = Duration(milliseconds: 1000);
  static const Curve curve = Curves.easeOut;
}

/// Bordes de 1px reutilizables.
abstract final class AppBorders {
  static Border get dark => Border.all(width: 1, color: AppColors.borderDark);
  static Border get light => Border.all(width: 1, color: AppColors.borderLight);
}
