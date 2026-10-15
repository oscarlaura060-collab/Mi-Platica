import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

enum AccountType { bank, wallet, cash, creditCard, savings, other }

enum TxType { income, expense, transfer, debtPayment, goalDeposit }

enum Mood { worried, neutral, good }

class AccountBalance extends Equatable {
  const AccountBalance({
    required this.id,
    required this.name,
    required this.type,
    required this.balanceCents,
    this.color,
  });

  final int id;
  final String name;
  final AccountType type;
  final int balanceCents;
  final Color? color;

  @override
  List<Object?> get props => [id, name, type, balanceCents, color];
}

class TransactionRow extends Equatable {
  const TransactionRow({
    required this.id,
    required this.type,
    required this.amountCents,
    required this.accountName,
    this.note,
    this.categoryName,
    this.debtName,
  });

  final int id;
  final TxType type;
  final int amountCents;
  final String accountName;
  final String? note;
  final String? categoryName;
  final String? debtName;

  @override
  List<Object?> get props =>
      [id, type, amountCents, accountName, note, categoryName, debtName];
}

class CoachAdvice extends Equatable {
  const CoachAdvice({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

class UserSettings extends Equatable {
  const UserSettings({
    this.userName = 'Amigo',
    this.mood,
    this.moodDateKey,
    this.themeMode = ThemeMode.dark,
  });

  final String userName;
  final Mood? mood;
  final String? moodDateKey; // yyyy-mm-dd en que se guardó el ánimo
  final ThemeMode themeMode;

  UserSettings copyWith({
    String? userName,
    Mood? mood,
    String? moodDateKey,
    ThemeMode? themeMode,
  }) =>
      UserSettings(
        userName: userName ?? this.userName,
        mood: mood ?? this.mood,
        moodDateKey: moodDateKey ?? this.moodDateKey,
        themeMode: themeMode ?? this.themeMode,
      );

  @override
  List<Object?> get props => [userName, mood, moodDateKey, themeMode];
}

/// Datos completos de la pantalla de Inicio (espejo del store React).
class HomeData extends Equatable {
  const HomeData({
    required this.accounts,
    required this.recent,
    required this.availableRealCents,
    required this.totalCents,
    required this.fixedPendingCents,
    required this.fixedMonthlyCents,
    required this.detectedPending,
    required this.settings,
    this.primaryAccount,
    this.advice,
    this.infoIncomplete = false,
  });

  final List<AccountBalance> accounts;
  final List<TransactionRow> recent;
  final int availableRealCents;
  final int totalCents;
  final int fixedPendingCents;
  final int fixedMonthlyCents;
  final int detectedPending;
  final UserSettings settings;
  final AccountBalance? primaryAccount;
  final CoachAdvice? advice;

  /// ADICIÓN [+]: faltan datos no críticos (p. ej. fechas de compromisos).
  final bool infoIncomplete;

  /// Saldo protagonista: cuenta principal si existe, si no el disponible real.
  int get heroBalanceCents => primaryAccount?.balanceCents ?? availableRealCents;

  HomeData copyWith({UserSettings? settings}) => HomeData(
        accounts: accounts,
        recent: recent,
        availableRealCents: availableRealCents,
        totalCents: totalCents,
        fixedPendingCents: fixedPendingCents,
        fixedMonthlyCents: fixedMonthlyCents,
        detectedPending: detectedPending,
        settings: settings ?? this.settings,
        primaryAccount: primaryAccount,
        advice: advice,
        infoIncomplete: infoIncomplete,
      );

  @override
  List<Object?> get props => [
        accounts,
        recent,
        availableRealCents,
        totalCents,
        fixedPendingCents,
        fixedMonthlyCents,
        detectedPending,
        settings,
        primaryAccount,
        advice,
        infoIncomplete,
      ];
}
