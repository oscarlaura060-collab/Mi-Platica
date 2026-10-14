import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { listGoals, type GoalProgress } from '@/db/repositories/goals';
import { listInvestments } from '@/db/repositories/investments';
import { useAppStore } from '@/store/useAppStore';
import { buildSavingsPlan, FREQUENCY_LABEL } from '@/domain/savings/plan';
import { useCapacity } from './useCapacity';
import { money, pct } from '@/utils/money';
import { format, parseISO } from '@/utils/date';
import { es } from 'date-fns/locale';
import type { InvestmentProgress } from '@/db/types';
import type { RootNav } from '@/app/navigation/types';

/**
 * AHORRO
 * Metas con proposito, su progreso y cuanto conviene aportar.
 * (La comparacion "ahorro o pago deuda" se saco de aqui: los pagos de
 * deuda viven en su propia seccion.)
 */
export function SavingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { refresh, total, netWorth, availableReal } = useAppStore();
  const capacity = useCapacity();

  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [invs, setInvs] = useState<InvestmentProgress[]>([]);

  const load = useCallback(async () => {
    const [g, i] = await Promise.all([listGoals('all'), listInvestments()]);
    setGoals(g);
    setInvs(i);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refresh();
    }, [load, refresh]),
  );

  const activas = goals.filter((g) => g.status === 'active');
  const ahorrado = goals.reduce((a, g) => a + g.saved, 0);
  const objetivo = activas.reduce((a, g) => a + g.target_amount, 0);
  const invertido = invs.reduce((a, i) => a + i.balance, 0);
  const colchonObjetivo = capacity.basicNeeds || capacity.avgDailyExpense * 30;
  const colchonActual = Math.max(0, Math.min(total, availableReal || total));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Ahorro</Txt>
        <Spacer h={1} />
        <Txt variant="small" muted>
          Tu patrimonio, tu colchón y tus metas en un solo lugar.
        </Txt>

        {/* VISTA GENERAL DE AHORRO */}
        <Spacer h={4} />
        <Card tone="primary" glass>
          <Txt variant="tiny" faint weight="700">
            PATRIMONIO NETO
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1}>
            {money(netWorth)}
          </Txt>
          <Spacer h={3} />
          <Row justify="space-between" gap={3}>
            <View style={{ flex: 1 }}>
              <Txt variant="tiny" faint>
                Dinero líquido
              </Txt>
              <Txt variant="body" weight="700" numberOfLines={1}>
                {money(total)}
              </Txt>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Txt variant="tiny" faint>
                Inversiones
              </Txt>
              <Txt variant="body" weight="700" numberOfLines={1}>
                {money(invertido)}
              </Txt>
            </View>
          </Row>
        </Card>

        <Spacer h={3} />
        <Card tone="alt">
          <Row justify="space-between" align="flex-start" gap={2}>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Fondo de emergencia</Txt>
              <Txt variant="small" muted>
                Disponible para tus imprevistos, sin contar metas ni inversiones.
              </Txt>
            </View>
            <Badge label={colchonObjetivo > 0 ? `${Math.round((colchonActual / colchonObjetivo) * 100)}%` : 'Por definir'} tone="ok" />
          </Row>
          <Spacer h={3} />
          <ProgressBar value={pct(colchonActual, colchonObjetivo)} height={9} />
          <Spacer h={2} />
          <Row justify="space-between">
            <Txt variant="tiny" faint>
              Tienes {money(colchonActual)}
            </Txt>
            <Txt variant="tiny" faint>
              Objetivo {colchonObjetivo > 0 ? money(colchonObjetivo) : 'por definir'}
            </Txt>
          </Row>
        </Card>

        {/* RESUMEN */}
        <Spacer h={4} />
        <Card glass>
          <Txt variant="tiny" faint weight="700">
            TOTAL AHORRADO
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1}>
            {money(ahorrado + invertido)}
          </Txt>
          {objetivo > 0 ? (
            <>
              <Spacer h={3} />
              <ProgressBar value={pct(ahorrado, objetivo)} height={10} />
              <Spacer h={2} />
              <Row justify="space-between">
                <Txt variant="tiny" faint>
                  En metas {money(ahorrado)}
                </Txt>
                <Txt variant="tiny" faint>
                  Objetivo {money(objetivo)}
                </Txt>
              </Row>
            </>
          ) : null}
          {invertido > 0 ? (
            <>
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                Incluye {money(invertido)} en vehiculos de inversion.
              </Txt>
            </>
          ) : null}
        </Card>

        {/* METAS */}
        <Spacer h={6} />
        <SectionTitle title={`Mis metas (${activas.length})`} />

        {goals.length ? (
          goals.map((g) => {
            const avance = pct(g.saved, g.target_amount);
            const plan = buildSavingsPlan({
              remaining: g.remaining,
              targetDate: g.target_date,
              frequency: g.frequency,
              capacity,
            });
            const cumplida = g.status === 'done' || g.remaining <= 0;

            return (
              <Card
                key={g.id}
                style={{ marginBottom: t.space(3) }}
                onPress={() => nav.navigate('GoalDetail', { goalId: g.id })}
              >
                <Row justify="space-between" align="flex-start" gap={2}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3" numberOfLines={1}>
                      {g.name}
                    </Txt>
                    {g.purpose ? (
                      <>
                        <Spacer h={1} />
                        <Txt variant="tiny" faint numberOfLines={1}>
                          {g.purpose}
                        </Txt>
                      </>
                    ) : null}
                  </View>
                  {cumplida ? (
                    <Badge label="cumplida" tone="ok" />
                  ) : g.target_date ? (
                    <Badge
                      label={format(parseISO(g.target_date), "d LLL yy", { locale: es })}
                      tone="warn"
                    />
                  ) : null}
                </Row>

                <Spacer h={3} />
                <Row justify="space-between" align="flex-end" gap={2}>
                  <View>
                    <Txt variant="tiny" faint>
                      Llevas
                    </Txt>
                    <Txt variant="h2" numberOfLines={1}>
                      {money(g.saved)}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="tiny" faint>
                      Meta
                    </Txt>
                    <Txt variant="body" weight="700" numberOfLines={1}>
                      {money(g.target_amount)}
                    </Txt>
                  </View>
                </Row>

                <Spacer h={3} />
                <ProgressBar
                  value={avance}
                  color={cumplida ? t.primary : g.color}
                  height={10}
                />
                <Spacer h={2} />
                <Row justify="space-between">
                  <Txt variant="tiny" faint>
                    {avance.toFixed(0)}% completado
                  </Txt>
                  {!cumplida ? (
                    <Txt variant="tiny" faint>
                      Faltan {money(g.remaining)}
                    </Txt>
                  ) : null}
                </Row>

                {/* Recomendacion de aporte */}
                {!cumplida ? (
                  <>
                    <Spacer h={3} />
                    <View
                      style={{
                        backgroundColor: t.primarySoft,
                        borderRadius: t.radius.md,
                        padding: t.space(3),
                      }}
                    >
                      <Txt variant="small" weight="700">
                        {plan.headline}
                      </Txt>
                      <Spacer h={1} />
                      <Txt variant="tiny" muted>
                        {plan.detail}
                      </Txt>
                      {plan.isEstimate && !plan.needsMoreData ? (
                        <>
                          <Spacer h={1.5} />
                          <Txt variant="tiny" faint>
                            Estimado con tu gasto promedio. Ajustalo en Ajustes {'>'}{' '}
                            gastos basicos.
                          </Txt>
                        </>
                      ) : null}
                    </View>
                  </>
                ) : null}

                <Spacer h={3} />
                <Row gap={2}>
                  <Button
                    label="Aportar"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => nav.navigate('GoalDetail', { goalId: g.id })}
                  />
                  <Button
                    label="Editar"
                    tone="ghost"
                    size="sm"
                    onPress={() => nav.navigate('GoalForm', { goalId: g.id })}
                  />
                </Row>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="Aun no tienes metas"
            subtitle="Crea una con un proposito claro: un viaje, el fondo de emergencia, un computador. Te digo cuanto aportar por quincena o por mes."
            cta="Crear mi primera meta"
            onCta={() => nav.navigate('GoalForm', {})}
          />
        )}

        <Spacer h={4} />
        <Button label="+ Nueva meta" onPress={() => nav.navigate('GoalForm', {})} />

        {/* INVERSIONES (se conserva, pero ya no es el centro de la pantalla) */}
        <Spacer h={6} />
        <SectionTitle
          title="Inversiones"
          action="Ver todo"
          onAction={() => nav.navigate('Investments')}
        />
        {invs.length ? (
          <Card onPress={() => nav.navigate('Investments')}>
            <Row justify="space-between">
              <View style={{ flex: 1 }}>
                <Txt variant="body">
                  {invs.length} vehiculo{invs.length > 1 ? 's' : ''}
                </Txt>
                <Txt variant="tiny" faint>
                  CDT, fondos, cuentas de ahorro
                </Txt>
              </View>
              <Txt variant="h3" numberOfLines={1}>
                {money(invertido)}
              </Txt>
            </Row>
          </Card>
        ) : (
          <Card tone="alt" onPress={() => nav.navigate('Investments')}>
            <Txt variant="small" muted>
              Registra un CDT, un fondo o tu cuenta de ahorros para proyectar
              cuanto crecera tu plata.
            </Txt>
          </Card>
        )}
      </Screen>
    </View>
  );
}
