import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/money.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../../../core/widgets/skeleton.dart';

/// Hero del saldo disponible (card principal de la Zona B).
class BalanceSummaryCard extends StatelessWidget {
  const BalanceSummaryCard({
    super.key,
    required this.amountCents,
    required this.loading,
    required this.caption,
    required this.commitmentsCovered,
    required this.commitmentsCents,
    required this.onIncome,
    required this.onExpense,
    this.accountName,
    this.onInfo,
  });

  final int amountCents;
  final bool loading;
  final String caption;
  final bool commitmentsCovered;
  final int commitmentsCents;
  final String? accountName;
  final VoidCallback onIncome;
  final VoidCallback onExpense;

  /// ADICIÓN [+]: tooltip explicando cómo se calcula el saldo.
  final VoidCallback? onInfo;

  @override
  Widget build(BuildContext context) {
    final negative = amountCents < 0;
    final label = accountName != null
        ? 'DISPONIBLE EN ${accountName!.toUpperCase()}'
        : 'SALDO DISPONIBLE REAL';

    return Container(
      padding: EdgeInsets.all(space(5)),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: AppBorders.dark,
        boxShadow: AppShadows.hero,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Flexible(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.tiny(AppColors.turquoise)),
                    ),
                    if (onInfo != null)
                      Tooltip(
                        message:
                            'Tu saldo total menos los compromisos pendientes del mes.',
                        triggerMode: TooltipTriggerMode.tap,
                        child: Padding(
                          padding: EdgeInsets.only(left: space(1)),
                          child: Icon(Icons.info_outline,
                              size: 14, color: AppColors.mutedLight),
                        ),
                      ),
                  ],
                ),
              ),
              const Spacer(),
              _statusBadge(),
            ],
          ),
          SizedBox(height: space(3)),
          if (loading)
            // Misma caja que la cifra real (evita layout shift).
            const SizedBox(
              height: 48,
              child: Align(
                alignment: Alignment.centerLeft,
                child: FractionallySizedBox(
                  widthFactor: 0.75,
                  child: SkeletonBox(height: 48, radius: 12),
                ),
              ),
            )
          else
            SizedBox(
              height: 48,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        money(amountCents),
                        style: AppTextStyles.hero(
                            negative ? AppColors.coral : AppColors.white),
                      ),
                    ),
                  ),
                  SizedBox(width: space(2)),
                  Text('COP',
                      style: AppTextStyles.small(AppColors.mutedLight)
                          .copyWith(fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          SizedBox(height: space(1)),
          Text(caption, style: AppTextStyles.body(AppColors.mutedLight)),
          if (commitmentsCents > 0) ...[
            SizedBox(height: space(3.5)),
            _commitmentsBadge(),
          ],
          SizedBox(height: space(5)),
          Row(
            children: [
              Expanded(
                child: _twinButton(
                  label: '+ Ingreso',
                  icon: Icons.south_rounded,
                  background: AppColors.turquoise,
                  foreground: AppColors.navy,
                  iconColor: AppColors.navy,
                  onTap: onIncome,
                ),
              ),
              SizedBox(width: space(3)),
              Expanded(
                child: _twinButton(
                  label: '− Gasto',
                  icon: Icons.north_rounded,
                  background: AppColors.surfaceHigh,
                  foreground: AppColors.white,
                  iconColor: AppColors.coral,
                  border: true,
                  onTap: onExpense,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusBadge() => Container(
        padding: EdgeInsets.symmetric(horizontal: space(2.5), vertical: space(1)),
        decoration: BoxDecoration(
          color: AppColors.turquoise.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
              width: 1, color: AppColors.turquoise.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                  color: AppColors.turquoise, shape: BoxShape.circle),
            ),
            SizedBox(width: space(1.5)),
            Text('Al día',
                style: AppTextStyles.small(AppColors.turquoise)
                    .copyWith(fontWeight: FontWeight.w700, fontSize: 12)),
          ],
        ),
      );

  Widget _commitmentsBadge() => Container(
        padding: EdgeInsets.symmetric(horizontal: space(3), vertical: space(1)),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
              width: 1, color: AppColors.borderDark.withValues(alpha: 0.6)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.verified_user_outlined,
                size: 16, color: AppColors.turquoise),
            SizedBox(width: space(2)),
            Flexible(
              child: Text.rich(
                TextSpan(
                  style: AppTextStyles.small(AppColors.mutedLight),
                  children: [
                    const TextSpan(text: 'Compromisos del mes: '),
                    TextSpan(
                      text:
                          '${commitmentsCovered ? "100% cubiertos" : "Pendientes"} (${money(commitmentsCents)} COP)',
                      style: AppTextStyles.small(AppColors.white)
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                maxLines: 2,
              ),
            ),
          ],
        ),
      );

  Widget _twinButton({
    required String label,
    required IconData icon,
    required Color background,
    required Color foreground,
    required Color iconColor,
    required VoidCallback onTap,
    bool border = false,
  }) {
    return PressableScale(
      onTap: onTap,
      haptic: HapticKind.light,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      semanticLabel: label,
      child: Container(
        height: AppTouch.minTarget,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: border ? AppBorders.dark : null,
          boxShadow: AppShadows.soft,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: iconColor),
            SizedBox(width: space(2)),
            Text(label,
                style: AppTextStyles.small(foreground)
                    .copyWith(fontWeight: FontWeight.w900, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
