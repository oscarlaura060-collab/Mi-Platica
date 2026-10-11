import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Txt } from '@/components/ui';

export type Mood = 'worried' | 'neutral' | 'good';

const OPCIONES: { key: Mood; emoji: string; label: string }[] = [
  { key: 'worried', emoji: '😟', label: 'Me preocupa' },
  { key: 'neutral', emoji: '😐', label: 'Voy regular' },
  { key: 'good', emoji: '🙂', label: 'Voy bien' },
];

/** El color del borde depende del animo, pero la etiqueta siempre esta. */
const COLOR: Record<Mood, string> = {
  worried: BRAND.coral,
  neutral: '#B8880A',
  good: BRAND.turquoiseDark,
};

/**
 * Coach emocional.
 *
 * Preguntar como se siente la persona no es decoracion: dos usuarios con
 * el mismo saldo pueden estar tranquilos o angustiados, y eso cambia que
 * consejo sirve. La respuesta NO altera ningun calculo financiero.
 */
export function CoachMoodCard({
  mood,
  onSelect,
  onRecommendations,
  supportText = 'Vamos paso a paso, tu puedes.',
}: {
  mood: Mood | null;
  onSelect: (m: Mood) => void;
  onRecommendations: () => void;
  supportText?: string;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  // En pantallas angostas el boton baja a su propia fila en vez de
  // apretar los emojis hasta que no se puedan tocar.
  const enDosFilas = width < 370;

  const Emojis = (
    <View style={{ flexDirection: 'row', gap: space(2) }}>
      {OPCIONES.map((o) => {
        const activo = mood === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={o.label}
            style={({ pressed }) => ({
              minWidth: 56,
              minHeight: 56,
              paddingHorizontal: space(2),
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: activo ? 2 : 1,
              borderColor: activo ? COLOR[o.key] : BRAND.borderLight,
              backgroundColor: activo ? BRAND.white : 'transparent',
              opacity: pressed ? 0.7 : 1,
              transform:
                pressed && !t.reduceMotion ? [{ scale: 0.95 }] : undefined,
            })}
          >
            <Txt style={{ fontSize: 24 }}>{o.emoji}</Txt>
            {activo ? (
              // El estado seleccionado se nombra, no solo se colorea.
              <Txt
                variant="tiny"
                color={COLOR[o.key]}
                weight="700"
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {o.label}
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  const Boton = (
    <Pressable
      onPress={onRecommendations}
      accessibilityRole="button"
      accessibilityLabel="Ver recomendaciones del coach"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        minHeight: 48,
        paddingHorizontal: space(4),
        borderRadius: radius.pill,
        backgroundColor: BRAND.yellow,
        opacity: pressed ? 0.88 : 1,
        transform: pressed && !t.reduceMotion ? [{ scale: 0.97 }] : undefined,
      })}
    >
      <Txt variant="body" color={BRAND.navy} weight="800" numberOfLines={1}>
        Ver recomendaciones
      </Txt>
      <ChevronRight size={18} color={BRAND.navy} strokeWidth={2.6} />
    </Pressable>
  );

  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        backgroundColor: 'rgba(7,26,42,0.04)',
        borderRadius: radius.lg,
        padding: space(4),
      }}
    >
      <Txt variant="body" color={BRAND.ink} weight="700">
        ¿Como te sientes con tu plata?
      </Txt>

      <View style={{ height: space(3) }} />

      {enDosFilas ? (
        <View style={{ gap: space(3) }}>
          {Emojis}
          {Boton}
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space(3),
          }}
        >
          {Emojis}
          <View style={{ flex: 1, minWidth: 0 }}>{Boton}</View>
        </View>
      )}

      <View style={{ height: space(3) }} />
      <Txt variant="small" color={BRAND.mutedDark}>
        {supportText}
      </Txt>
    </View>
  );
}
