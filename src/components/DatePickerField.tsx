import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button, Card, Row, Spacer, Txt } from './ui';
import { format, parseISO } from '@/utils/date';
import { es } from 'date-fns/locale';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Calendario propio.
 *
 * Se escribe a mano en vez de usar @react-native-community/datetimepicker
 * para no agregar otra dependencia nativa (cada una obliga a recompilar y
 * puede romper el build). Ademas, asi el calendario se ve igual en todos
 * los telefonos y respeta la paleta de Mi Platica.
 */
export function DatePickerField({
  value,
  onChange,
  placeholder = 'Elegir fecha',
  minToday,
  clearable = true,
}: {
  /** 'YYYY-MM-DD' o null. */
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  minToday?: boolean;
  clearable?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  const etiqueta = value
    ? format(parseISO(value), "d 'de' LLLL 'de' yyyy", { locale: es })
    : placeholder;

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
          paddingVertical: t.space(3.5),
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Row justify="space-between">
          <Txt variant="body" color={value ? t.text : t.textFaint} numberOfLines={1}>
            {etiqueta}
          </Txt>
          <Txt variant="small" faint>
            {value ? 'cambiar' : 'elegir'}
          </Txt>
        </Row>
      </Pressable>

      <CalendarModal
        visible={open}
        value={value}
        minToday={minToday}
        clearable={clearable}
        onClose={() => setOpen(false)}
        onPick={(d) => {
          onChange(d);
          setOpen(false);
        }}
      />
    </>
  );
}

function CalendarModal({
  visible,
  value,
  onClose,
  onPick,
  minToday,
  clearable,
}: {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onPick: (date: string | null) => void;
  minToday?: boolean;
  clearable?: boolean;
}) {
  const t = useTheme();
  const base = value ? parseISO(value) : new Date();
  const [cursor, setCursor] = useState(new Date(base.getFullYear(), base.getMonth(), 1));

  React.useEffect(() => {
    if (visible) {
      const b = value ? parseISO(value) : new Date();
      setCursor(new Date(b.getFullYear(), b.getMonth(), 1));
    }
  }, [visible, value]);

  const celdas = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const primero = new Date(year, month, 1);
    // getDay(): 0=domingo. Se convierte a semana que empieza en lunes.
    const offset = (primero.getDay() + 6) % 7;
    const dias = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= dias; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const hoy = new Date();
  const hoyKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  function keyFor(dia: number) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-${String(dia).padStart(2, '0')}`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.overlay }} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          left: t.space(4),
          right: t.space(4),
          top: '18%',
          backgroundColor: t.bgElevated,
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.border,
          padding: t.space(4),
          ...t.shadow,
        }}
      >
        <Row justify="space-between">
          <Pressable
            onPress={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            hitSlop={14}
            style={{ padding: 4 }}
          >
            <Txt variant="h3" color={t.primary}>
              {'<'}
            </Txt>
          </Pressable>
          <Txt variant="h3">
            {format(cursor, 'LLLL yyyy', { locale: es })}
          </Txt>
          <Pressable
            onPress={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            hitSlop={14}
            style={{ padding: 4 }}
          >
            <Txt variant="h3" color={t.primary}>
              {'>'}
            </Txt>
          </Pressable>
        </Row>

        <Spacer h={3} />
        <Row>
          {DIAS.map((d, i) => (
            <View key={`${d}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
              <Txt variant="tiny" faint weight="700">
                {d}
              </Txt>
            </View>
          ))}
        </Row>

        <Spacer h={2} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {celdas.map((dia, i) => {
            if (dia === null) {
              return <View key={`v-${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />;
            }
            const k = keyFor(dia);
            const sel = k === value;
            const esHoy = k === hoyKey;
            const bloqueado = minToday ? k < hoyKey : false;

            return (
              <Pressable
                key={k}
                disabled={bloqueado}
                onPress={() => onPick(k)}
                style={{
                  width: `${100 / 7}%`,
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: sel ? t.primary : 'transparent',
                    borderWidth: esHoy && !sel ? 1 : 0,
                    borderColor: t.primary,
                    opacity: bloqueado ? 0.25 : 1,
                  }}
                >
                  <Txt
                    variant="small"
                    color={sel ? t.onPrimary : t.text}
                    weight={sel || esHoy ? '700' : '500'}
                  >
                    {dia}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Spacer h={3} />
        <Row gap={2}>
          <Button
            label="Hoy"
            tone="neutral"
            size="sm"
            style={{ flex: 1 }}
            onPress={() => onPick(hoyKey)}
          />
          {clearable ? (
            <Button
              label="Sin fecha"
              tone="ghost"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => onPick(null)}
            />
          ) : null}
          <Button label="Cerrar" tone="ghost" size="sm" onPress={onClose} />
        </Row>
      </View>
    </Modal>
  );
}

/** Selector compacto de rango, para la pantalla de Analisis. */
export function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const t = useTheme();
  return (
    <Row gap={2}>
      <View style={{ flex: 1 }}>
        <Txt variant="tiny" faint weight="700">
          DESDE
        </Txt>
        <Spacer h={1.5} />
        <DatePickerField
          value={from}
          clearable={false}
          onChange={(d) => d && onChange(d, to < d ? d : to)}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="tiny" faint weight="700">
          HASTA
        </Txt>
        <Spacer h={1.5} />
        <DatePickerField
          value={to}
          clearable={false}
          onChange={(d) => d && onChange(from > d ? d : from, d)}
        />
      </View>
    </Row>
  );
}
