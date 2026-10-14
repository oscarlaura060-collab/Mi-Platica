import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, SunMedium } from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { Txt } from '@/components/ui';
import type { CoachAlert } from '@/domain/coach/types';

/**
 * CONSEJO DEL COACH (Stitch v4)
 *
 * Breve, reflexivo, cero culpa y enfocado en orientar, no en moralizar.
 */
export function CoachAdviceCard({
  advice,
  onPress,
}: {
  advice?: CoachAlert | null;
  onPress: () => void;
}) {
  const mensaje =
    advice?.message ||
    'Vas al día con tus compromisos de la quincena. Tienes margen para darte un gusto consciente o sumar a tu ahorro.';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Consejo del Coach: ${mensaje}. Toca para ver detalle.`}
      style={({ pressed }) => ({
        backgroundColor: BRAND.surfaceContainerLow,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 212, 71, 0.32)',
        padding: space(4),
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space(3.5),
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: 'rgba(255, 212, 71, 0.16)',
          borderWidth: 1,
          borderColor: 'rgba(255, 212, 71, 0.32)',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        <SunMedium size={20} color={BRAND.yellow} strokeWidth={2.4} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: space(1) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Txt variant="tiny" color={BRAND.yellow} weight="800" style={{ letterSpacing: 0.3 }}>
            COACH FINANCIERO · SIN CULPA
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt variant="tiny" color={BRAND.turquoise} weight="700">
              Ver plan
            </Txt>
            <ChevronRight size={14} color={BRAND.turquoise} strokeWidth={2.5} />
          </View>
        </View>

        <Txt variant="small" color={BRAND.onSurface} weight="500" style={{ lineHeight: 19 }}>
          {mensaje}
        </Txt>
      </View>
    </Pressable>
  );
}
