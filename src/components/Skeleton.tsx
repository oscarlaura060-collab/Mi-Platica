import React from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Bloque gris que late suavemente mientras llegan los datos.
 *
 * Se prefiere sobre un spinner porque conserva la forma de lo que va a
 * aparecer: la pantalla no "salta" cuando cargan los datos.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  style,
  /** Sobre fondo navy los grises claros no se ven; esto los invierte. */
  onDark,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  onDark?: boolean;
}) {
  const t = useTheme();
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (t.reduceMotion) {
      pulse.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, t.reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? height / 2,
          backgroundColor: onDark ? 'rgba(255,255,255,0.10)' : 'rgba(7,26,42,0.07)',
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        },
        style,
      ]}
    />
  );
}

/** Varias lineas de texto simuladas, para listas. */
export function SkeletonLines({
  lines = 3,
  onDark,
  gap = 10,
}: {
  lines?: number;
  onDark?: boolean;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={14}
          // La ultima linea mas corta: imita un parrafo real.
          width={i === lines - 1 ? '60%' : '100%'}
          onDark={onDark}
        />
      ))}
    </View>
  );
}
