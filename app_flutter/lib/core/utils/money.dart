import 'package:intl/intl.dart';

/// Todo el dinero vive en enteros (centavos). Nunca aritmética con floats sobre saldos.
const int kCents = 100;

final NumberFormat _cop = NumberFormat.currency(
  locale: 'es_CO',
  symbol: r'$',
  decimalDigits: 0,
);

/// `$200.000` — formato COP sin decimales.
String money(int cents) => _cop.format((cents / kCents).round());

/// Monto con signo explícito según el tipo de movimiento.
/// Usa el signo menos tipográfico (U+2212), no el guion.
String moneySigned(int cents, {required bool isIncome, required bool isNeutral}) {
  if (isNeutral) return money(cents.abs());
  final sign = isIncome ? '+' : '−';
  return '$sign${money(cents.abs())}';
}
