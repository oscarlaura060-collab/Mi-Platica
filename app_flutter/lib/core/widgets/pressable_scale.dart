import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_dimens.dart';

enum HapticKind { none, selection, light }

/// Microinteracción táctil estándar: escala al presionar + ripple + háptico.
///
/// Respeta reduced-motion: si las animaciones están desactivadas en el sistema,
/// omite la escala y conserva solo el ripple.
class PressableScale extends StatefulWidget {
  const PressableScale({
    super.key,
    required this.child,
    required this.onTap,
    this.scale = 0.95,
    this.haptic = HapticKind.selection,
    this.borderRadius,
    this.splashColor,
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback onTap;
  final double scale;
  final HapticKind haptic;
  final BorderRadius? borderRadius;
  final Color? splashColor;
  final String? semanticLabel;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _down = false;

  void _fireHaptic() {
    switch (widget.haptic) {
      case HapticKind.selection:
        HapticFeedback.selectionClick();
      case HapticKind.light:
        HapticFeedback.lightImpact();
      case HapticKind.none:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final radius = widget.borderRadius ?? BorderRadius.circular(AppRadius.md);

    final content = Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: widget.onTap,
        onTapDown: (_) {
          _fireHaptic();
          if (!reduceMotion) setState(() => _down = true);
        },
        onTapUp: (_) {
          if (_down) setState(() => _down = false);
        },
        onTapCancel: () {
          if (_down) setState(() => _down = false);
        },
        borderRadius: radius,
        splashColor: widget.splashColor,
        child: widget.child,
      ),
    );

    final wrapped = reduceMotion
        ? content
        : AnimatedScale(
            scale: _down ? widget.scale : 1.0,
            duration: AppMotion.press,
            curve: AppMotion.curve,
            child: content,
          );

    if (widget.semanticLabel == null) return wrapped;
    return Semantics(
      button: true,
      label: widget.semanticLabel,
      child: wrapped,
    );
  }
}
