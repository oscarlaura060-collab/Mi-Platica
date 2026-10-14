import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  FadeIn,
  ProgressBar,
  Row,
  Screen,
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
import { prettyDay, format, parseISO } from '@/utils/date';
import { es } from 'date-fns/locale';
import { money, pct } from '@/utils/money';

type Totales = Awaited<ReturnType<typeof periodTotals>>;

/**
 * ANALISIS
 * Todo responde al periodo elegido: chips rapidos, ciclos de pago
 * (quincenas reales del usuario) o un rango a mano con calendario.
 */
export function DashboardScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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

  const ciclos = useMemo(() => payCycles(ingresos), [ingresos]);
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const catTotal = cats.reduce((a, c) => a + c.total, 0);
  const promedioDia = rango.days > 0 ? Math.round((totales?.expense ?? 0) / rango.days) : 0;

  // Comparacion contra el periodo anterior del mismo largo.
  const variacion = useMemo(() => {
    if (!totales || !previos || previos.expense === 0) return null;
    const delta = totales.expense - previos.expense;
    return {
      delta,
      pctChange: (delta / previos.expense) * 100,
      subio: delta > 0,
    };
  }, [totales, previos]);

  const etiquetaRango =
    rango.days === 1
      ? prettyDay(rango.from)
      : `${format(parseISO(rango.from), 'd LLL', { locale: es })} – ${format(
          parseISO(rango.to),
          'd LLL',
          { locale: es },
        )}`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Analisis</Txt>
        <Spacer h={1} />
        <Txt variant="small" muted>
          {etiquetaRango} · {rango.days} dia{rango.days > 1 ? 's' : ''}
        </Txt>

        {/* SELECTOR DE PERIODO */}
        <Spacer h={4} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap={2}>
            {estandar.map((r) => (
              <Chip
                key={r.key}
                label={r.label}
                active={!custom && rango.key === r.key}
                onPress={() => {
                  setCustom(false);
                  setRango(r);
                }}
              />
            ))}
            {ciclos.map((r) => (
              <Chip
                key={r.key}
                label={r.label}
                color={t.warn}
                active={!custom && rango.key === r.key}
                onPress={() => {
                  setCustom(false);
                  setRango(r);
                }}
              />
            ))}
            <Chip
              label="Escoger fechas"
              color={t.violet}
              active={custom}
              onPress={() => setCustom(true)}
            />
          </Row>
        </ScrollView>

        {custom ? (
          <>
            <Spacer h={3} />
            <Card tone="alt">
              <DateRangeField
                from={rango.from}
                to={rango.to}
                onChange={(from, to) => {
                  const dias =
                    Math.round(
                      (new Date(to + 'T00:00:00').getTime() -
                        new Date(from + 'T00:00:00').getTime()) /
                        86_400_000,
                    ) + 1;
                  setRango({ key: 'custom', label: 'Personalizado', from, to, days: dias });
                }}
              />
            </Card>
          </>
        ) : null}

        {ciclos.length && !custom ? (
          <>
            <Spacer h={2} />
            <Txt variant="tiny" faint>
              Las quincenas van de un dia de cobro al siguiente, no del 1 al 30.
            </Txt>
          </>
        ) : null}

        {/* SIN DATOS */}
        {totales && totales.count === 0 ? (
          <>
            <Spacer h={5} />
            <EmptyState
              title="Sin movimientos en este periodo"
              subtitle="Elige otro rango o registra algunos movimientos."
            />
          </>
        ) : null}

        {totales && totales.count > 0 ? (
          <>
            {/* RESUMEN */}
            <Spacer h={5} />
            <FadeIn>
              <Card glass>
                <Txt variant="tiny" faint weight="700">
                  BALANCE DEL PERIODO
                </Txt>
                <Spacer h={1} />
                <Txt
                  variant="h1"
                  numberOfLines={1}
                  color={totales.net >= 0 ? t.primary : t.danger}
                >
                  {totales.net >= 0 ? '+' : ''}
                  {money(totales.net)}
                </Txt>
                <Spacer h={3} />
                <TwoBars income={totales.income} expense={totales.expense} />
              </Card>
            </FadeIn>

            {/* A DONDE SE FUE */}
            {totales.outflow > 0 ? (
              <>
                <Spacer h={3} />
                <FadeIn delay={60}>
                  <Card>
                    <Txt variant="tiny" faint weight="700">
                      A DONDE SE FUE TU PLATA
                    </Txt>
                    <Spacer h={3} />
                    {(
                      [
                        ['Gastos', totales.expense, t.danger],
                        ['Pagos de deuda', totales.debtPaid, t.warn],
                        ['A tus metas', totales.saved, t.primary],
                      ] as [string, number, string][]
                    )
                      .filter(([, v]) => v > 0)
                      .map(([label, valor, color]) => (
                        <View key={label}>
                          <Row justify="space-between" gap={2}>
                            <Txt variant="small" muted>
                              {label}
                            </Txt>
                            <Txt variant="body" weight="700" numberOfLines={1}>
                              {money(valor)}
                            </Txt>
                          </Row>
                          <Spacer h={1.5} />
                          <ProgressBar
                            value={pct(valor, totales.outflow)}
                            color={color}
                            height={8}
                          />
                          <Spacer h={2.5} />
                        </View>
                      ))}
                    <Txt variant="tiny" faint>
                      Los pagos de deuda y los aportes a metas salen de tu cuenta
                      pero no son gasto: uno baja lo que debes y el otro es
                      ahorro tuyo.
                    </Txt>
                  </Card>
                </FadeIn>
              </>
            ) : null}

            {/* COMPARACION */}
            {variacion ? (
              <>
                <Spacer h={3} />
                <FadeIn delay={100}>
                  <Card tone={variacion.subio ? 'warn' : 'primary'}>
                    <Row justify="space-between" align="flex-start" gap={2}>
                      <View style={{ flex: 1 }}>
                        <Txt variant="tiny" faint weight="700">
                          VS. EL PERIODO ANTERIOR
                        </Txt>
                        <Spacer h={2} />
                        <Txt variant="h3">
                          {variacion.subio ? 'Gastaste mas' : 'Gastaste menos'}
                        </Txt>
                        <Spacer h={1} />
                        <Txt variant="small" muted>
                          {money(Math.abs(variacion.delta))} (
                          {Math.abs(variacion.pctChange).toFixed(0)}%)
                          {variacion.subio ? ' por encima' : ' por debajo'} de los{' '}
                          {money(previos?.expense ?? 0)} anteriores.
                        </Txt>
                      </View>
                      <Badge
                        label={`${variacion.subio ? '+' : '-'}${Math.abs(variacion.pctChange).toFixed(0)}%`}
                        tone={variacion.subio ? 'warn' : 'ok'}
                      />
                    </Row>
                  </Card>
                </FadeIn>
              </>
            ) : null}

            {/* PROMEDIOS */}
            <Spacer h={3} />
            <Row gap={3}>
              <Card style={{ flex: 1 }}>
                <Txt variant="tiny" faint>
                  Promedio diario
                </Txt>
                <Txt variant="h3" numberOfLines={1}>
                  {money(promedioDia)}
                </Txt>
              </Card>
              <Card style={{ flex: 1 }}>
                <Txt variant="tiny" faint>
                  Dias con gasto
                </Txt>
                <Txt variant="h3">
                  {diasConGasto} de {rango.days}
                </Txt>
              </Card>
            </Row>

            {/* DIA DE MAYOR GASTO */}
            {peak ? (
              <>
                <Spacer h={3} />
                <FadeIn delay={140}>
                  <Card tone="danger">
                    <Row justify="space-between">
                      <Txt variant="tiny" faint weight="700">
                        TU DIA DE MAYOR GASTO
                      </Txt>
                      <Badge label={`${peak.n} movimientos`} tone="danger" />
                    </Row>
                    <Spacer h={2} />
                    <Txt variant="h3">{prettyDay(peak.day)}</Txt>
                    <Spacer h={1} />
                    <Txt variant="h2" numberOfLines={1}>
                      {money(peak.total)}
                    </Txt>
                    <Spacer h={2} />
                    <Txt variant="tiny" muted>
                      {promedioDia > 0
                        ? `Es ${(peak.total / promedioDia).toFixed(1)}x tu promedio diario de ${money(promedioDia)}.`
                        : 'Sin promedio suficiente aun.'}
                    </Txt>
                  </Card>
                </FadeIn>
              </>
            ) : null}

            {/* EVOLUCION DEL SALDO */}
            <Spacer h={6} />
            <SectionTitle title="Como cambio tu dinero" />
            <FadeIn delay={180}>
              <Card>
                <MiniTrend data={serie} balance={total} height={130} />
              </Card>
            </FadeIn>

            {/* BARRAS DIARIAS */}
            <Spacer h={6} />
            <SectionTitle title="Desglose dia por dia" />
            {serie.some((s) => s.expense > 0) ? (
              <FadeIn delay={200}>
                <Card>
                  <DailyBars data={serie} highlightDay={peak?.day ?? null} />
                  <Spacer h={2} />
                  <Txt variant="tiny" faint>
                    La barra roja marca el dia en que mas gastaste.
                  </Txt>
                </Card>
              </FadeIn>
            ) : (
              <Card tone="alt">
                <Txt variant="small" muted>
                  Sin gastos en este periodo.
                </Txt>
              </Card>
            )}

            {/* CATEGORIAS */}
            {cats.length ? (
              <>
                <Spacer h={6} />
                <SectionTitle title="En que se va la plata" />
                <FadeIn delay={220}>
                  <Card>
                    <Row justify="center">
                      <Donut
                        slices={cats.map((c) => ({ value: c.total, color: c.color }))}
                        centerTop="Total"
                        centerBottom={money(catTotal)}
                      />
                    </Row>
                    <Spacer h={4} />
                    {cats.map((c) => {
                      const share = pct(c.total, catTotal);
                      const overBudget = c.monthly_budget
                        ? c.total > c.monthly_budget
                        : false;
                      return (
                        <View key={c.id} style={{ marginBottom: t.space(3) }}>
                          <Row justify="space-between" gap={2}>
                            <Row gap={2} style={{ flex: 1 }}>
                              <Txt variant="small">{c.emoji}</Txt>
                              <Txt variant="small" numberOfLines={1} style={{ flex: 1 }}>
                                {c.name}
                              </Txt>
                              {overBudget ? (
                                <Badge label="sobre el tope" tone="danger" />
                              ) : null}
                            </Row>
                            <Txt variant="small" weight="700" numberOfLines={1}>
                              {money(c.total)}
                            </Txt>
                          </Row>
                          <Spacer h={1.5} />
                          <ProgressBar
                            value={c.monthly_budget ? pct(c.total, c.monthly_budget) : share}
                            color={overBudget ? t.danger : c.color}
                            height={6}
                          />
                          <Spacer h={1} />
                          <Txt variant="tiny" faint>
                            {share.toFixed(0)}% del gasto
                            {c.monthly_budget
                              ? ` · tope ${money(c.monthly_budget)}`
                              : ` · ${c.n} movimientos`}
                          </Txt>
                        </View>
                      );
                    })}
                  </Card>
                </FadeIn>
              </>
            ) : null}

            {/* GASTOS MAS GRANDES */}
            {mayores.length ? (
              <>
                <Spacer h={6} />
                <SectionTitle title="Tus gastos mas grandes" />
                <FadeIn delay={240}>
                  <Card style={{ gap: t.space(3) }}>
                    {mayores.map((m) => (
                      <Row key={m.id} justify="space-between" gap={2}>
                        <Row gap={2} style={{ flex: 1 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: (m.category_color ?? t.border) + '26',
                            }}
                          >
                            <Txt variant="small">{m.category_emoji ?? '-'}</Txt>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Txt variant="small" numberOfLines={1}>
                              {m.note || m.category_name || 'Gasto'}
                            </Txt>
                            <Txt variant="tiny" faint>
                              {prettyDay(m.occurred_day)}
                            </Txt>
                          </View>
                        </Row>
                        <Txt variant="body" weight="700" numberOfLines={1}>
                          {money(m.amount)}
                        </Txt>
                      </Row>
                    ))}
                  </Card>
                </FadeIn>
              </>
            ) : null}

            {/* PATRON SEMANAL */}
            {rango.days >= 7 ? (
              <>
                <Spacer h={6} />
                <SectionTitle title="Tus habitos por dia de la semana" />
                <FadeIn delay={260}>
                  <Card>
                    <WeekdayPattern data={weekdays} />
                    <Spacer h={3} />
                    <Txt variant="tiny" faint>
                      La barra roja marca el dia en que mas gastas. Si es viernes o
                      sabado, ahi esta tu fuga.
                    </Txt>
                  </Card>
                </FadeIn>
              </>
            ) : null}
          </>
        ) : null}
      </Screen>
    </View>
  );
}
