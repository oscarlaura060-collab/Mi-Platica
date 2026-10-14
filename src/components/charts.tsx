import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { ProgressBar, Row, Spacer, Txt } from './ui';
import { money, moneyCompact } from '@/utils/money';
import { prettyDay, shortWeekday } from '@/utils/date';

/**
 * Barras diarias. Sin librerias de grafica: Views con altura proporcional.
 * Rapido, cero dependencias y controla el pixel exacto.
 */
export function DailyBars({
  data,
  highlightDay,
  onSelect,
  height = 150,
}: {
  data: { day: string; expense: number; income: number }[];
  highlightDay?: string | null;
  onSelect?: (day: string) => void;
  height?: number;
}) {
  const t = useTheme();
  const max = Math.max(...data.map((d) => d.expense), 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
        {data.map((d) => {
          const isPeak = d.day === highlightDay;
          const h = Math.max((d.expense / max) * (height - 34), d.expense > 0 ? 4 : 2);
          return (
            <Pressable
              key={d.day}
              onPress={() => onSelect?.(d.day)}
              style={{ alignItems: 'center', width: 26 }}
            >
              <Txt variant="tiny" faint>
                {isPeak ? moneyCompact(d.expense) : ''}
              </Txt>
              <View
                style={{
                  width: 14,
                  height: h,
                  borderRadius: 7,
                  marginTop: 4,
                  backgroundColor: isPeak
                    ? t.danger
                    : d.expense > 0
                      ? t.primary
                      : t.border,
                }}
              />
              <Txt variant="tiny" faint style={{ marginTop: 6 }}>
                {d.day.slice(8)}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** Dona de distribucion por categoria (react-native-svg). */
export function Donut({
  slices,
  size = 170,
  thickness = 22,
  centerTop,
  centerBottom,
}: {
  slices: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const t = useTheme();
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={t.cardAlt}
            strokeWidth={thickness}
            fill="none"
          />
          {slices.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                fill="none"
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {centerTop ? (
          <Txt variant="tiny" faint>
            {centerTop}
          </Txt>
        ) : null}
        {centerBottom ? <Txt variant="h3">{centerBottom}</Txt> : null}
      </View>
    </View>
  );
}

/** Patron semanal: que dia de la semana gastas mas. */
export function WeekdayPattern({
  data,
}: {
  data: { wd: number; total: number }[];
}) {
  const t = useTheme();
  const names = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const max = Math.max(...data.map((d) => d.total), 1);
  const peak = data.reduce((a, b) => (b.total > (a?.total ?? 0) ? b : a), data[0]);

  return (
    <View style={{ gap: t.space(2) }}>
      {names.map((n, i) => {
        const row = data.find((d) => d.wd === i);
        const v = row?.total ?? 0;
        const isPeak = peak && row?.wd === peak.wd && v > 0;
        return (
          <Row key={n} gap={2}>
            <Txt variant="tiny" faint style={{ width: 28 }}>
              {n}
            </Txt>
            <View
              style={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                backgroundColor: t.cardAlt,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${(v / max) * 100}%`,
                  height: '100%',
                  backgroundColor: isPeak ? t.danger : t.primary,
                }}
              />
            </View>
            <Txt variant="tiny" muted style={{ width: 74, textAlign: 'right' }}>
              {money(v)}
            </Txt>
          </Row>
        );
      })}
    </View>
  );
}

/**
 * Dos barras: ingresos (turquesa) contra gastos (coral). Es la lectura
 * mas rapida posible de "cuanto entro y cuanto salio".
 */
export function TwoBars({
  income,
  expense,
  label,
}: {
  income: number;
  expense: number;
  label?: string;
}) {
  const t = useTheme();
  const max = Math.max(income, expense, 1);

  const Fila = ({
    titulo,
    valor,
    color,
  }: {
    titulo: string;
    valor: number;
    color: string;
  }) => (
    <View>
      <Row justify="space-between" gap={2}>
        <Txt variant="small" muted>
          {titulo}
        </Txt>
        <Txt variant="body" weight="700" numberOfLines={1} color={color}>
          {money(valor)}
        </Txt>
      </Row>
      <Spacer h={1.5} />
      <ProgressBar value={(valor / max) * 100} color={color} height={10} />
    </View>
  );

  return (
    <View>
      {label ? (
        <>
          <Txt variant="tiny" faint weight="700">
            {label.toUpperCase()}
          </Txt>
          <Spacer h={3} />
        </>
      ) : null}
      <Fila titulo="Ingresos" valor={income} color={t.primary} />
      <Spacer h={3} />
      <Fila titulo="Gastos" valor={expense} color={t.danger} />
    </View>
  );
}

/**
 * Linea de como evoluciona el saldo en el periodo.
 *
 * Se reconstruye hacia atras desde el saldo de HOY aplicando los
 * movimientos de cada dia: asi la curva muestra el saldo real que hubo,
 * no una suma arbitraria.
 */
export function MiniTrend({
  data,
  balance,
  height = 120,
}: {
  data: { day: string; expense: number; income: number }[];
  balance: number;
  height?: number;
}) {
  const t = useTheme();

  const puntos = React.useMemo(() => {
    if (!data.length) return [];
    const out: { day: string; value: number }[] = new Array(data.length);
    let acc = balance;
    for (let i = data.length - 1; i >= 0; i--) {
      out[i] = { day: data[i].day, value: acc };
      acc = acc - data[i].income + data[i].expense;
    }
    return out;
  }, [data, balance]);

  if (puntos.length < 2) {
    return (
      <Txt variant="small" muted>
        Registra algunos movimientos y aqui veras como evoluciona tu dinero.
      </Txt>
    );
  }

  const valores = puntos.map((p) => p.value);
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const span = max - min || 1;
  const W = 320;
  const H = height;

  const coords = puntos.map((p, i) => ({
    x: (i / (puntos.length - 1)) * W,
    y: H - ((p.value - min) / span) * (H - 18) - 9,
  }));

  const linea = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const area = `${linea} L ${W} ${H} L 0 ${H} Z`;

  const subio = valores[valores.length - 1] >= valores[0];
  const color = subio ? t.primary : t.danger;

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.28" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#trendFill)" />
        <Path
          d={linea}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle
          cx={coords[coords.length - 1].x - 2}
          cy={coords[coords.length - 1].y}
          r={4}
          fill={color}
        />
      </Svg>
      <Spacer h={2} />
      <Row justify="space-between">
        <Txt variant="tiny" faint>
          {prettyDay(puntos[0].day)}
        </Txt>
        <Txt variant="tiny" color={color} weight="700">
          {subio ? 'subio' : 'bajo'} {money(Math.abs(valores[valores.length - 1] - valores[0]))}
        </Txt>
        <Txt variant="tiny" faint>
          hoy
        </Txt>
      </Row>
    </View>
  );
}

export { shortWeekday };
