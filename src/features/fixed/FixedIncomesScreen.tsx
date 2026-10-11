import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { SwipeRow } from '@/components/SwipeRow';
import { useAppStore } from '@/store/useAppStore';
import {
  deleteFixedIncome,
  listFixedIncomes,
  monthlyIncomeTotal,
  nextIncome,
  receiveFixedIncome,
  unreceiveFixedIncome,
  type FixedIncomeStatus,
} from '@/db/repositories/fixedIncomes';
import { money } from '@/utils/money';
import { nextDueDate, daysUntil, format } from '@/utils/date';
import { es } from 'date-fns/locale';
import type { RootNav } from '@/app/navigation/types';

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Cada semana',
  biweekly: 'Cada quincena',
  monthly: 'Cada mes',
  yearly: 'Una vez al año',
  variable: 'Variable',
};

export function FixedIncomesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { accounts, primaryAccount, refresh } = useAppStore();

  const [items, setItems] = useState<FixedIncomeStatus[]>([]);
  const [mensual, setMensual] = useState(0);
  const [proximo, setProximo] = useState<{
    name: string;
    amount: number;
    daysLeft: number;
  } | null>(null);

  const load = useCallback(async () => {
    const [list, total, next] = await Promise.all([
      listFixedIncomes(true),
      monthlyIncomeTotal(),
      nextIncome(),
    ]);
    setItems(list);
    setMensual(total);
    setProximo(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const recibido = items
    .filter((f) => f.received_this_month === 1)
    .reduce((a, f) => a + (f.received_amount ?? f.amount), 0);

  async function marcarRecibido(f: FixedIncomeStatus) {
    if (!accounts.length) {
      return Alert.alert('Sin cuentas', 'Crea una cuenta para registrar el ingreso.');
    }
    const cuenta = accounts.find((a) => a.id === f.account_id) ?? primaryAccount ?? accounts[0];
    Alert.alert(
      `Registrar ${f.name}`,
      `Entraran ${money(f.amount)} a ${cuenta.name}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar',
          onPress: async () => {
            try {
              await receiveFixedIncome({ fixedIncomeId: f.id, accountId: cuenta.id });
              await Promise.all([load(), refresh()]);
              nav.replace('AllocateIncome', { amount: f.amount, accountId: cuenta.id });
            } catch (e) {
              Alert.alert('No se pudo registrar', e instanceof Error ? e.message : 'Intenta nuevamente.');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Ingresos fijos</Txt>
        <Spacer h={1} />
        <Txt variant="small" muted>
          Tu salario y lo que entra con regularidad.
        </Txt>

        <Spacer h={4} />
        <Card glass>
          <Txt variant="tiny" faint weight="700">
            ENTRA CADA MES
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1}>
            {money(mensual)}
          </Txt>
          {proximo ? (
            <>
              <Spacer h={3} />
              <Txt variant="small" muted>
                Proximo: {proximo.name} ({money(proximo.amount)}){' '}
                {proximo.daysLeft === 0
                  ? 'hoy'
                  : proximo.daysLeft === 1
                    ? 'mañana'
                    : `en ${proximo.daysLeft} dias`}
                .
              </Txt>
            </>
          ) : null}
          {recibido > 0 ? (
            <>
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                Ya recibiste {money(recibido)} este mes.
              </Txt>
            </>
          ) : null}
        </Card>

        <Spacer h={6} />
        <SectionTitle title={`Registrados (${items.length})`} />

        {items.length ? (
          items.map((f) => {
            const fecha = nextDueDate(f.pay_day);
            const faltan = daysUntil(fecha);
            return (
              <View key={f.id} style={{ marginBottom: t.space(2.5) }}>
                <SwipeRow
                  onPress={() => nav.navigate('FixedIncomeForm', { fixedIncomeId: f.id })}
                  onDelete={() =>
                    Alert.alert('Eliminar', `¿Eliminar "${f.name}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                          await deleteFixedIncome(f.id);
                          await Promise.all([load(), refresh()]);
                        },
                      },
                    ])
                  }
                >
                  <Card tone={f.received_this_month === 1 ? 'alt' : 'default'}>
                    <Row justify="space-between" align="flex-start" gap={2}>
                      <View style={{ flex: 1 }}>
                        <Txt variant="body" numberOfLines={1}>
                          {f.name}
                        </Txt>
                        <Spacer h={1} />
                        <Txt variant="tiny" faint>
                          {FREQ_LABEL[f.frequency] ?? f.frequency} ·{' '}
                          {format(fecha, "d 'de' LLLL", { locale: es })}
                          {f.pay_day_2 ? ` y dia ${f.pay_day_2}` : ''}
                        </Txt>
                        <Spacer h={1} />
                        <Row gap={2} style={{ flexWrap: 'wrap' }}>
                          {f.received_this_month === 1 ? (
                            <Badge label="recibido" tone="ok" />
                          ) : faltan <= 3 ? (
                            <Badge label={`en ${faltan} dias`} tone="warn" />
                          ) : null}
                          {f.is_reliable === 0 ? (
                            <Badge label="variable" tone="neutral" />
                          ) : null}
                        </Row>
                      </View>
                      <Txt variant="h3" numberOfLines={1} color={t.primary}>
                        {money(f.amount)}
                      </Txt>
                    </Row>

                    <Spacer h={3} />
                    {f.received_this_month === 1 ? (
                      <Button
                        label="Deshacer registro"
                        tone="ghost"
                        size="sm"
                        onPress={async () => {
                          await unreceiveFixedIncome(f.id);
                          await Promise.all([load(), refresh()]);
                        }}
                      />
                    ) : (
                      <Button
                        label="Ya me lo pagaron"
                        tone="neutral"
                        size="sm"
                        onPress={() => marcarRecibido(f)}
                      />
                    )}
                  </Card>
                </SwipeRow>
              </View>
            );
          })
        ) : (
          <EmptyState
            title="Sin ingresos fijos"
            subtitle="Registra tu salario y sabre cuando entra tu plata para organizarte por quincena o por mes."
          />
        )}

        <Spacer h={4} />
        <Button
          label="+ Nuevo ingreso fijo"
          onPress={() => nav.navigate('FixedIncomeForm', {})}
        />

        <Spacer h={5} />
        <Card tone="alt">
          <Txt variant="tiny" faint weight="700">
            PARA QUE SIRVE
          </Txt>
          <Spacer h={2} />
          <Txt variant="small" muted>
            Saber cuando entra tu plata cambia el consejo: no es lo mismo
            andar corto el dia 28 con el salario entrando el 30, que andar
            corto el dia 2.
          </Txt>
        </Card>
      </Screen>
    </View>
  );
}
