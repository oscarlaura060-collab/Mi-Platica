import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/theme';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ProgressBar,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { DateRangeField } from '@/components/DatePickerField';
import { DailyBars, Donut, MiniTrend, TwoBars, WeekdayPattern } from '@/components/charts';
import {
  activeDays,
  byCategory,
  byWeekday,
  dailySeries,
  peakSpendingDay,
  periodTotals,
  topExpenses,
} from '@/db/repositories/stats';
import { listFixedIncomes, type FixedIncomeStatus } from '@/db/repositories/fixedIncomes';
import { useAppStore } from '@/store/useAppStore';
import {
  payCycles,
  previousRange,
  standardRanges,
  type Range,
} from '@/domain/period/cycles';
import { money, pct } from '@/utils/money';

type Totales = Awaited<ReturnType<typeof periodTotals>>;

export function DashboardScreen() {
  const t = useTheme();
  const { total } = useAppStore();

  const [ingresos, setIngresos] = useState<FixedIncomeStatus[]>([]);
  const [rango, setRango] = useState<Range>(() => standardRanges()[3]); // Este mes
  const [custom, setCustom] = useState(false);

  const [serie, setSerie] = useState<
    { day: string; expense: number; income: number }[]
  >([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [previos, setPrevios] = useState<Totales | null>(null);
  const [cats, setCats] = useState<Awaited<ReturnType<typeof byCategory>>>([]);
  const [peak, setPeak] = useState<{ day: string; total: number; n: number } | null>(null);
  const [weekdays, setWeekdays] = useState<{ wd: number; total: number }[]>([]);
  const [mayores, setMayores] = useState<Awaited<ReturnType<typeof topExpenses>>>([]);
  const [diasConGasto, setDiasConGasto] = useState(0);

  useEffect(() => {
    listFixedIncomes().then(setIngresos);
  }, []);

  const estandar = useMemo(() => standardRanges(), []);

  const load = useCallback(async () => {
    const anterior = previousRange(rango);
    const [s, tt, prev, c, p, w, top, dias] = await Promise.all([
      dailySeries(rango.from, rango.to),
      periodTotals(rango.from, rango.to),
      periodTotals(anterior.from, anterior.to),
      byCategory(rango.from, rango.to, 8),
      peakSpendingDay(rango.from, rango.to),
      byWeekday(rango.from, rango.to),
      topExpenses(rango.from, rango.to, 5),
      activeDays(rango.from, rango.to),
    ]);
    setSerie(s);
    setTotales(tt);
    setPrevios(prev);
    setCats(c);
    setPeak(p ?? null);
    setWeekdays(w);
    setMayores(top);
    setDiasConGasto(dias);
  }, [rango]);

  useEffect(() => {
    load();
  }, [load]);

  const ingresoPeriodo = totales?.income ?? 0;
  const gastoPeriodo = totales?.expense ?? 0;
  const balance = totales?.net ?? 0;
  const tasaAhorro = pct(balance, ingresoPeriodo);

  return (
    <div className="w-full flex flex-col min-h-screen px-4 sm:px-6 py-6 pb-28 max-w-4xl mx-auto">
      <div className="mb-4">
        <span className="block text-[11px] font-extrabold uppercase tracking-wider" style={{ color: t.primary }}>
          RADIOGRAFÍA FINANCIERA
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: t.text }}>
          Análisis de tu plata
        </h1>
      </div>

      {/* Selector de periodo */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {estandar.map((r) => (
          <Chip
            key={r.label}
            label={r.label}
            active={!custom && rango.label === r.label}
            onPress={() => {
              setCustom(false);
              setRango(r);
            }}
          />
        ))}
        <Chip
          label="Personalizado"
          active={custom}
          onPress={() => setCustom(true)}
        />
      </div>

      {custom ? (
        <Card tone="alt" className="mb-5 p-4">
          <DateRangeField
            from={rango.from}
            to={rango.to}
            onChange={(from, to) => setRango({ label: 'Personalizado', from, to })}
          />
        </Card>
      ) : null}

      {/* Ingresos vs Gastos */}
      <Card tone="primary" glass className="mb-5 p-5 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textFaint }}>
            Balance del periodo
          </span>
          <Badge
            label={balance >= 0 ? `+${money(balance)}` : money(balance)}
            tone={balance >= 0 ? 'ok' : 'danger'}
          />
        </div>

        <TwoBars income={ingresoPeriodo} expense={gastoPeriodo} />

        {ingresoPeriodo > 0 ? (
          <div className="mt-4 pt-3 border-t flex justify-between text-xs font-semibold" style={{ borderColor: t.border }}>
            <span style={{ color: t.textFaint }}>Tasa de ahorro del periodo:</span>
            <span style={{ color: balance >= 0 ? t.primary : t.danger }}>
              {Math.round(tasaAhorro)}%
            </span>
          </div>
        ) : null}
      </Card>

      {/* Gráfico diario */}
      {serie.length > 0 ? (
        <Card className="mb-5 p-5">
          <SectionTitle title="Gasto por día" />
          <DailyBars data={serie} highlightDay={peak?.day} />
        </Card>
      ) : null}

      {/* Distribución por Categorías */}
      {cats.length > 0 ? (
        <Card className="mb-5 p-5">
          <SectionTitle title="Distribución por categorías" />
          <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
            <Donut
              slices={cats.map((c) => ({ value: c.total, color: c.color || t.primary }))}
              centerTop="Total"
              centerBottom={money(gastoPeriodo)}
            />

            <div className="flex-1 w-full space-y-2.5">
              {cats.map((c) => {
                const p = pct(c.total, gastoPeriodo);
                return (
                  <div key={c.category_id} className="text-xs">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="flex items-center gap-1.5" style={{ color: t.text }}>
                        <span>{c.emoji || '•'}</span>
                        <span>{c.name}</span>
                      </span>
                      <span style={{ color: t.textMuted }}>
                        {money(c.total)} ({Math.round(p)}%)
                      </span>
                    </div>
                    <ProgressBar value={p} color={c.color || t.primary} height={6} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Patrón semanal */}
      {weekdays.length > 0 ? (
        <Card className="mb-5 p-5">
          <SectionTitle title="Días con mayor gasto semanal" />
          <WeekdayPattern data={weekdays} />
        </Card>
      ) : null}

      {/* Tendencia de saldo */}
      <Card className="p-5">
        <SectionTitle title="Evolución de saldo" />
        <MiniTrend data={serie} balance={total} />
      </Card>
    </div>
  );
}
