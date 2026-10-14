import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button, Row, Spacer, Txt } from './ui';
import { nextDueDate, format } from '@/utils/date';
import { es } from 'date-fns/locale';

/**
 * Elige un DIA DEL MES (1-31) para algo que se repite.
 *
 * No se usa un calendario normal porque la fecha no es un dia concreto
 * sino uno que vuelve cada mes. Debajo se muestra la proxima vez que cae,
 * que es lo que la persona quiere saber.
 */
export function DayOfMonthField({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (day: number) => void;
  label?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const proxima = nextDueDate(value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          backgroundColor: t.mode === 'dark' ? t.cardAlt : t.bgElevated,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.border,
          paddingHorizontal: t.space(3.5),
          paddingVertical: t.space(3),
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Row justify="space-between" gap={2}>
          <View style={{ flex: 1 }}>
            {label ? (
              <>
                <Txt variant="tiny" faint>
                  {label}
                </Txt>
                <Spacer h={1} />
              </>
            ) : null}
            <Txt variant="body" weight="700">
              Dia {value}
            </Txt>
            <Spacer h={1} />
            <Txt variant="tiny" faint>
              Proxima vez: {format(proxima, "d 'de' LLLL", { locale: es })}
            </Txt>
          </View>
          <Txt variant="small" color={t.primary}>
            cambiar
          </Txt>
        </Row>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: t.overlay }}
          onPress={() => setOpen(false)}
        />
        <View
          style={{
            position: 'absolute',
            left: t.space(4),
            right: t.space(4),
            top: '20%',
            backgroundColor: t.bgElevated,
            borderRadius: t.radius.xl,
            borderWidth: 1,
            borderColor: t.border,
            padding: t.space(4),
            ...t.shadow,
          }}
        >
          <Txt variant="h3" align="center">
            {label ?? 'Elige el dia'}
          </Txt>
          <Spacer h={3} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const sel = d === value;
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    onChange(d);
                    setOpen(false);
                  }}
                  style={{
                    width: `${100 / 7}%`,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: sel ? t.primary : 'transparent',
                    }}
                  >
                    <Txt
                      variant="small"
                      color={sel ? t.onPrimary : t.text}
                      weight={sel ? '700' : '500'}
                    >
                      {d}
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Spacer h={2} />
          <Txt variant="tiny" faint align="center">
            Si el mes no tiene ese dia (por ejemplo 31 en febrero), se usa el
            ultimo dia del mes.
          </Txt>
          <Spacer h={3} />
          <Button label="Cerrar" tone="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}
