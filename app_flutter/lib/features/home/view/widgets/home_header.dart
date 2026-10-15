import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/pressable_scale.dart';

class HomeHeader extends StatelessWidget {
  const HomeHeader({
    super.key,
    required this.greeting,
    required this.name,
    required this.hasAlerts,
    required this.isDark,
    required this.onToggleTheme,
    required this.onNotifications,
    required this.onSettings,
  });

  final String greeting;
  final String name;
  final bool hasAlerts;
  final bool isDark;
  final VoidCallback onToggleTheme;
  final VoidCallback onNotifications;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _logo(),
        SizedBox(width: space(3)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(greeting.toUpperCase(),
                  style: AppTextStyles.tiny(AppColors.mutedLight)),
              const SizedBox(height: 2),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.h2(AppColors.onSurface),
              ),
            ],
          ),
        ),
        _circleAction(
          icon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
          color: isDark ? AppColors.yellow : AppColors.onSurface,
          label: isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
          onTap: onToggleTheme,
        ),
        _circleAction(
          icon: Icons.notifications_none_rounded,
          color: AppColors.onSurface,
          label: 'Notificaciones',
          onTap: onNotifications,
          badge: hasAlerts,
        ),
        _circleAction(
          icon: Icons.settings_outlined,
          color: AppColors.onSurface,
          label: 'Ajustes',
          onTap: onSettings,
        ),
      ],
    );
  }

  Widget _logo() => Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: const LinearGradient(
            begin: Alignment.bottomLeft,
            end: Alignment.topRight,
            colors: [AppColors.turquoise, AppColors.yellow],
          ),
          boxShadow: AppShadows.soft,
        ),
        child: Text('MP',
            style: AppTextStyles.h3(AppColors.navy)
                .copyWith(fontWeight: FontWeight.w800)),
      );

  Widget _circleAction({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
    bool badge = false,
  }) {
    return PressableScale(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      semanticLabel: label,
      child: SizedBox(
        width: AppTouch.minTarget,
        height: AppTouch.minTarget,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 22, color: color),
            if (badge)
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: AppColors.coral,
                    shape: BoxShape.circle,
                    border: Border.all(width: 2, color: AppColors.navy),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
