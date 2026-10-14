import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Txt } from './ui';

const THRESHOLD = 88; // px que hay que arrastrar para que "pegue"
const MAX = 120;

/**
 * Fila que se desliza hacia la IZQUIERDA para revelar "Eliminar".
 *
 * Implementada con PanResponder + Animated del propio React Native en vez
 * de Swipeable de gesture-handler: Swipeable esta deprecado en RNGH 2.x y
 * su reemplazo exige Reanimated, que este proyecto no usa. Asi no se
 * agregan dependencias nativas nuevas por una interaccion.
 */
export function SwipeRow({
  children,
  onDelete,
  onPress,
  deleteLabel = 'Eliminar',
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onPress?: () => void;
  deleteLabel?: string;
}) {
  const t = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const buzzed = useRef(false);

  const settle = (to: number) => {
    openRef.current = to !== 0;
    Animated.spring(translateX, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // Solo tomamos el gesto si es claramente horizontal: asi la lista
      // sigue haciendo scroll vertical con normalidad.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderGrant: () => {
        buzzed.current = false;
      },
      onPanResponderMove: (_e, g) => {
        const base = openRef.current ? -MAX : 0;
        const next = Math.min(0, Math.max(-MAX, base + g.dx));
        translateX.setValue(next);
        if (!buzzed.current && next <= -THRESHOLD) {
          buzzed.current = true;
          Haptics.selectionAsync().catch(() => undefined);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const base = openRef.current ? -MAX : 0;
        const final = base + g.dx;
        settle(final <= -THRESHOLD ? -MAX : 0);
      },
      onPanResponderTerminate: () => settle(0),
    }),
  ).current;

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Fondo rojo que queda debajo */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: MAX,
          backgroundColor: t.danger,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radius.md,
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
              () => undefined,
            );
            settle(0);
            onDelete();
          }}
          style={{ width: MAX, height: '100%', alignItems: 'center', justifyContent: 'center' }}
          hitSlop={4}
        >
          <Txt variant="small" color="#FFFFFF" weight="700">
            {deleteLabel}
          </Txt>
        </Pressable>
      </View>

      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX }], backgroundColor: t.card }}
      >
        <Pressable
          onPress={() => {
            // Si la fila esta abierta, el primer toque la cierra.
            if (openRef.current) return settle(0);
            onPress?.();
          }}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
