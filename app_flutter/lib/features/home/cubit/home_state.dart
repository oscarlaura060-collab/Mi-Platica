part of 'home_cubit.dart';

sealed class HomeState extends Equatable {
  const HomeState();
  @override
  List<Object?> get props => [];
}

class HomeInitial extends HomeState {
  const HomeInitial();
}

/// Primera carga: la UI pinta skeletons.
class HomeLoading extends HomeState {
  const HomeLoading();
}

/// Datos listos. [refreshing] = recarga en curso sin volver a skeleton.
class HomeLoaded extends HomeState {
  const HomeLoaded(this.data, {this.refreshing = false});

  final HomeData data;
  final bool refreshing;

  HomeLoaded copyWith({HomeData? data, bool? refreshing}) =>
      HomeLoaded(data ?? this.data, refreshing: refreshing ?? this.refreshing);

  @override
  List<Object?> get props => [data, refreshing];
}

class HomeError extends HomeState {
  const HomeError(this.message, {this.isOffline = false});

  final String message;
  final bool isOffline;

  @override
  List<Object?> get props => [message, isOffline];
}
