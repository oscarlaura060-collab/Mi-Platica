import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import {
  contribute,
  getGoal,
  listContributions,
  removeContribution,
  type GoalContribution,
  type GoalProgress,
} from '@/db/repositories/goals';
import { useAppStore } from '@/store/useAppStore';
import { useCapacity } from './useCapacity';
import { FREQUENCY_LABEL } from '@/domain/savings/plan';
import { buildOptions } from '@/domain/savings/options';
import { money, pct } from '@/utils/money';
import { format, parseISO } from '@/utils/date';
import { es } from 'date-fns/locale';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

const PLAN_LABEL: Record<string, string> = {
  recommended: 'recomendada',
  intermediate: 'acelerada',
  flexible: 'tranquila',
  target: 'tu fecha',
};

export function GoalDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { goalId } = useRoute<RouteProp<RootStackParamList, 'GoalDetail'>>().params;
  const { accounts, refresh } = useAppStore();
  const capacity = useCapacity();

  const [goal, setGoal] = useState<GoalProgress | null>(null);
  const [aportes, setAportes] = useState<GoalContribution[]>([]);
  const [monto, setMonto] = useState(0);
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const load = useCallback(async () => {
    const [g, c] = await Promise.all([getGoal(goalId), listContributions(goalId)]);
    setGoal(g ?? null);
    setAportes(c);
    if (cuentaId === null) setCuentaId(g?.account_id ?? accounts[0]?.id ?? null);
  }, [goalId, accounts, cuentaId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const plan = useMemo(
    () =>
      goal
        ? buildOptions({
            remaining: goal.remaining,
            targetDate: goal.target_date,
            frequency: goal.frequency,
            capacity,
          })
        : null,
    [goal, capacity],
  );

  if (!goal) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const avance = pct(goal.saved, goal.target_amount);
  const cumplida = goal.remaining <= 0;
  const etiqueta = FREQUENCY_LABEL[goal.frequency];

  // Proyeccion con el aporte que el usuario escogio al crear la meta.
  const periodosRestantes =
    goal.planned_contribution > 0
      ? Math.ceil(goal.remaining / goal.planned_contribution)
      : null;

  const fechaProyectada = (() => {
    if (periodosRestantes === null) return '—';
    const d = new Date();
    d.setDate(d.getDate() + (goal.frequency === 'biweekly' ? 15 : 30) * periodosRestantes);
    return format(d, "d 'de' LLL yyyy", { locale: es });
  })();

  const sugerido =
    goal.planned_contribution > 0
      ? goal.planned_contribution
      : (plan?.options.find((o) => o.kind === plan.highlight)?.amount ?? 0);

  /**
   * Las dos frecuencias con el MISMO esfuerzo mensual, para comparar.
   * Si el usuario aporta 200.000 por quincena, el equivalente mensual es
   * 400.000: no se compara 200.000 contra 200.000, que seria tramposo.
   */
  const comparacion = (() => {
    const base = goal.planned_contribution > 0 ? goal.planned_contribution : sugerido;
    if (base <= 0 || goal.remaining <= 0) return null;

    const mensualEquivalente =
      goal.frequency === 'biweekly' ? base * 2 : base;
    const quincenalEquivalente = Math.round(mensualEquivalente / 2);

    const filas = [
      {
        etiqueta: 'quincena',
        aporte: quincenalEquivalente,
        dias: 15,
        actual: goal.frequency === 'biweekly',
      },
      {
        etiqueta: 'mes',
        aporte: mensualEquivalente,
        dias: 30,
        actual: goal.frequency === 'monthly',
      },
    ].map((f) => {
      const periodos = Math.ceil(goal.remaining / f.aporte);
      const meses = (periodos * f.dias) / 30;
      const d = new Date();
      d.setDate(d.getDate() + f.dias * periodos);
      return {
        ...f,
        periodos,
        meses,
        fecha: format(d, "d 'de' LLL yyyy", { locale: es }),
        mesesMin: 0,
      };
    });

    const minimo = Math.min(...filas.map((f) => f.meses));
    return filas.map((f) => ({ ...f, mesesMin: minimo }));
  })();

  // El plan queda desfasado si la capacidad actual difiere bastante de
  // lo que se escogio. No se corrige solo: se avisa y el usuario decide.
  const planDesfasado =
    plan !== null &&
    goal.planned_contribution > 0 &&
    (goal.planned_contribution > plan.safePerPeriod ||
      goal.planned_contribution < plan.safePerPeriod * 0.5);

  async function aportar(valor: number) {
    if (valor <= 0 || !cuentaId) {
      return Alert.alert('Falta informacion', 'Escribe un monto y elige la cuenta.');
    }
    const cuenta = accounts.find((a) => a.id === cuentaId);
    if (cuenta && valor > cuenta.balance) {
      return Alert.alert(
        'No te alcanza',
        `En ${cuenta.name} tienes ${money(cuenta.balance)}.`,
      );
    }
    setGuardando(true);
    try {
      await contribute({ goalId, accountId: cuentaId, amount: valor });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      setMonto(0);
      await Promise.all([load(), refresh()]);
    } finally {
      setGuardando(false);
    }
  }

  // Proyeccion simple: cuanto llevaria con 3 aportes mas del sugerido.
  const proyeccion = [1, 2, 3].map((n) => ({
    n,
    valor: Math.min(goal.saved + sugerido * n, goal.target_amount),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between" align="flex-start" gap={2}>
          <View style={{ flex: 1 }}>
            <Txt variant="h2" numberOfLines={2}>
              {goal.name}
            </Txt>
            {goal.purpose ? (
              <>
                <Spacer h={1} />
                <Txt variant="small" muted>
                  {goal.purpose}
                </Txt>
              </>
            ) : null}
          </View>
          {cumplida ? <Badge label="cumplida" tone="ok" /> : null}
        </Row>

        {/* PROGRESO */}
        <Spacer h={4} />
        <Card glass>
          <Txt variant="tiny" faint weight="700">
            LLEVAS AHORRADO
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1}>
            {money(goal.saved)}
          </Txt>
          <Spacer h={3} />
          <ProgressBar value={avance} color={goal.color} height={12} />
          <Spacer h={2} />
          <Row justify="space-between">
            <Txt variant="tiny" faint>
              {avance.toFixed(0)}% de {money(goal.target_amount)}
            </Txt>
            <Txt variant="tiny" faint>
              {cumplida ? 'Meta alcanzada' : `Faltan ${money(goal.remaining)}`}
            </Txt>
          </Row>
          {goal.target_date ? (
            <>
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                Fecha objetivo:{' '}
                {format(parseISO(goal.target_date), "d 'de' LLLL 'de' yyyy", {
                  locale: es,
                })}
              </Txt>
            </>
          ) : null}
        </Card>

        {/* TU PLAN */}
        {!cumplida && goal.planned_contribution > 0 ? (
          <>
            <Spacer h={3} />
            <Card tone="primary">
              <Row justify="space-between" align="flex-start" gap={2}>
                <View style={{ flex: 1 }}>
                  <Txt variant="tiny" faint weight="700">
                    TU PLAN
                  </Txt>
                  <Spacer h={1.5} />
                  <Txt variant="h3">
                    {money(goal.planned_contribution)} por {etiqueta}
                  </Txt>
                </View>
                {goal.plan_kind ? (
                  <Badge label={PLAN_LABEL[goal.plan_kind] ?? goal.plan_kind} tone="ok" />
                ) : null}
              </Row>
              <Spacer h={2.5} />
              <Row justify="space-between" gap={2}>
                <View style={{ flex: 1 }}>
                  <Txt variant="tiny" faint>
                    Te faltan
                  </Txt>
                  <Txt variant="small" numberOfLines={1}>
                    {periodosRestantes !== null
                      ? `${periodosRestantes} ${periodosRestantes === 1 ? etiqueta : etiqueta + 's'}`
                      : '—'}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="tiny" faint>
                    Llegarias el
                  </Txt>
                  <Txt variant="small" numberOfLines={1}>
                    {fechaProyectada}
                  </Txt>
                </View>
              </Row>

              {/* Si cambiaron ingresos o gastos, el plan puede haber
                  quedado desfasado: se avisa, pero no se toca la meta. */}
              {plan && planDesfasado ? (
                <>
                  <Spacer h={3} />
                  <Txt variant="tiny" color={t.warn}>
                    Tus ingresos o gastos cambiaron. Hoy podrias aportar hasta{' '}
                    {money(plan.safePerPeriod)} por {etiqueta}.
                  </Txt>
                  <Spacer h={2} />
                  <Button
                    label="Recalcular mi plan"
                    tone="neutral"
                    size="sm"
                    onPress={() => nav.navigate('GoalForm', { goalId })}
                  />
                </>
              ) : null}
            </Card>
          </>
        ) : !cumplida && plan ? (
          <>
            <Spacer h={3} />
            <Card tone="primary">
              <Txt variant="h3">Esta meta aun no tiene plan</Txt>
              <Spacer h={1.5} />
              <Txt variant="small" muted>
                {plan.safePerPeriod > 0
                  ? `Segun tus ingresos y gastos podrias aportar hasta ${money(plan.safePerPeriod)} por ${etiqueta}. Escoge un plan para ver cuando llegarias.`
                  : `Me falta informacion para calcular cuanto puedes aportar sin quedarte corto.`}
              </Txt>
              <Spacer h={3} />
              <Button
                label="Elegir un plan"
                tone="neutral"
                size="sm"
                onPress={() => nav.navigate('GoalForm', { goalId })}
              />
            </Card>
          </>
        ) : null}

        {/* QUINCENAL VS MENSUAL */}
        {!cumplida && comparacion ? (
          <>
            <Spacer h={3} />
            <Card>
              <Txt variant="tiny" faint weight="700">
                QUINCENAL O MENSUAL
              </Txt>
              <Spacer h={1.5} />
              <Txt variant="tiny" faint>
                El mismo esfuerzo al mes, repartido de dos formas. Te faltan{' '}
                {money(goal.remaining)}.
              </Txt>
              <Spacer h={3} />

              {comparacion.map((c) => (
                <View key={c.etiqueta}>
                  <Row justify="space-between" gap={2}>
                    <Row gap={2} style={{ flex: 1 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: c.actual ? goal.color : t.textFaint,
                        }}
                      />
                      <Txt variant="small" weight={c.actual ? '700' : '500'}>
                        Cada {c.etiqueta}
                      </Txt>
                      {c.actual ? <Badge label="tu plan" tone="ok" /> : null}
                    </Row>
                    <Txt variant="body" weight="700" numberOfLines={1}>
                      {money(c.aporte)}
                    </Txt>
                  </Row>
                  <Spacer h={1.5} />
                  {/* La barra compara DURACION: mas corta = llega antes. */}
                  <ProgressBar
                    value={(c.mesesMin / c.meses) * 100}
                    color={c.actual ? goal.color : t.border}
                    height={8}
                  />
                  <Spacer h={1} />
                  <Txt variant="tiny" faint>
                    {c.periodos} {c.periodos === 1 ? c.etiqueta : `${c.etiqueta}s`} ·
                    llegarias el {c.fecha}
                  </Txt>
                  <Spacer h={3} />
                </View>
              ))}

              <Txt variant="tiny" faint>
                {comparacion[0].meses === comparacion[1].meses
                  ? 'Tardan lo mismo: elige la que se acomode a cuando te pagan.'
                  : 'Aportar por quincena ayuda a no gastarse la plata antes de guardarla.'}
              </Txt>
            </Card>
          </>
        ) : null}

        {/* COMO AVANZARIA */}
        {!cumplida && sugerido > 0 ? (
          <>
            <Spacer h={3} />
            <Card>
              <Txt variant="tiny" faint weight="700">
                SI APORTAS {money(sugerido).toUpperCase()} POR {etiqueta.toUpperCase()}
              </Txt>
              <Spacer h={3} />
              {proyeccion.map((p) => (
                <View key={p.n}>
                  <Row justify="space-between" gap={2}>
                    <Txt variant="small" muted>
                      En {p.n} {etiqueta}
                      {p.n > 1 ? 's' : ''}
                    </Txt>
                    <Txt variant="small" weight="700" numberOfLines={1}>
                      {money(p.valor)}
                    </Txt>
                  </Row>
                  <Spacer h={1.5} />
                  <ProgressBar
                    value={pct(p.valor, goal.target_amount)}
                    color={goal.color}
                    height={7}
                  />
                  <Spacer h={2.5} />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* APORTAR */}
        <Spacer h={6} />
        <SectionTitle title="Registrar un aporte" />
        <MoneyInput
          value={monto}
          onChange={setMonto}
          size="lg"
          helper="Un aporte no es un gasto: la plata cambia de bolsillo y suma a tu meta."
        />
        <Spacer h={2.5} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={`${a.name} · ${money(a.balance)}`}
              color={a.color}
              active={a.id === cuentaId}
              onPress={() => setCuentaId(a.id)}
            />
          ))}
        </Row>
        <Spacer h={3} />
        <Row gap={2}>
          <Button
            label="Aportar"
            style={{ flex: 1 }}
            loading={guardando}
            disabled={monto <= 0 || !cuentaId}
            onPress={() => aportar(monto)}
          />
          {sugerido > 0 ? (
            <Button
              label={`Aportar ${money(sugerido)}`}
              tone="neutral"
              onPress={() => aportar(sugerido)}
            />
          ) : null}
        </Row>

        {/* HISTORIAL */}
        <Spacer h={6} />
        <SectionTitle title={`Aportes (${aportes.length})`} />
        {aportes.length ? (
          <Card style={{ gap: t.space(3) }}>
            {aportes.map((a) => (
              <Row key={a.id} justify="space-between" gap={2}>
                <View style={{ flex: 1 }}>
                  <Txt variant="body">{money(a.amount)}</Txt>
                  <Txt variant="tiny" faint>
                    {format(parseISO(a.contributed_at), "d 'de' LLLL", { locale: es })}
                  </Txt>
                </View>
                <Button
                  label="Quitar"
                  tone="ghost"
                  size="sm"
                  onPress={() =>
                    Alert.alert('Quitar aporte', `¿Deshacer el aporte de ${money(a.amount)}?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Quitar',
                        style: 'destructive',
                        onPress: async () => {
                          await removeContribution(a.id);
                          await Promise.all([load(), refresh()]);
                        },
                      },
                    ])
                  }
                />
              </Row>
            ))}
          </Card>
        ) : (
          <Card tone="alt">
            <Txt variant="small" muted>
              Aun no has aportado a esta meta.
            </Txt>
          </Card>
        )}

        <Spacer h={5} />
        <Button
          label="Editar meta"
          tone="neutral"
          onPress={() => nav.navigate('GoalForm', { goalId })}
        />
      </Screen>
    </View>
  );
}
