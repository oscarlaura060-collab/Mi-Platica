import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { ArrowDownToLine, ArrowUp, ChartNoAxesColumn } from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Txt } from '@/components/ui';

type Accion = {
  key: 'income' | 'expense' | 'coach';
  label: string;
  a11y: string;
  bg: string;
  fg: string;
  Icon: typeof ArrowUp;
};

const ACCIONES: Accion[] = [
  {
    key: 'income',
    label: 'Ingreso',
    a11y: 'Registrar ingreso',
    bg: BRAND.turquoise,
    fg: BRAND.navy,
    Icon: ArrowDownToLine,
  },
  {
    key: 'expense',
    label: 'Gasto',
    a11y: 'Registrar gasto',
    bg: BRAND.coral,
    fg: BRAND.white,
    Icon: ArrowUp,
  },
  {
    key: 'coach',
    label: 'Coach',
    a11y: 'Abrir coach financiero',
    bg: BRAND.yellow,
    fg: BRAND.navy,
    Icon: ChartNoAxesColumn,
  },
];

/**
 * Las tres acciones que deben verse SIN hacer scroll.
 *
 * En pantallas estrechas (360px) el texto no se trunca: se reduce el
 * relleno y, si aun asi no cabe, el icono se oculta antes que la
 * etiqueta. La palabra es lo que comunica; el icono acompaña.
 */
export function QuickActions({
  onIncome,
  onExpense,
  onCoach,
}: {
  onIncome: () => void;
  onExpense: () => void;
  onCoach: () => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();

  // 20px de margen a cada lado + 2 huecos de 10px entre tres botones.
  const anchoBoton = (width - space(5) * 2 - space(2.5) * 2) / 3;
  // "Ingreso" es la etiqueta mas larga: ~58px a 15px/800. Con icono (20) y
  // separacion (6) necesita 100px mas el relleno. Por eso a 360dp, donde
  // cada boton mide 100px, el icono tiene que desaparecer: la etiqueta
  // nunca se corta.
  const estrecho = anchoBoton < 112;
  const muyEstrecho = anchoBoton < 104;

  const handlers = { income: onIncome, expense: onExpense, coach: onCoach };

  return (
    <View style={{ flexDirection: 'row', gap: space(2.5) }}>
      {ACCIONES.map(({ key, label, a11y, bg, fg, Icon }) => (
        <Pressable
          key={key}
          onPress={handlers[key]}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: muyEstrecho ? 0 : 6,
            backgroundColor: bg,
            borderRadius: radius.pill,
            paddingHorizontal: estrecho ? space(2) : space(3),
            opacity: pressed ? 0.85 : 1,
            transform: pressed && !t.reduceMotion ? [{ scale: 0.97 }] : undefined,
          })}
        >
          {muyEstrecho ? null : <Icon size={20} color={fg} strokeWidth={2.4} />}
          <Txt variant="body" color={fg} weight="800" numberOfLines={1}>
            {label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
