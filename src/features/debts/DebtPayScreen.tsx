import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Row, Spacer, Txt } from '@/components/ui';
import { Keypad } from '@/components/Keypad';
import { getDebt, payDebt } from '@/db/repositories/debts';
import { useAppStore } from '@/store/useAppStore';
import { extraPaymentImpact, splitPayment } from '@/domain/debt/amortization';
import { keypadToCents, money } from '@/utils/money';
import type { DebtProgress } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

/**
 * ABONAR A DEUDA
 * Muestra en vivo el impacto: cuanto va a capital, cuanto a interes y
 * cuantos meses/intereses te ahorras si es un abono extraordinario.
 */
export function DebtPayScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { debtId, suggested } =
    useRoute<RouteProp<RootStackParamList, 'DebtPay'>>().params;
  const { accounts, primaryAccount, refresh } = useAppStore();

  const [debt, setDebt] = useState<DebtProgress | null>(null);
  const [pesos, setPesos] = useState(suggested ? Math.round(suggested / 100) : 0);
  const [accountId, setAccountId] = useState<number | null>(primaryAccount?.id ?? accounts[0]?.id ?? null);
  const [isExtra, setIsExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDebt(debtId).then((d) => {
      setDebt(d ?? null);
      if (!suggested && d?.installment_amount) {
        setPesos(Math.round(d.installment_amount / 100));
      }
      if (d?.id && accountId === null && accounts.length) setAccountId(accounts[0].id);
    });
  }, [debtId, suggested, accounts, accountId]);

  const amount = keypadToCents(pesos);
  const account = accounts.find((a) => a.id === accountId);

  const breakdown = useMemo(() => {
    if (!debt) return null;
    if (isExtra) {
      const impact = extraPaymentImpact(
        debt.outstanding,
        debt.monthly_rate_bp,
        debt.installment_amount ?? 0,
        amount,
      );
      return { interest: 0, principal: Math.min(amount, debt.outstanding), impact };
    }
    const s = splitPayment(debt.outstanding, debt.monthly_rate_bp, amount);
    return { ...s, impact: null };
  }, [debt, amount, isExtra]);

  async function submit() {
    if (!debt || !accountId || amount <= 0) return;
    setSaving(true);
    try {
      await payDebt({ debtId, accountId, amount, isExtra });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.goBack();
    } catch (e) {
      Alert.alert('No se pudo registrar el abono', e instanceof Error ? e.message : 'Revisa el monto y vuelve a intentarlo.');
    } finally {
      setSaving(false);
    }
  }

  const insufficient = account ? amount > account.balance : false;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <View style={{ paddingHorizontal: t.space(5) }}>
        <Row justify="space-between">
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Txt variant="body" muted>
              Cancelar
            </Txt>
          </Pressable>
          <Txt variant="small" muted numberOfLines={1}>
            {debt?.name ?? ''}
          </Txt>
        </Row>

        <Spacer h={5} />
        <Txt variant="tiny" faint align="center">
          CUANTO VAS A ABONAR
        </Txt>
        <Txt variant="h1" align="center" style={{ fontSize: 44 }}>
          {money(amount)}
        </Txt>
        <Spacer h={1} />
        <Txt variant="tiny" faint align="center">
          Saldo de la deuda: {money(debt?.outstanding ?? 0)}
        </Txt>

        <Spacer h={4} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={`${a.name} · ${money(a.balance)}`}
              color={a.color}
              active={a.id === accountId}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </Row>

        <Spacer h={3} />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Abono extra a capital</Txt>
              <Txt variant="tiny" faint>
                Todo va a capital, no paga interes del mes. Acorta el plazo.
              </Txt>
            </View>
            <Switch
              value={isExtra}
              onValueChange={setIsExtra}
              trackColor={{ true: t.primary, false: t.border }}
            />
          </Row>
        </Card>

        {breakdown ? (
          <>
            <Spacer h={3} />
            <Card tone={isExtra ? 'primary' : 'warn'}>
              <Row justify="space-between">
                <Txt variant="small" muted>
                  A capital
                </Txt>
                <Txt variant="body" weight="700">
                  {money(breakdown.principal)}
                </Txt>
              </Row>
              <Spacer h={1.5} />
              <Row justify="space-between">
                <Txt variant="small" muted>
                  A intereses
                </Txt>
                <Txt variant="body" color={t.danger} weight="700">
                  {money(breakdown.interest)}
                </Txt>
              </Row>
              {breakdown.impact && amount > 0 ? (
                <>
                  <Spacer h={2.5} />
                  <Txt variant="small" color={t.primary} weight="700">
                    Te ahorra {money(breakdown.impact.interestSaved)} en intereses
                    {breakdown.impact.monthsSaved
                      ? ` y ${breakdown.impact.monthsSaved} meses`
                      : ''}
                    .
                  </Txt>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {insufficient ? (
          <>
            <Spacer h={2} />
            <Txt variant="tiny" color={t.danger}>
              Ojo: en {account?.name} solo tienes {money(account?.balance ?? 0)}.
            </Txt>
          </>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 'auto',
          paddingHorizontal: t.space(5),
          paddingBottom: insets.bottom + t.space(4),
        }}
      >
        <Keypad value={pesos} onChange={setPesos} />
        <Spacer h={3} />
        <Button
          label="Registrar abono"
          onPress={submit}
          disabled={amount <= 0 || !accountId || amount > (debt?.outstanding ?? 0) || insufficient}
          loading={saving}
          size="lg"
        />
      </View>
    </View>
  );
}
