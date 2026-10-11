import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { debtHistory, deleteDebt, getDebt } from '@/db/repositories/debts';
import { cancelDebtReminders, scheduleDebtDue, ensurePermission } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { money, pct } from '@/utils/money';
import { dueLabel, format, parseISO } from '@/utils/date';
import { monthsToPayoff, schedule, totalInterest } from '@/domain/debt/amortization';
import type { DebtProgress } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

export function DebtDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { debtId } = useRoute<RouteProp<RootStackParamList, 'DebtDetail'>>().params;
  const { refresh } = useAppStore();

  const [debt, setDebt] = useState<DebtProgress | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof debtHistory>>>([]);
  const [showPlan, setShowPlan] = useState(false);

  const load = useCallback(async () => {
    const [d, h] = await Promise.all([getDebt(debtId), debtHistory(debtId)]);
    setDebt(d ?? null);
    setHistory(h);
  }, [debtId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const plan = useMemo(() => {
    if (!debt) return [];
    return schedule(
      debt.outstanding,
      debt.monthly_rate_bp,
      monthsToPayoff(
        debt.outstanding,
        debt.monthly_rate_bp,
        debt.installment_amount ?? 0,
      ) ?? debt.installments_total,
      debt.installment_amount ?? undefined,
    );
  }, [debt]);

  if (!debt) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const progress = pct(debt.paid_principal, debt.principal);
  const months = monthsToPayoff(
    debt.outstanding,
    debt.monthly_rate_bp,
    debt.installment_amount ?? 0,
  );
  const interesRestante = totalInterest(
    debt.outstanding,
    debt.monthly_rate_bp,
    debt.installment_amount ?? 0,
  );

  function remove() {
    Alert.alert('Eliminar deuda', 'Se borra la deuda y su historial de abonos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await cancelDebtReminders(debtId);
          await deleteDebt(debtId);
          await refresh();
          nav.goBack();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <View style={{ flex: 1 }}>
            <Txt variant="h2" numberOfLines={1}>
              {debt.name}
            </Txt>
            {debt.creditor ? (
              <Txt variant="tiny" faint>
                {debt.creditor}
              </Txt>
            ) : null}
          </View>
          <Badge
            label={dueLabel(debt.due_day)}
            tone={dueLabel(debt.due_day).startsWith('Vencida') ? 'danger' : 'warn'}
          />
        </Row>

        <Spacer h={4} />
        <Card>
          <Txt variant="tiny" faint weight="700">
            SALDO PENDIENTE
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1">{money(debt.outstanding)}</Txt>
          <Spacer h={3} />
          <ProgressBar value={progress} color={debt.color} height={10} />
          <Spacer h={2} />
          <Row justify="space-between">
            <Txt variant="tiny" faint>
              Abonado a capital {money(debt.paid_principal)} ({progress.toFixed(0)}%)
            </Txt>
            <Txt variant="tiny" faint>
              {debt.installments_paid}/{debt.installments_total}
            </Txt>
          </Row>
        </Card>

        <Spacer h={3} />
        <Row gap={3}>
          <Card style={{ flex: 1 }}>
            <Txt variant="tiny" faint>
              Cuota
            </Txt>
            <Txt variant="h3">{money(debt.installment_amount ?? 0)}</Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt variant="tiny" faint>
              Te falta
            </Txt>
            <Txt variant="h3">{months ? `${months} meses` : '—'}</Txt>
          </Card>
        </Row>

        <Spacer h={3} />
        <Card tone="danger">
          <Row justify="space-between">
            <Txt variant="small" muted>
              Interes que aun pagarias
            </Txt>
            <Txt variant="body" weight="700">
              {money(interesRestante)}
            </Txt>
          </Row>
          <Spacer h={1.5} />
          <Txt variant="tiny" faint>
            Cada abono extra a capital reduce este numero. Pruebalo en "Abonar".
          </Txt>
        </Card>

        <Spacer h={4} />
        <Row gap={3}>
          <Button
            label="Abonar"
            style={{ flex: 1 }}
            onPress={() => nav.navigate('DebtPay', { debtId })}
          />
          <Button
            label="Editar"
            tone="neutral"
            style={{ flex: 1 }}
            onPress={() => nav.navigate('DebtForm', { debtId })}
          />
        </Row>
        <Spacer h={2} />
        <Row gap={3}>
          <Button
            label="Recordarme"
            tone="ghost"
            size="sm"
            style={{ flex: 1 }}
            onPress={async () => {
              const ok = await ensurePermission();
              if (!ok) return Alert.alert('Permiso denegado', 'Activa las notificaciones.');
              await scheduleDebtDue(debtId, { daysBefore: 2, hour: 9 });
              Alert.alert('Listo', 'Te avisare 2 dias antes, cada mes.');
            }}
          />
          <Button label="Eliminar" tone="ghost" size="sm" onPress={remove} />
        </Row>

        {/* HISTORIAL */}
        <Spacer h={6} />
        <SectionTitle title={`Historial de abonos (${history.length})`} />
        {history.length ? (
          <Card style={{ gap: t.space(3) }}>
            {history.map((h) => (
              <Row key={h.id} justify="space-between">
                <View>
                  <Row gap={2}>
                    <Txt variant="body">{money(h.amount)}</Txt>
                    {h.is_extra ? <Badge label="extra a capital" tone="ok" /> : null}
                  </Row>
                  <Txt variant="tiny" faint>
                    {format(parseISO(h.paid_at), 'dd/MM/yyyy')} · capital{' '}
                    {money(h.principal_part)} · interes {money(h.interest_part)}
                  </Txt>
                </View>
                {h.installment_no ? (
                  <Txt variant="tiny" faint>
                    #{h.installment_no}
                  </Txt>
                ) : null}
              </Row>
            ))}
          </Card>
        ) : (
          <Card tone="alt">
            <Txt variant="small" muted>
              Todavia no registras abonos a esta deuda.
            </Txt>
          </Card>
        )}

        {/* TABLA DE AMORTIZACION */}
        <Spacer h={6} />
        <SectionTitle
          title="Plan de cuotas"
          action={showPlan ? 'Ocultar' : 'Ver tabla'}
          onAction={() => setShowPlan((v) => !v)}
        />
        {showPlan ? (
          <Card>
            <Row justify="space-between" style={{ marginBottom: t.space(2) }}>
              <Txt variant="tiny" faint weight="700" style={{ width: 24 }}>
                #
              </Txt>
              <Txt variant="tiny" faint weight="700" style={{ flex: 1, textAlign: 'right' }}>
                CUOTA
              </Txt>
              <Txt variant="tiny" faint weight="700" style={{ flex: 1, textAlign: 'right' }}>
                INTERES
              </Txt>
              <Txt variant="tiny" faint weight="700" style={{ flex: 1, textAlign: 'right' }}>
                SALDO
              </Txt>
            </Row>
            {plan.slice(0, 60).map((r) => (
              <Row key={r.n} justify="space-between" style={{ marginBottom: 6 }}>
                <Txt variant="tiny" faint style={{ width: 24 }}>
                  {r.n}
                </Txt>
                <Txt variant="tiny" style={{ flex: 1, textAlign: 'right' }}>
                  {money(r.payment)}
                </Txt>
                <Txt
                  variant="tiny"
                  color={t.danger}
                  style={{ flex: 1, textAlign: 'right' }}
                >
                  {money(r.interest)}
                </Txt>
                <Txt variant="tiny" muted style={{ flex: 1, textAlign: 'right' }}>
                  {money(r.balance)}
                </Txt>
              </Row>
            ))}
          </Card>
        ) : null}
      </Screen>
    </View>
  );
}
