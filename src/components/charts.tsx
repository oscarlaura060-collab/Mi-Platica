import React from 'react';
import { useTheme } from '@/theme';
import { ProgressBar, Row, Spacer, Txt } from './ui';
import { money, moneyCompact } from '@/utils/money';
import { prettyDay, shortWeekday } from '@/utils/date';

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
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-end gap-2 min-w-max px-1" style={{ height }}>
        {data.map((d) => {
          const isPeak = d.day === highlightDay;
          const h = Math.max((d.expense / max) * (height - 34), d.expense > 0 ? 6 : 2);
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => onSelect?.(d.day)}
              className="flex flex-col items-center w-7 cursor-pointer group transition-all"
            >
              <span className="text-[10px] font-bold h-4 text-center leading-none" style={{ color: isPeak ? t.danger : t.textFaint }}>
                {isPeak ? moneyCompact(d.expense) : ''}
              </span>
              <div
                className="w-3.5 rounded-full transition-all group-hover:opacity-80"
                style={{
                  height: h,
                  backgroundColor: isPeak
                    ? t.danger
                    : d.expense > 0
                      ? t.primary
                      : t.border,
                }}
              />
              <span className="text-[10px] font-medium mt-1.5" style={{ color: t.textFaint }}>
                {d.day.slice(8)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
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
            <circle
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
              className="transition-all duration-300"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
        {centerTop ? (
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textFaint }}>
            {centerTop}
          </span>
        ) : null}
        {centerBottom ? (
          <span className="text-lg font-bold tracking-tight" style={{ color: t.text }}>
            {centerBottom}
          </span>
        ) : null}
      </div>
    </div>
  );
}

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
    <div className="flex flex-col gap-2">
      {names.map((n, i) => {
        const row = data.find((d) => d.wd === i);
        const v = row?.total ?? 0;
        const isPeak = peak && row?.wd === peak.wd && v > 0;
        return (
          <div key={n} className="flex items-center gap-2">
            <span className="w-7 text-[11px] font-bold uppercase tracking-wider" style={{ color: t.textFaint }}>
              {n}
            </span>
            <div
              className="flex-1 h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: t.cardAlt }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(v / max) * 100}%`,
                  backgroundColor: isPeak ? t.danger : t.primary,
                }}
              />
            </div>
            <span className="w-20 text-[11px] font-bold text-right" style={{ color: t.textMuted }}>
              {money(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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

  return (
    <div>
      {label ? (
        <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.textFaint }}>
          {label}
        </div>
      ) : null}

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1 text-sm font-semibold">
          <span style={{ color: t.textMuted }}>Ingresos</span>
          <span style={{ color: t.primary }}>{money(income)}</span>
        </div>
        <ProgressBar value={(income / max) * 100} color={t.primary} height={10} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1 text-sm font-semibold">
          <span style={{ color: t.textMuted }}>Gastos</span>
          <span style={{ color: t.danger }}>{money(expense)}</span>
        </div>
        <ProgressBar value={(expense / max) * 100} color={t.danger} height={10} />
      </div>
    </div>
  );
}

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
        Registra algunos movimientos y aquí verás cómo evoluciona tu dinero.
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
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path
          d={linea}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={coords[coords.length - 1].x - 2}
          cy={coords[coords.length - 1].y}
          r={4}
          fill={color}
        />
      </svg>
      <Spacer h={2} />
      <div className="flex justify-between items-center text-xs font-semibold">
        <span style={{ color: t.textFaint }}>{prettyDay(puntos[0].day)}</span>
        <span style={{ color }}>
          {subio ? 'subió' : 'bajó'} {money(Math.abs(valores[valores.length - 1] - valores[0]))}
        </span>
        <span style={{ color: t.textFaint }}>hoy</span>
      </div>
    </div>
  );
}

export { shortWeekday };
