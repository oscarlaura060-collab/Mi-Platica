import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/pressable_scale.dart';

/// Barra inferior fija: Inicio · Movimientos · (＋) · Ahorro · Perfil.
class AppBottomBar extends StatelessWidget {
  const AppBottomBar({
    super.key,
    required this.currentIndex,
    required this.onSelect,
    required this.onQuickAdd,
  });

  final int currentIndex;
  final ValueChanged<int> onSelect;
  final VoidCallback onQuickAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.navy,
        border: Border(top: BorderSide(width: 1, color: AppColors.borderDark)),
      ),
      padding: EdgeInsets.only(top: space(2), bottom: space(2)),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _item(0, Icons.home_rounded, 'Inicio'),
            _item(1, Icons.swap_vert_rounded, 'Movimientos'),
            _fab(),
            _item(3, Icons.savings_rounded, 'Ahorro'),
            _item(4, Icons.person_rounded, 'Perfil'),
          ],
        ),
      ),
    );
  }

  Widget _item(int index, IconData icon, String label) {
    final active = index == currentIndex;
    final color = active ? AppColors.turquoise : AppColors.mutedLight;
    return PressableScale(
      onTap: () => onSelect(index),
      scale: 0.9,
      borderRadius: BorderRadius.circular(AppRadius.md),
      semanticLabel: label,
      child: Container(
        constraints: const BoxConstraints(minWidth: AppTouch.minTarget),
        padding: EdgeInsets.symmetric(horizontal: space(2), vertical: space(1)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 2),
            Text(label, style: AppTextStyles.tiny(color).copyWith(fontSize: 10)),
          ],
        ),
      ),
    );
  }

  Widget _fab() => PressableScale(
        onTap: onQuickAdd,
        haptic: HapticKind.light,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        semanticLabel: 'Registrar movimiento',
        child: Container(
          width: 56,
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.turquoise,
            shape: BoxShape.circle,
            boxShadow: AppShadows.hero,
          ),
          child: const Icon(Icons.add_rounded, size: 30, color: AppColors.navy),
        ),
      );
}
