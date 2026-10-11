import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { listInvestments } from '@/db/repositories/investments';
import { getNumberSetting } from '@/db/repositories/settings';
import {
  futureValue,
  netAnnualRateBp,
  project,
  realAnnualRateBp,
} from '@/domain/invest/projection';
import { money, moneyCompact, pct } from '@/utils/money';
import type { InvestmentProgress } from '@/db/types';
import type { RootNav } from '@/app/navigation/types';

const HORIZONS: { months: number; label: string }[] = [
  { months: 12, label: '1 año' },
  { months: 60, label: '5 años' },
  { months: 120, label: '10 años' },
  { months: 240, label: '20 años' },
];

const KIND_LABEL: Record<string, string> = {
  savings: 'Cuenta de ahorro',
  cdt: 'CDT',
  fund: 'Fondo de inversion',
  stocks: 'Acciones',
  crypto: 'Cripto',
  real_estate: 'Finca raiz',
  other: 'Otro',
};

export function InvestmentsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { debts, total } = useAppStore();

  const [items, setItems] = useState<InvestmentProgress[]>([]);
  const [horizon, setHorizon] = useState(120);
  const [buffer, setBuffer] = useState(0);
  const [inflation, setInflation] = useState(500);

  const load = useCallback(async () => {
    const [list, b, inf] = await Promise.all([
      listInvestments(),
      getNumberSetting('emergency_buffer', 0),
      getNumberSetting('inflation_bp', 500),
    ]);
    setItems(list);
    setBuffer(b);
    setInflation(inf);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const invested = items.reduce((a, i) => a + i.balance, 0);
  const liquid = items
    .filter((i) => i.liquidity === 'immediate')
    .reduce((a, i) => a + i.balance, 0);
  const monthlyTarget = items.reduce((a, i) => a + i.monthly_target, 0);
  const totalDebt = debts.reduce((a, d) => a + d.outstanding, 0);

  /** Patrimonio neto: lo que tienes menos lo que debes. El numero honesto. */
  const netWorth = total + invested - totalDebt;

  /** Proyeccion agregada: promedio ponderado de rentabilidad neta. */
  const blendedRateBp = useMemo(() => {
    if (!invested) {
      return items.length
        ? Math.round(
            items.reduce((a, i) => a + netAnnualRateBp(i.annual_rate_bp, i.fee_rate_bp), 0) /
              items.length,
          )
        : 0;
    }
    return Math.round(
      items.reduce(
        (a, i) => a + netAnnualRateBp(i.annual_rate_bp, i.fee_rate_bp) * i.balance,
        0,
      ) / invested,
    );
  }, [items, invested]);

  const projected = futureValue(invested, monthlyTarget, blendedRateBp, horizon);
  const contributed = invested + monthlyTarget * horizon;
  const earnings = projected - contributed;
  const realRate = realAnnualRateBp(blendedRateBp, inflation);
  const series = useMemo(
    () => project(invested, monthlyTarget, blendedRateBp, horizon),
    [invested, monthlyTarget, blendedRateBp, horizon],
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Ahorro e inversion</Txt>

        {/* PATRIMONIO NETO */}
        <Spacer h={4} />
        <Card tone={netWorth >= 0 ? 'primary' : 'danger'}>
          <Txt variant="tiny" faint weight="700">
            PATRIMONIO NETO
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1">{money(netWorth)}</Txt>
          <Spacer h={3} />
          <Row justify="space-between">
            <View>
              <Txt variant="tiny" faint>
                Tienes
              </Txt>
              <Txt variant="small">{money(total + invested)}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="tiny" faint>
                Debes
              </Txt>
              <Txt variant="small" color={t.danger}>
                {money(totalDebt)}
              </Txt>
            </View>
          </Row>
        </Card>


        {/* COLCHON */}
        {buffer > 0 ? (
          <>
            <Spacer h={3} />
            <Card>
              <Row justify="space-between">
                <Txt variant="small">Colchon de emergencia</Txt>
                <Txt variant="small" weight="700">
                  {money(liquid)} / {money(buffer)}
                </Txt>
              </Row>
              <Spacer h={2} />
              <ProgressBar
                value={pct(liquid, buffer)}
                color={liquid >= buffer ? t.primary : t.warn}
              />
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                {liquid >= buffer
                  ? 'Colchon completo. Ya puedes atacar deuda o invertir a plazo con calma.'
                  : `Te faltan ${money(buffer - liquid)}. Solo cuenta el ahorro liquido: un CDT a termino no sirve de colchon.`}
              </Txt>
            </Card>
          </>
        ) : null}

        {/* PROYECCION */}
        {items.length ? (
          <>
            <Spacer h={6} />
            <SectionTitle title="Si sigues asi..." />
            <Row gap={2} style={{ marginBottom: t.space(3) }}>
              {HORIZONS.map((h) => (
                <Chip
                  key={h.months}
                  label={h.label}
                  active={horizon === h.months}
                  onPress={() => setHorizon(h.months)}
                />
              ))}
            </Row>
            <Card>
              <Txt variant="tiny" faint weight="700">
                EN {HORIZONS.find((h) => h.months === horizon)?.label.toUpperCase()} TENDRIAS
              </Txt>
              <Spacer h={1} />
              <Txt variant="h1">{money(projected)}</Txt>
              <Spacer h={3} />
              <Row justify="space-between">
                <View>
                  <Txt variant="tiny" faint>
                    De tu bolsillo
                  </Txt>
                  <Txt variant="small">{money(contributed)}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="tiny" faint>
                    Lo puso el interes
                  </Txt>
                  <Txt variant="small" color={t.primary} weight="700">
                    {money(earnings)}
                  </Txt>
                </View>
              </Row>

              {/* Barras de la proyeccion: aportado vs rendimiento */}
              <Spacer h={4} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4 }}>
                {series
                  .filter((_, i) => i % Math.max(1, Math.floor(horizon / 12)) === 0)
                  .slice(0, 12)
                  .map((p) => {
                    const h = (p.balance / Math.max(projected, 1)) * 80;
                    const hc = (p.contributed / Math.max(projected, 1)) * 80;
                    return (
                      <View key={p.month} style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <View
                          style={{
                            height: Math.max(h, 2),
                            backgroundColor: t.primary,
                            borderRadius: 3,
                            justifyContent: 'flex-end',
                          }}
                        >
                          <View
                            style={{
                              height: Math.max(hc, 1),
                              backgroundColor: t.info,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
              </View>
              <Spacer h={2} />
              <Row gap={3}>
                <Row gap={1}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.info }} />
                  <Txt variant="tiny" faint>
                    aportado
                  </Txt>
                </Row>
                <Row gap={1}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary }} />
                  <Txt variant="tiny" faint>
                    con rendimiento
                  </Txt>
                </Row>
              </Row>

              <Spacer h={3} />
              <Txt variant="tiny" faint>
                Rentabilidad neta promedio {(blendedRateBp / 100).toFixed(1)}% E.A. ·
                real {(realRate / 100).toFixed(1)}% despues de una inflacion del{' '}
                {(inflation / 100).toFixed(1)}%. Aporte mensual considerado:{' '}
                {money(monthlyTarget)}.
              </Txt>
            </Card>
          </>
        ) : null}

        {/* VEHICULOS */}
        <Spacer h={6} />
        <SectionTitle title={`Mis vehiculos (${items.length})`} />
        {items.length ? (
          items.map((i) => {
            const net = netAnnualRateBp(i.annual_rate_bp, i.fee_rate_bp);
            return (
              <Card
                key={i.id}
                style={{ marginBottom: t.space(3) }}
                onPress={() => nav.navigate('InvestmentDetail', { investmentId: i.id })}
              >
                <Row justify="space-between">
                  <Row gap={2} style={{ flex: 1 }}>
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i.color }}
                    />
                    <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                      {i.name}
                    </Txt>
                  </Row>
                  <Badge
                    label={i.liquidity === 'immediate' ? 'liquido' : 'a termino'}
                    tone={i.liquidity === 'immediate' ? 'ok' : 'neutral'}
                  />
                </Row>
                <Spacer h={3} />
                <Row justify="space-between" align="flex-end">
                  <View>
                    <Txt variant="tiny" faint>
                      {KIND_LABEL[i.kind] ?? i.kind}
                      {i.issuer ? ` · ${i.issuer}` : ''}
                    </Txt>
                    <Txt variant="h2">{money(i.balance)}</Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="tiny" faint>
                      neto anual
                    </Txt>
                    <Txt variant="body" color={t.primary} weight="700">
                      {(net / 100).toFixed(1)}%
                    </Txt>
                  </View>
                </Row>
                {i.monthly_target > 0 ? (
                  <>
                    <Spacer h={2} />
                    <Txt variant="tiny" faint>
                      Aporte mensual {money(i.monthly_target)} · en 10 años:{' '}
                      {moneyCompact(futureValue(i.balance, i.monthly_target, net, 120))}
                    </Txt>
                  </>
                ) : null}
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="Sin vehiculos de ahorro"
            subtitle="Registra tu cuenta de ahorros, un CDT o un fondo para proyectar tu futuro y decidir mejor."
          />
        )}

        <Spacer h={4} />
        <Button
          label="+ Nuevo vehiculo de ahorro"
          onPress={() => nav.navigate('InvestmentForm', {})}
        />
      </Screen>
    </View>
  );
}
