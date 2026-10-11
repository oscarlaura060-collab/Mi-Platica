import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button, Row, Spacer, Txt } from './ui';

/** 20 -> "8:00 p. m." */
export function formatHour(hour: number, minute = 0): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const sufijo = hour < 12 ? 'a. m.' : 'p. m.';
  return `${h12}:${String(minute).padStart(2, '0')} ${sufijo}`;
}

/**
 * Selector de hora propio.
 *
 * Igual que el calendario: se escribe a mano en vez de agregar
 * @react-native-community/datetimepicker, para no sumar otra dependencia
 * nativa por un control que se usa en dos pantallas.
 */
export function TimePickerField({
  hour,
  minute,
  onChange,
  label,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  label?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

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
            <Txt variant="h3">{formatHour(hour, minute)}</Txt>
          </View>
          <Txt variant="small" color={t.primary}>
            cambiar
          </Txt>
        </Row>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: t.overlay }}
          onPress={() => setOpen(false)}
        />
        <View
          style={{
            position: 'absolute',
            left: t.space(4),
            right: t.space(4),
            top: '22%',
            backgroundColor: t.bgElevated,
            borderRadius: t.radius.xl,
            borderWidth: 1,
            borderColor: t.border,
            padding: t.space(4),
            ...t.shadow,
          }}
        >
          <Txt variant="h3" align="center">
            {label ?? '¿A que hora?'}
          </Txt>
          <Spacer h={3} />

          <Row gap={3}>
            {/* HORA */}
            <View style={{ flex: 2 }}>
              <Txt variant="tiny" faint weight="700" align="center">
                HORA
              </Txt>
              <Spacer h={2} />
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                  const sel = h === hour;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => onChange(h, minute)}
                      style={{
                        paddingVertical: 10,
                        borderRadius: t.radius.sm,
                        backgroundColor: sel ? t.primary : 'transparent',
                        marginBottom: 4,
                      }}
                    >
                      <Txt
                        variant="body"
                        align="center"
                        color={sel ? t.onPrimary : t.text}
                        weight={sel ? '700' : '500'}
                      >
                        {formatHour(h, 0)}
                      </Txt>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* MINUTOS */}
            <View style={{ flex: 1 }}>
              <Txt variant="tiny" faint weight="700" align="center">
                MIN
              </Txt>
              <Spacer h={2} />
              {[0, 15, 30, 45].map((m) => {
                const sel = m === minute;
                return (
                  <Pressable
                    key={m}
                    onPress={() => onChange(hour, m)}
                    style={{
                      paddingVertical: 10,
                      borderRadius: t.radius.sm,
                      backgroundColor: sel ? t.primary : 'transparent',
                      marginBottom: 4,
                    }}
                  >
                    <Txt
                      variant="body"
                      align="center"
                      color={sel ? t.onPrimary : t.text}
                      weight={sel ? '700' : '500'}
                    >
                      :{String(m).padStart(2, '0')}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </Row>

          <Spacer h={3} />
          <Button label="Listo" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}
