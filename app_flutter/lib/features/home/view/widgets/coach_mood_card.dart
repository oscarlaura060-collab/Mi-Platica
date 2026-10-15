import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../domain/home_models.dart';

class CoachMoodCard extends StatelessWidget {
  const CoachMoodCard({
    super.key,
    required this.mood,
    required this.onSelect,
    required this.onRecommendations,
    this.supportText = 'Vamos paso a paso, tú puedes.',
  });

  final Mood? mood;
  final ValueChanged<Mood> onSelect;
  final VoidCallback onRecommendations;
  final String supportText;

  static const _options = <(Mood, String, String)>[
    (Mood.worried, '😟', 'Me preocupa'),
    (Mood.neutral, '😐', 'Voy regular'),
    (Mood.good, '🙂', 'Voy bien'),
  ];

  Color _colorFor(Mood m) => switch (m) {
        Mood.worried => AppColors.coralAccessible,
        Mood.neutral => const Color(0xFFB8880A),
        Mood.good => AppColors.turquoiseDark,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(space(4)),
      decoration: BoxDecoration(
        color: AppColors.navy.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: AppBorders.light,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('¿Cómo te sientes hoy con tu plata?',
              style: AppTextStyles.small(AppColors.ink)
                  .copyWith(fontWeight: FontWeight.w700)),
          SizedBox(height: space(3)),
          Row(
            children: [
              for (final opt in _options) ...[
                _moodButton(opt.$1, opt.$2, opt.$3),
                if (opt != _options.last) SizedBox(width: space(2)),
              ],
            ],
          ),
          SizedBox(height: space(3)),
          SizedBox(
            width: double.infinity,
            child: PressableScale(
              onTap: onRecommendations,
              haptic: HapticKind.light,
              borderRadius: BorderRadius.circular(AppRadius.pill),
              semanticLabel: 'Ver recomendaciones del coach',
              child: Container(
                height: AppTouch.minTarget,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.yellow,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  boxShadow: AppShadows.soft,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Ver recomendaciones',
                        style: AppTextStyles.small(AppColors.navy)
                            .copyWith(fontWeight: FontWeight.w900, fontSize: 14)),
                    const Icon(Icons.chevron_right,
                        size: 16, color: AppColors.navy),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: space(3)),
          Text(supportText,
              style: AppTextStyles.tiny(AppColors.mutedDark)
                  .copyWith(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _moodButton(Mood m, String emoji, String label) {
    final active = mood == m;
    return Expanded(
      child: PressableScale(
        onTap: () => onSelect(m),
        scale: 0.96,
        borderRadius: BorderRadius.circular(12),
        semanticLabel: label,
        child: AnimatedContainer(
          duration: AppMotion.crossFade,
          constraints: const BoxConstraints(minHeight: 56),
          padding: EdgeInsets.symmetric(vertical: space(2)),
          decoration: BoxDecoration(
            color: active ? AppColors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                width: 1,
                color: active ? _colorFor(m) : AppColors.borderLight),
            boxShadow: active ? AppShadows.soft : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 24)),
              if (active) ...[
                const SizedBox(height: 2),
                Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.tiny(_colorFor(m)).copyWith(fontSize: 10)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
