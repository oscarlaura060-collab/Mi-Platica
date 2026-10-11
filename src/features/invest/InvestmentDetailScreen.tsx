import React, { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import {
  deleteInvestment,
  depositToInvestment,
  getInvestment,
  investmentMoves,
  registerYield,
  withdrawFromInvestment,
} from '@/db/repositories/investments';
import { MoneyInput } from '@/components/MoneyInput';
import { useAppStore } from '@/store/useAppStore';
import { futureValue, netAnnualRateBp, realAnnualRateBp } from '@/domain/invest/projection';
import { money, toCents } from '@/utils/money';
import { format, parseISO } from '@/utils/date';
import type { InvestmentMove, InvestmentProgress } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

export function InvestmentDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { investmentId } = useRoute<RouteProp<RootStackParamList, 'InvestmentDetail'>>().params;
  const { accounts, refresh } = useAppStore();

  const [inv, setInv] = useState<InvestmentProgress | null>(null);
  const [moves, setMoves] = useState<InvestmentMove[]>([]);
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState<number | null>(accounts[0]?.id ?? null);

  const load = useCallback(async () => {
    const [i, m] = await Promise.all([
      getInvestment(investmentId),
      investmentMoves(investmentId),
    ]);
    setInv(i ?? null);
    setMoves(m);
    if (accountId === null && accounts.length) setAccountId(accounts[0].id);
  }, [investmentId, accounts, accountId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!inv) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const net = netAnnualRateBp(inv.annual_rate_bp, inv.fee_rate_bp);
  const amountC = amount;

  async function act(kind: 'deposit' | 'withdraw' | 'yield') {
    if (amountC <= 0) return;
    if (kind !== 'yield' && !accountId) {
      return Alert.alert('Elige una cuenta');
    }
    if (kind === 'deposit') {
      await depositToInvestment({ investmentId, accountId: accountId!, amount: amountC });
    } else if (kind === 'withdraw') {
      await withdrawFromInvestment({ investmentId, accountId: accountId!, amount: amountC });
    } else {
      await registerYield(investmentId, amountC, 'Rendimiento del periodo');
    }
    setAmount(0);
    await Promise.all([load(), refresh()]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <View style={{ flex: 1 }}>
            <Txt variant="h2" numberOfLines={1}>
              {inv.name}
            </Txt>
            {inv.issuer ? (
              <Txt variant="tiny" faint>
                {inv.issuer}
              </Txt>
            ) : null}
          </View>
          <Badge
            label={inv.liquidity === 'immediate' ? 'liquido' : 'a termino'}
            tone={inv.liquidity === 'immediate' ? 'ok' : 'neutral'}
          />
        </Row>

        <Spacer h={4} />
        <Card>
          <Txt variant="tiny" faint weight="700">
            SALDO
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1">{money(inv.balance)}</Txt>
          <Spacer h={3} />
          <Row justify="space-between">
            <View>
              <Txt variant="tiny" faint>
                Has aportado
              </Txt>
              <Txt variant="small">{money(inv.initial_amount + inv.deposited)}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="tiny" faint>
                Rendimientos
              </Txt>
              <Txt variant="small" color={t.primary} weight="700">
                {money(inv.yields)}
              </Txt>
            </View>
          </Row>
        </Card>

        <Spacer h={3} />
        <Row gap={3}>
          <Card style={{ flex: 1 }}>
            <Txt variant="tiny" faint>
              Neto anual
            </Txt>
            <Txt variant="h3" color={t.primary}>
              {(net / 100).toFixed(1)}%
            </Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt variant="tiny" faint>
              En 10 años
            </Txt>
            <Txt variant="h3">
              {money(futureValue(inv.balance, inv.monthly_target, net, 120))}
            </Txt>
          </Card>
        </Row>

        {/* MOVER PLATA */}
        <Spacer h={5} />
        <SectionTitle title="Mover plata" />
        <MoneyInput value={amount} onChange={setAmount} size="lg" placeholder="Monto" />
        <Spacer h={2} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              color={a.color}
              active={a.id === accountId}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </Row>
        <Spacer h={3} />
        <Row gap={2}>
          <Button label="Aportar" style={{ flex: 1 }} onPress={() => act('deposit')} />
          <Button
            label="Retirar"
            tone="neutral"
            style={{ flex: 1 }}
            onPress={() => act('withdraw')}
          />
        </Row>
        <Spacer h={2} />
        <Button
          label="Registrar rendimiento del banco"
          tone="ghost"
          size="sm"
          onPress={() => act('yield')}
        />

        {/* HISTORIAL */}
        <Spacer h={6} />
        <SectionTitle title={`Movimientos (${moves.length})`} />
        {moves.length ? (
          <Card style={{ gap: t.space(3) }}>
            {moves.map((m) => (
              <Row key={m.id} justify="space-between">
                <View>
                  <Txt variant="body">
                    {m.kind === 'deposit'
                      ? 'Aporte'
                      : m.kind === 'withdraw'
                        ? 'Retiro'
                        : 'Rendimiento'}
                  </Txt>
                  <Txt variant="tiny" faint>
                    {format(parseISO(m.moved_at), 'dd/MM/yyyy')}
                    {m.note ? ` · ${m.note}` : ''}
                  </Txt>
                </View>
                <Txt
                  variant="body"
                  weight="700"
                  color={m.amount >= 0 ? t.primary : t.danger}
                >
                  {m.amount >= 0 ? '+' : '-'} {money(Math.abs(m.amount))}
                </Txt>
              </Row>
            ))}
          </Card>
        ) : (
          <Card tone="alt">
            <Txt variant="small" muted>
              Aun no registras movimientos aqui.
            </Txt>
          </Card>
        )}

        <Spacer h={5} />
        <Row gap={2}>
          <Button
            label="Editar"
            tone="neutral"
            style={{ flex: 1 }}
            onPress={() => nav.navigate('InvestmentForm', { investmentId })}
          />
          <Button
            label="Eliminar"
            tone="ghost"
            onPress={() =>
              Alert.alert('Eliminar', 'Se borra el vehiculo y su historial.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteInvestment(investmentId);
                    await refresh();
                    nav.goBack();
                  },
                },
              ])
            }
          />
        </Row>
      </Screen>
    </View>
  );
}
