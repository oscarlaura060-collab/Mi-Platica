import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/pressable_scale.dart';
import '../cubit/home_cubit.dart';
import '../domain/home_models.dart';
import 'widgets/accounts_carousel.dart';
import 'widgets/app_bottom_bar.dart';
import 'widgets/balance_summary_card.dart';
import 'widgets/coach_advice_card.dart';
import 'widgets/coach_mood_card.dart';
import 'widgets/home_header.dart';
import 'widgets/recent_activity_sheet.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, this.onNavigate});

  /// Navegación desacoplada: la ruta real la resuelve el router de la app.
  final void Function(String route, [Map<String, Object?>? params])? onNavigate;

  void _go(String route, [Map<String, Object?>? params]) =>
      onNavigate?.call(route, params);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HomeCubit, HomeState>(
      builder: (context, state) {
        final cubit = context.read<HomeCubit>();
        final loading = state is HomeLoading;
        final data = state is HomeLoaded ? state.data : null;
        final isDark = data?.settings.themeMode != ThemeMode.light;

        return Scaffold(
          backgroundColor: AppColors.navy,
          bottomNavigationBar: AppBottomBar(
            currentIndex: 0,
            onSelect: (i) => _go('tab', {'index': i}),
            onQuickAdd: () => _go('quickAdd'),
          ),
          body: RefreshIndicator(
            onRefresh: cubit.refresh,
            color: AppColors.turquoise,
            backgroundColor: AppColors.surfaceLow,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                          space(4), space(4), space(4), space(2)),
                      child: HomeHeader(
                        greeting: _greeting(),
                        name: data?.settings.userName ?? 'Amigo',
                        hasAlerts: (data?.detectedPending ?? 0) > 0,
                        isDark: isDark,
                        onToggleTheme: () => cubit.setTheme(
                            isDark ? ThemeMode.light : ThemeMode.dark),
                        onNotifications: () => _go('notifications'),
                        onSettings: () => _go('settings'),
                      ),
                    ),
                  ),
                ),
                if (state is HomeError)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(space(4)),
                      child: _ErrorCard(
                        message: state.message,
                        isOffline: state.isOffline,
                        onRetry: cubit.load,
                      ),
                    ),
                  )
                else ...[
                  SliverToBoxAdapter(child: _body(context, data, loading)),
                  SliverToBoxAdapter(
                    child: _sheet(context, data, loading),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _body(BuildContext context, HomeData? data, bool loading) {
    final caption = data?.primaryAccount != null
        ? 'Saldo de tu cuenta principal.'
        : 'Libre para ti después de cubrir compromisos.';

    return Container(
      color: AppColors.navy,
      padding: EdgeInsets.fromLTRB(space(4), space(4), space(4), space(4)),
      child: Column(
        children: [
          BalanceSummaryCard(
            amountCents: data?.heroBalanceCents ?? 0,
            loading: loading,
            caption: caption,
            commitmentsCovered: (data?.fixedPendingCents ?? 1) == 0,
            commitmentsCents: data?.fixedMonthlyCents ?? 0,
            accountName: data?.primaryAccount?.name,
            onInfo: () {},
            onIncome: () => _go('quickAdd', {'type': 'income'}),
            onExpense: () => _go('quickAdd', {'type': 'expense'}),
          ),
          SizedBox(height: space(6)),
          AccountsCarousel(
            accounts: data?.accounts ?? const [],
            loading: loading,
            primaryId: data?.primaryAccount?.id,
            onSeeAll: () => _go('accounts'),
            onOpen: (a) => _go('accountDetail', {'accountId': a.id}),
            onCreate: () => _go('accountForm'),
          ),
          SizedBox(height: space(6)),
          CoachAdviceCard(
            message: data?.advice?.message ??
                'Vas al día con tus compromisos. Tienes margen para ahorrar o '
                    'darte un gusto consciente.',
            loading: loading,
            onTap: () => _go('coach'),
          ),
        ],
      ),
    );
  }

  Widget _sheet(BuildContext context, HomeData? data, bool loading) {
    final cubit = context.read<HomeCubit>();
    return RecentActivitySheet(
      transactions: (data?.recent ?? const []).take(8).toList(),
      loading: loading,
      onSeeAll: () => _go('movements'),
      onOpen: (tx) => _go('transactionEdit', {'txId': tx.id}),
      onRegister: () => _go('quickAdd'),
      child: CoachMoodCard(
        mood: data?.settings.mood,
        onSelect: cubit.setMood,
        onRecommendations: () => _go('coach'),
      ),
    );
  }

  static String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}

/// ADICIÓN [+]: tarjeta de error con reintento (y variante offline sin culpa).
class _ErrorCard extends StatelessWidget {
  const _ErrorCard({
    required this.message,
    required this.isOffline,
    required this.onRetry,
  });

  final String message;
  final bool isOffline;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final title =
        isOffline ? 'Sin conexión' : 'No pudimos cargar esto';
    return Container(
      padding: EdgeInsets.all(space(5)),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
            width: 1, color: AppColors.coral.withValues(alpha: 0.4)),
      ),
      child: Column(
        children: [
          Icon(
            isOffline ? Icons.wifi_off_rounded : Icons.warning_amber_rounded,
            size: 28,
            color: AppColors.coral,
          ),
          SizedBox(height: space(2)),
          Text(title,
              textAlign: TextAlign.center,
              style: AppTextStyles.h3(AppColors.white)),
          SizedBox(height: space(1.5)),
          Text(
            isOffline
                ? '$message Mostramos tus datos locales mientras tanto.'
                : 'Puede ser algo pasajero.',
            textAlign: TextAlign.center,
            style: AppTextStyles.small(AppColors.mutedLight),
          ),
          SizedBox(height: space(4)),
          PressableScale(
            onTap: onRetry,
            haptic: HapticKind.light,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            semanticLabel: 'Intentar de nuevo',
            child: Container(
              height: AppTouch.minTarget,
              padding: EdgeInsets.symmetric(horizontal: space(6)),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.surfaceHigh,
                borderRadius: BorderRadius.circular(AppRadius.pill),
                border: AppBorders.dark,
              ),
              child: Text('Intentar de nuevo',
                  style: AppTextStyles.small(AppColors.white)
                      .copyWith(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}
