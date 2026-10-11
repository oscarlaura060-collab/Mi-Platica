import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Row, Spacer, Txt } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { MoneyInput } from '@/components/MoneyInput';
import {
  buildDestinations,
  type Destination,
  type DestinationPlan,
} from '@/domain/coach/destinations';
import { payDebt } from '@/db/repositories/debts';
import { payCreditCard } from '@/db/repositories/creditCards';
import { payFixedExpense } from '@/db/repositories/fixedExpenses';
import { depositToInvestment } from '@/db/repositories/investments';
import { contribute } from '@/db/repositories/goals';
import { futureValue } from '@/domain/invest/projection';
import { money, toCents } from '@/utils/money';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

/**
 * REPARTIR UN INGRESO
 *
 * El ingreso YA quedo registrado antes de llegar aqui. Esta pantalla solo
 * decide a donde se mueve despues, y todo lo que se muestra se puede
 * ejecutar: no hay lineas "informativas". Los montos vienen con la
 * sugerencia del coach pero son editables uno por uno.
 */
export function AllocateIncomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { amount, accountId } =
    useRoute<RouteProp<RootStackParamList, 'AllocateIncome'>>().params;
  const { settings, accounts, primaryAccount, refresh } = useAppStore();

  const [dests, setDests] = useState<Destination[]>([]);
  const [plan, setPlan] = useState<DestinationPlan | null>(null);
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);

  const cuenta = accounts.find((a) => a.id === accountId) ?? primaryAccount ?? accounts[0];
  const cuentaId = cuenta?.id ?? accountId;

  const cargar = useCallback(async () => {
    const plan = await buildDestinations(amount, {
      strategy: (settings.debt_strategy as 'avalanche' | 'snowball') ?? 'avalanche',
      splitDebt: Number(settings.income_split_debt ?? 50),
      splitSave: Number(settings.income_split_save ?? 20),
      balance: cuenta ? cuenta.balance - amount : 0,
    });
    setDests(plan.destinations);
    setPlan(plan);
    const inicial: Record<string, string> = {};
    for (const d of plan.destinations) {
      inicial[d.key] = d.suggested > 0 ? String(Math.round(d.suggested / 100)) : '';
    }
    setMontos(inicial);
    setCargado(true);
  }, [amount, settings, cuenta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const valor = (key: string) => toCents(montos[key] || '0');
  const asignado = useMemo(
    () => dests.reduce((a, d) => a + valor(d.key), 0),
    [dests, montos],
  );
  const libre = amount - asignado;
  const excedido = libre < 0;

  /** Guarda el monto de un destino en centavos (lo que usa MoneyInput). */
  function setCents(key: string, cents: number) {
    setMontos((p) => ({ ...p, [key]: cents > 0 ? String(Math.round(cents / 100)) : '' }));
  }

  function set(key: string, texto: string) {
    setMontos((p) => ({ ...p, [key]: texto.replace(/[^\d]/g, '') }));
  }

  function usarSugerido() {
    const n: Record<string, string> = {};
    for (const d of dests) n[d.key] = d.suggested > 0 ? String(Math.round(d.suggested / 100)) : '';
    setMontos(n);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function limpiar() {
    setMontos({});
    Haptics.selectionAsync().catch(() => undefined);
  }

  function llenar(d: Destination) {
    // Pone el maximo que tiene sentido: el tope del destino o lo que
    // quede sin asignar, lo que sea menor.
    const restante = libre + valor(d.key);
    const tope = d.cap > 0 ? Math.min(d.cap, restante) : restante;
    set(d.key, String(Math.max(Math.round(tope / 100), 0)));
  }

  async function aplicar() {
    if (excedido) {
      return Alert.alert(
        'Te pasaste',
        `Estas repartiendo ${money(asignado)} de un ingreso de ${money(amount)}.`,
      );
    }
    const excedeDestino = dests.find((d) => d.cap > 0 && valor(d.key) > d.cap);
    if (excedeDestino) {
      return Alert.alert(
        'Monto superior al saldo',
        `${excedeDestino.label} tiene un saldo pendiente de ${money(excedeDestino.cap)}. Corrige el monto antes de continuar.`,
      );
    }
    if (cuenta && asignado > cuenta.balance) {
      return Alert.alert(
        'Saldo insuficiente',
        `En ${cuenta.name} hay ${money(cuenta.balance)} disponibles para aplicar.`,
      );
    }
    setGuardando(true);
    try {
      for (const d of dests) {
        const v = valor(d.key);
        if (v <= 0) continue;

        if (d.kind === 'fixed') {
          await payFixedExpense({
            fixedExpenseId: d.refId,
            accountId: cuentaId,
            amount: v,
          });
        } else if (d.kind === 'card') {
          await payCreditCard({
            cardId: d.refId,
            fromAccountId: cuentaId,
            amount: v,
            advancePlans: true,
          });
        } else if (d.kind === 'debt') {
          await payDebt({
            debtId: d.refId,
            accountId: cuentaId,
            amount: v,
            isExtra: true,
            note: 'Reparto del ingreso',
          });
        } else if (d.kind === 'goal') {
          await contribute({
            goalId: d.refId,
            accountId: cuentaId,
            amount: v,
            note: 'Reparto del ingreso',
          });
        } else if (d.kind === 'invest') {
          await depositToInvestment({
            investmentId: d.refId,
            accountId: cuentaId,
            amount: v,
            note: 'Reparto del ingreso',
          });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.goBack();
    } catch (e) {
      Alert.alert('No se pudo completar el reparto', e instanceof Error ? e.message : 'Revisa los montos y vuelve a intentarlo.');
    } finally {
      setGuardando(false);
    }
  }

  const titulo: Record<Destination['kind'], string> = {
    fixed: 'Gastos fijos del mes',
    card: 'Tarjetas de credito',
    debt: 'Deudas',
    goal: 'Metas de ahorro',
    invest: 'Inversion',
  };

  const grupos: Destination['kind'][] = ['fixed', 'card', 'debt', 'goal', 'invest'];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <View style={{ paddingHorizontal: t.space(5) }}>
        <Row justify="space-between">
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Txt variant="body" muted>
              Despues
            </Txt>
          </Pressable>
          <Txt variant="small" muted>
            Repartir ingreso
          </Txt>
        </Row>

        <Spacer h={4} />
        <Card tone={excedido ? 'danger' : libre === 0 ? 'primary' : 'default'}>
          <Row justify="space-between" align="flex-start" gap={2}>
            <View>
              <Txt variant="tiny" faint weight="700">
                {excedido ? 'TE PASASTE POR' : 'SIN ASIGNAR'}
              </Txt>
              <Spacer h={1} />
              <Txt variant="h1" numberOfLines={1}>
                {money(Math.abs(libre))}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="tiny" faint>
                Ingreso
              </Txt>
              <Txt variant="body" weight="700" numberOfLines={1}>
                {money(amount)}
              </Txt>
              <Spacer h={1} />
              <Txt variant="tiny" faint>
                Repartido {money(asignado)}
              </Txt>
            </View>
          </Row>
          <Spacer h={2} />
          <Txt variant="tiny" faint>
            {excedido
              ? 'Baja algun monto: no puedes repartir mas de lo que entro.'
              : libre === 0
                ? 'Todo asignado.'
                : `Lo que dejes sin asignar se queda disponible en ${cuenta?.name ?? 'tu cuenta'}.`}
          </Txt>
        </Card>

        {/* MENSAJE DEL COACH */}
        {plan ? (
          <>
            <Spacer h={3} />
            <Card tone={plan.uncovered.length ? 'warn' : 'primary'}>
              <Txt variant="h3">{plan.headline}</Txt>
              <Spacer h={1.5} />
              <Txt variant="small" muted>
                {plan.detail}
              </Txt>
              {plan.funMoney > 0 ? (
                <>
                  <Spacer h={2.5} />
                  <Row gap={2} align="center">
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: t.radius.pill,
                        backgroundColor: t.warnSoft,
                      }}
                    >
                      <Txt variant="tiny" color={t.warn} weight="700">
                        para un gusto {money(plan.funMoney)}
                      </Txt>
                    </View>
                  </Row>
                </>
              ) : null}
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                Es una recomendacion: puedes cambiar cualquier monto y nada se
                mueve hasta que toques el boton de abajo.
              </Txt>
            </Card>
          </>
        ) : null}

        <Spacer h={3} />
        <Row gap={2}>
          <Button
            label="Usar lo sugerido"
            tone="neutral"
            size="sm"
            style={{ flex: 1 }}
            onPress={usarSugerido}
          />
          <Button label="Limpiar" tone="ghost" size="sm" onPress={limpiar} />
        </Row>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: t.space(5),
          paddingTop: t.space(4),
          paddingBottom: t.space(6),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!cargado ? null : dests.length === 0 ? (
          <Card tone="alt">
            <Txt variant="small" muted>
              No tienes deudas, gastos fijos ni vehiculos de ahorro
              registrados, asi que no hay a donde repartir. El ingreso ya
              quedo en tu cuenta.
            </Txt>
          </Card>
        ) : (
          grupos.map((g) => {
            const items = dests.filter((d) => d.kind === g);
            if (!items.length) return null;
            return (
              <View key={g}>
                <Txt variant="tiny" faint weight="700">
                  {titulo[g].toUpperCase()}
                </Txt>
                <Spacer h={2} />
                {items.map((d) => {
                  const v = valor(d.key);
                  const activo = v > 0;
                  return (
                    <Card
                      key={d.key}
                      tone={activo ? 'primary' : 'default'}
                      style={{ marginBottom: t.space(2.5) }}
                    >
                      <Row gap={2} align="flex-start">
                        <View
                          style={{
                            width: 6,
                            alignSelf: 'stretch',
                            minHeight: 36,
                            borderRadius: 3,
                            backgroundColor: d.color,
                          }}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Txt variant="body" numberOfLines={1}>
                            {d.label}
                          </Txt>
                          <Spacer h={1} />
                          <Txt variant="tiny" faint>
                            {d.hint}
                          </Txt>
                          {d.suggested > 0 ? (
                            <>
                              <Spacer h={1} />
                              <Badge
                                label={`sugerido ${money(d.suggested)}`}
                                tone="info"
                              />
                            </>
                          ) : null}

                          <Spacer h={2.5} />
                          <Row gap={2}>
                            <View style={{ flex: 1 }}>
                              <MoneyInput
                                value={valor(d.key)}
                                onChange={(c) => setCents(d.key, c)}
                                style={
                                  activo ? { borderColor: t.primary } : undefined
                                }
                              />
                            </View>
                            <Button
                              label={d.cap > 0 ? 'Todo' : 'Resto'}
                              tone="neutral"
                              size="sm"
                              onPress={() => llenar(d)}
                            />
                          </Row>

                          {/* Para inversiones, el efecto de ese aporte. */}
                          {d.kind === 'invest' && v > 0 ? (
                            <>
                              <Spacer h={2} />
                              <Txt variant="tiny" color={t.primary}>
                                En 10 años serian{' '}
                                {money(
                                  futureValue(
                                    v,
                                    0,
                                    Number(d.hint.match(/([\d.]+)%/)?.[1] ?? 0) * 100,
                                    120,
                                  ),
                                )}
                                .
                              </Txt>
                            </>
                          ) : null}
                        </View>
                      </Row>
                    </Card>
                  );
                })}
                <Spacer h={3} />
              </View>
            );
          })
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: t.space(5),
          paddingBottom: insets.bottom + t.space(3),
          paddingTop: t.space(2),
          borderTopWidth: 1,
          borderTopColor: t.border,
          backgroundColor: t.bgElevated,
        }}
      >
        <Button
          label={
            asignado > 0 ? `Repartir ${money(asignado)}` : 'Dejar para después'
          }
          onPress={asignado > 0 ? aplicar : () => nav.goBack()}
          loading={guardando}
          disabled={excedido}
          size="lg"
        />
      </View>
    </View>
  );
}
