import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

/**
 * Teclado numerico propio: evita el teclado del sistema (lento, tapa la
 * pantalla) y permite registrar un gasto en 2 toques. Acumula PESOS enteros.
 */
export function Keypad({
  onChange,
  value,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const t = useTheme();

  const press = useCallback(
    (k: string) => {
      Haptics.selectionAsync().catch(() => undefined);
      if (k === 'del') return onChange(Math.floor(value / 10));
      if (k === '000') {
        const next = value * 1000;
        return onChange(next > 99_999_999 ? value : next);
      }
      const next = value * 10 + Number(k);
      onChange(next > 99_999_999 ? value : next);
    },
    [value, onChange],
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: t.space(2.5),
      }}
    >
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => press(k)}
          onLongPress={k === 'del' ? () => onChange(0) : undefined}
          style={({ pressed }) => ({
            width: '31.5%',
            height: 62,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: t.radius.md,
            backgroundColor: pressed ? t.cardAlt : t.card,
            borderWidth: 1,
            borderColor: t.border,
          })}
        >
          <Text style={{ color: t.text, fontSize: k === 'del' ? 20 : 24, fontWeight: '600' }}>
            {k === 'del' ? '<' : k}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
