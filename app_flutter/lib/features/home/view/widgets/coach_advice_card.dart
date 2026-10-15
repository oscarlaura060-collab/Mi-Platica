import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../../../core/widgets/skeleton.dart';

class CoachAdviceCard extends StatelessWidget {
  const CoachAdviceCard({
    super.key,
    required this.message,
    required this.loading,
    required this.onTap,
  });

  final String message;
  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      scale: 0.98,
      borderRadius: BorderRadius.circular(AppRadius.md),
      splashColor: AppColors.yellow.withValues(alpha: 0.10),
      semanticLabel: 'Consejo del coach financiero',
      child: Container(
        padding: EdgeInsets.all(space(4)),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
              width: 1, color: AppColors.yellow.withValues(alpha: 0.35)),
          boxShadow: AppShadows.soft,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.yellow.withValues(alpha: 0.16),
                shape: BoxShape.circle,
                border: Border.all(
                    width: 1, color: AppColors.yellow.withValues(alpha: 0.32)),
              ),
              child: const Icon(Icons.wb_sunny_outlined,
                  size: 20, color: AppColors.yellow),
            ),
            SizedBox(width: space(3.5)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text('COACH FINANCIERO · SIN CULPA',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.tiny(AppColors.yellow)),
                      ),
                      Text('Ver plan',
                          style: AppTextStyles.small(AppColors.turquoise)
                              .copyWith(fontWeight: FontWeight.w700)),
                      const Icon(Icons.chevron_right,
                          size: 14, color: AppColors.turquoise),
                    ],
                  ),
                  SizedBox(height: space(1)),
                  if (loading)
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: SkeletonLines(lines: 2, onDark: true),
                    )
                  else
                    Text(message, style: AppTextStyles.body(AppColors.onSurface)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
