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
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { SwipeRow } from '@/components/SwipeRow';
import { MoneyInput } from '@/components/MoneyInput';
import {
  cancelPlan,
  cardDates,
  getCreditCard,
  listPlans,
  payCreditCard,
  type CreditCard,
  type InstallmentPlan,
} from '@/db/repositories/creditCards';
import { listFixedExpenses, type FixedExpenseStatus } from '@/db/repositories/fixedExpenses';
import { useAppStore } from '@/store/useAppStore';
import { money, pct, toCents } from '@/utils/money';
import { format } from '@/utils/date';
import { es } from 'date-fns/locale';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

const fecha = (d: Date | null) =>
  d ? format(d, "d 'de' LLLL", { locale: es }) : '—';

/**
 * TARJETA DE CREDITO
 * Cupo usado/libre, las dos fechas que importan (corte y limite de pago),
 * los planes de cuotas y los gastos fijos que se cargan aqui.
 */
export function CreditCardScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { cardId } = useRoute<RouteProp<RootStackParamList, 'CreditCard'>>().params;
  const { accounts, refresh } = useAppStore();

  const [card, setCard] = useState<CreditCard | null>(null);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [fixed, setFixed] = useState<FixedExpenseStatus[]>([]);
  const [amount, setAmount] = useState(0);
  const [fromId, setFromId] = useState<number | null>(null);

  const pagables = accounts.filter((a) => a.type !== 'credit_card');

  const load = useCallback(async () => {
    const [c, p, f] = await Promise.all([
      getCreditCard(cardId),
      listPlans(cardId),
      listFixedExpenses(true),
    ]);
    setCard(c ?? null);
    setPlans(p);
    setFixed(f.filter((x) => x.account_id === cardId));
    if (fromId === null && pagables.length) setFromId(pagables[0].id);
  }, [cardId, fromId, pagables]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!card) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const d = cardDates(card);
  const limite = card.credit_limit ?? 0;
  const usado = Math.max(card.used, 0);
  const libre = Math.max(card.available, 0);
  const fixedOnCard = fixed.reduce((a, f) => a + f.amount, 0);
  const amountC = amount;

  async function pagar(total: boolean) {
    const valor = total ? usado : amountC;
    if (valor <= 0) return Alert.alert('Monto invalido');
    if (!fromId) return Alert.alert('Elige la cuenta desde la que pagas');
    const origen = accounts.find((a) => a.id === fromId);

    Alert.alert(
      'Pagar tarjeta',
      `Se registrara un pago de ${money(valor)} desde ${origen?.name ?? ''}. ` +
        `El cupo se libera de inmediato.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            try {
              await payCreditCard({
                cardId,
                fromAccountId: fromId,
                amount: valor,
                // Si cubre al menos las cuotas del mes, se avanza una cuota
                // en cada plan activo.
                advancePlans: valor >= card!.monthly_installments && plans.length > 0,
              });
              setAmount(0);
              await Promise.all([load(), refresh()]);
            } catch (e) {
              Alert.alert('No se pudo registrar el pago', e instanceof Error ? e.message : 'Revisa el monto y la cuenta de origen.');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <Txt variant="h2" numberOfLines={1} style={{ flex: 1 }}>
            {card.name}
          </Txt>
          <Badge label="tarjeta" tone="warn" />
        </Row>

        {/* CUPO */}
        <Spacer h={4} />
        <Card tone={libre === 0 && limite > 0 ? 'danger' : 'default'}>
          <Txt variant="tiny" faint weight="700">
            CUPO DISPONIBLE
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1}>
            {limite > 0 ? money(libre) : '—'}
          </Txt>
          {limite > 0 ? (
            <>
              <Spacer h={3} />
              <ProgressBar
                value={pct(usado, limite)}
                color={pct(usado, limite) > 70 ? t.danger : t.warn}
                height={10}
              />
              <Spacer h={2} />
              <Row justify="space-between">
                <Txt variant="tiny" faint>
                  Usado {money(usado)}
                </Txt>
                <Txt variant="tiny" faint>
                  Cupo {money(limite)}
                </Txt>
              </Row>
            </>
          ) : (
            <>
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                Debes {money(usado)}. Registra el cupo total en la cuenta para
                ver cuanto te queda.
              </Txt>
            </>
          )}
        </Card>

        {/* LAS DOS FECHAS */}
        <Spacer h={3} />
        <Row gap={3}>
          <Card style={{ flex: 1 }}>
            <Txt variant="tiny" faint>
              Corte
            </Txt>
            <Txt variant="h3" numberOfLines={1}>
              {fecha(d.statement)}
            </Txt>
            <Spacer h={1} />
            <Txt variant="tiny" faint>
              {d.daysToStatement === null
                ? 'sin configurar'
                : d.daysToStatement === 0
                  ? 'es hoy'
                  : `en ${d.daysToStatement} dias`}
            </Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt variant="tiny" faint>
              Limite de pago
            </Txt>
            <Txt
              variant="h3"
              numberOfLines={1}
              color={
                d.daysToPayment !== null && d.daysToPayment <= 3 ? t.danger : t.text
              }
            >
              {fecha(d.payment)}
            </Txt>
            <Spacer h={1} />
            <Txt variant="tiny" faint>
              {d.daysToPayment === null
                ? 'sin configurar'
                : d.daysToPayment === 0
                  ? 'es hoy'
                  : `en ${d.daysToPayment} dias`}
            </Txt>
          </Card>
        </Row>

        {d.statement && d.daysToStatement !== null ? (
          <>
            <Spacer h={2} />
            <Card tone="alt">
              <Txt variant="tiny" faint>
                Si compras despues del {fecha(d.statement)} esa compra entra al
                extracto siguiente: es el mayor plazo sin intereses que puedes
                conseguir.
              </Txt>
            </Card>
          </>
        ) : null}

        {/* PAGAR */}
        <Spacer h={5} />
        <SectionTitle title="Pagar tarjeta" />
        <MoneyInput
          value={amount}
          onChange={setAmount}
          size="lg"
          placeholder="Monto a pagar"
        />
        <Spacer h={2} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {pagables.map((a) => (
            <Chip
              key={a.id}
              label={`${a.name} · ${money(a.balance)}`}
              color={a.color}
              active={a.id === fromId}
              onPress={() => setFromId(a.id)}
            />
          ))}
        </Row>
        <Spacer h={3} />
        <Row gap={2}>
          <Button
            label={`Pagar todo (${money(usado)})`}
            style={{ flex: 1 }}
            onPress={() => pagar(true)}
            disabled={usado <= 0}
          />
          <Button
            label="Pagar monto"
            tone="neutral"
            onPress={() => pagar(false)}
            disabled={amountC <= 0}
          />
        </Row>
        <Spacer h={2} />
        <Txt variant="tiny" faint>
          Pagar la tarjeta baja la deuda y libera el cupo automaticamente: el
          saldo se calcula desde tus movimientos, no es un contador aparte.
        </Txt>

        {/* PLANES DE CUOTAS */}
        <Spacer h={6} />
        <SectionTitle title={`Compras a cuotas (${plans.length})`} />
        {plans.length ? (
          <>
            <Card tone="warn" style={{ marginBottom: t.space(3) }}>
              <Row justify="space-between">
                <Txt variant="small" muted>
                  Te cobran cada mes
                </Txt>
                <Txt variant="h3">{money(card.monthly_installments)}</Txt>
              </Row>
            </Card>
            {plans.map((p) => {
              const restantes = p.installments_total - p.installments_paid;
              return (
                <View key={p.id} style={{ marginBottom: t.space(2.5) }}>
                  <SwipeRow
                    deleteLabel="Cancelar"
                    onDelete={() =>
                      Alert.alert('Cancelar plan', `¿Cancelar "${p.description}"?`, [
                        { text: 'No', style: 'cancel' },
                        {
                          text: 'Si',
                          style: 'destructive',
                          onPress: async () => {
                            await cancelPlan(p.id);
                            await Promise.all([load(), refresh()]);
                          },
                        },
                      ])
                    }
                  >
                    <Card>
                      <Row justify="space-between" align="flex-start" gap={2}>
                        <View style={{ flex: 1 }}>
                          <Txt variant="body" numberOfLines={1}>
                            {p.description}
                          </Txt>
                          <Spacer h={1} />
                          <Txt variant="tiny" faint>
                            {p.installments_paid}/{p.installments_total} cuotas ·{' '}
                            {p.monthly_rate_bp > 0
                              ? `${(p.monthly_rate_bp / 100).toFixed(2)}% m.v.`
                              : 'sin intereses'}
                          </Txt>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Txt variant="h3" numberOfLines={1}>
                            {money(p.installment_amount)}
                          </Txt>
                          <Txt variant="tiny" faint>
                            al mes
                          </Txt>
                        </View>
                      </Row>
                      <Spacer h={2.5} />
                      <ProgressBar
                        value={pct(p.installments_paid, p.installments_total)}
                        color={t.warn}
                      />
                      <Spacer h={1.5} />
                      <Txt variant="tiny" faint>
                        Te faltan {restantes} cuotas ·{' '}
                        {money(p.installment_amount * restantes)} por pagar
                      </Txt>
                    </Card>
                  </SwipeRow>
                </View>
              );
            })}
          </>
        ) : (
          <EmptyState
            title="Sin compras a cuotas"
            subtitle="Cuando registres un gasto con esta tarjeta podras diferirlo y el plan aparece aqui."
          />
        )}

        {/* GASTOS FIJOS CARGADOS A ESTA TARJETA */}
        <Spacer h={6} />
        <SectionTitle
          title="Gastos fijos en esta tarjeta"
          action="Administrar"
          onAction={() => nav.navigate('FixedExpenses')}
        />
        {fixed.length ? (
          <Card style={{ gap: t.space(3) }}>
            {fixed.map((f) => (
              <Row key={f.id} justify="space-between" gap={2}>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" numberOfLines={1}>
                    {f.name}
                  </Txt>
                  <Txt variant="tiny" faint>
                    Dia {f.due_day}
                    {f.paid_this_month === 1 ? ' · pagado' : ' · pendiente'}
                  </Txt>
                </View>
                <Txt variant="body" weight="700">
                  {money(f.amount)}
                </Txt>
              </Row>
            ))}
            <Row justify="space-between">
              <Txt variant="small" muted>
                Total mensual
              </Txt>
              <Txt variant="body" weight="700">
                {money(fixedOnCard)}
              </Txt>
            </Row>
          </Card>
        ) : (
          <Card tone="alt">
            <Txt variant="small" muted>
              Ningun gasto fijo se carga a esta tarjeta. Al crear uno puedes
              elegirla como cuenta de pago (Netflix, Spotify, el gimnasio...).
            </Txt>
          </Card>
        )}
      </Screen>
    </View>
  );
}
