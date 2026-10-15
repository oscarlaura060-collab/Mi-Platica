import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/home_repository.dart';
import '../domain/home_models.dart';

part 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  HomeCubit(this._repo) : super(const HomeInitial());

  final HomeRepository _repo;

  /// Primera carga: Loading (skeletons) → Loaded, o Error.
  Future<void> load() async {
    emit(const HomeLoading());
    try {
      final data = await _repo.load();
      emit(HomeLoaded(data));
    } on OfflineException catch (e) {
      emit(HomeError(e.message, isOffline: true));
    } catch (e) {
      emit(HomeError('No pudimos cargar esto. $e'));
    }
  }

  /// Recarga manual (pull-to-refresh): mantiene el contenido y no vuelve a skeleton.
  Future<void> refresh() async {
    final current = state;
    if (current is HomeLoaded) {
      emit(current.copyWith(refreshing: true));
    }
    try {
      final data = await _repo.load();
      emit(HomeLoaded(data));
    } on OfflineException catch (e) {
      if (current is HomeLoaded) {
        emit(current.copyWith(refreshing: false));
      } else {
        emit(HomeError(e.message, isOffline: true));
      }
    } catch (e) {
      if (current is HomeLoaded) {
        emit(current.copyWith(refreshing: false));
      } else {
        emit(HomeError('No pudimos cargar esto. $e'));
      }
    }
  }

  Future<void> setMood(Mood mood) async {
    final current = state;
    if (current is! HomeLoaded) return;
    final dateKey = _todayKey();
    await _repo.saveMood(mood, dateKey);
    emit(current.copyWith(
      data: current.data.copyWith(
        settings:
            current.data.settings.copyWith(mood: mood, moodDateKey: dateKey),
      ),
    ));
  }

  Future<void> setTheme(ThemeMode mode) async {
    final current = state;
    if (current is! HomeLoaded) return;
    await _repo.saveTheme(mode);
    emit(current.copyWith(
      data: current.data
          .copyWith(settings: current.data.settings.copyWith(themeMode: mode)),
    ));
  }

  static String _todayKey() {
    final now = DateTime.now();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '${now.year}-$m-$d';
  }
}
