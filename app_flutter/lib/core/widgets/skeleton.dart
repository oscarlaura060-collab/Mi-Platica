import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_colors.dart';
import '../theme/app_dimens.dart';

/// Caja base de un skeleton con shimmer.
///
/// Regla anti-layout-shift: cada skeleton debe declarar EXACTAMENTE el mismo
/// ancho/alto/radio que el contenido real al que reemplaza.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    required this.height,
    this.radius,
    this.onDark = true,
  });

  final double? width;
  final double height;
  final double? radius;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final base = onDark
        ? AppColors.white.withValues(alpha: 0.12)
        : AppColors.navy.withValues(alpha: 0.08);
    final highlight = onDark
        ? AppColors.white.withValues(alpha: 0.22)
        : AppColors.navy.withValues(alpha: 0.04);

    final box = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: base,
        borderRadius: BorderRadius.circular(radius ?? height / 2),
      ),
    );

    if (reduceMotion) return box;
    return Shimmer.fromColors(
      period: AppMotion.shimmer,
      baseColor: base,
      highlightColor: highlight,
      child: box,
    );
  }
}

/// n líneas de texto simuladas; la última al 60% del ancho.
class SkeletonLines extends StatelessWidget {
  const SkeletonLines({
    super.key,
    this.lines = 3,
    this.onDark = true,
    this.gap = 10,
  });

  final int lines;
  final bool onDark;
  final double gap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < lines; i++) ...[
          FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: i == lines - 1 ? 0.6 : 1.0,
            child: SkeletonBox(height: 14, onDark: onDark),
          ),
          if (i != lines - 1) SizedBox(height: gap),
        ],
      ],
    );
  }
}
