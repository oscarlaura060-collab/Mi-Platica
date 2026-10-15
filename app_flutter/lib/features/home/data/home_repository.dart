import 'package:flutter/material.dart';
import '../domain/home_models.dart';

/// Contrato de datos del Inicio. La implementación real irá sobre sqflite/drift
/// (offline-first). Aquí se incluye una implementación en memoria para arrancar.
abstract interface class HomeRepository {
  Future<HomeData> load();
  Future<void> saveMood(Mood mood, String dateKey);
  Future<void> saveTheme(ThemeMode mode);
}

/// Datos de demostración tomados del Figma (Dashboard v4). Reemplazar por la
/// fuente real cuando la capa de BD esté lista.
class InMemoryHomeRepository implements HomeRepository {
  UserSettings _settings = const UserSettings(userName: 'Óscar');

  /// Simula la latencia de BD para que el skeleton sea visible.
  final Duration latency;

  /// Permite forzar un fallo para probar el estado de error.
  final bool failOnLoad;

  InMemoryHomeRepository({
    this.latency = const Duration(milliseconds: 900),
    this.failOnLoad = false,
  });

  @override
  Future<HomeData> load() async {
    await Future<void>.delayed(latency);
    if (failOnLoad) {
      throw const OfflineException('No pudimos sincronizar tu saldo.');
    }

    return HomeData(
      availableRealCents: 20000000, // $200.000
      totalCents: 20000000,
      fixedPendingCents: 0,
      fixedMonthlyCents: 125000000, // $1.250.000
      detectedPending: 2,
      settings: _settings,
      primaryAccount: null,
      advice: const CoachAdvice(
        message:
            'Vas al día con tus compromisos de la quincena. Tienes margen para '
            'ahorrar \$50.000 o darte un gusto consciente.',
      ),
      accounts: const [
        AccountBalance(
          id: 1,
          name: 'Nequi',
          type: AccountType.wallet,
          balanceCents: 8000000, // $80.000
        ),
        AccountBalance(
          id: 2,
          name: 'Efectivo',
          type: AccountType.cash,
          balanceCents: 12000000, // $120.000
        ),
      ],
      recent: const [
        TransactionRow(
          id: 1,
          type: TxType.expense,
          amountCents: 4500000,
          accountName: 'Bancolombia',
          categoryName: 'Mercado',
          note: 'Supermercado Éxito',
        ),
        TransactionRow(
          id: 2,
          type: TxType.income,
          amountCents: 100000000,
          accountName: 'Bancolombia',
          note: 'Nómina Quincena',
        ),
        TransactionRow(
          id: 3,
          type: TxType.expense,
          amountCents: 1200000,
          accountName: 'Nequi',
          categoryName: 'Transporte',
        ),
        TransactionRow(
          id: 4,
          type: TxType.expense,
          amountCents: 8500000,
          accountName: 'Nequi',
          categoryName: 'Servicios Públicos',
        ),
        TransactionRow(
          id: 5,
          type: TxType.expense,
          amountCents: 1800000,
          accountName: 'Efectivo',
          categoryName: 'Comida',
          note: 'Almuerzo / Gusto',
        ),
      ],
    );
  }

  @override
  Future<void> saveMood(Mood mood, String dateKey) async {
    _settings = _settings.copyWith(mood: mood, moodDateKey: dateKey);
  }

  @override
  Future<void> saveTheme(ThemeMode mode) async {
    _settings = _settings.copyWith(themeMode: mode);
  }
}

/// Fallo de sincronización con la red. La BD local sigue siendo la fuente;
/// la UI lo trata como aviso, no como muro.
class OfflineException implements Exception {
  const OfflineException(this.message);
  final String message;
  @override
  String toString() => message;
}
