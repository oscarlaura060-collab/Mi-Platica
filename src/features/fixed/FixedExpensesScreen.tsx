import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
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
import { SwipeRow } from '@/components/SwipeRow';
import { useAppStore } from '@/store/useAppStore';
import {
  deleteFixedExpense,
  listFixedExpenses,
  monthlyFixedTotal,
  payFixedExpense,
  toOccurrences,
  unpayFixedExpense,
  type FixedExpenseStatus,
  type Occurrence,
} from '@/db/repositories/fixedExpenses';
import { listFixedIncomes, type FixedIncomeStatus } from '@/db/repositories/fixedIncomes';
import { money, pct } from '@/utils/money';
import { format } from '@/utils/date';
import { es } from 'date-fns/locale';
import type { RootNav } from '@/app/navigation/types';

/**
 * GASTOS FIJOS
 *
 * Se trabaja por VENCIMIENTO, no por gasto: un gasto quincenal aparece
 * dos veces al mes porque son dos salidas de plata distintas.
 *
 * Si al usuario le pagan por quincena, los vencimientos se agrupan por
 * ciclo de cobro: asi ve "de la quincena del 15 tengo que sacar X".
 */
export function FixedExpensesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { accounts, total, refresh } = useAppStore();

  const [items, setItems] = useState<FixedExpenseStatus[]>([]);
  const [mensual, setMensual] = useState(0);
  const [ingresos, setIngresos] = useState<FixedIncomeStatus[]>([]);

  const load = useCallback(async () => {
    const [list, m, ing] = await Promise.all([
      listFixedExpenses(true),
      monthlyFixedTotal(),
      listFixedIncomes(),
    ]);
    setItems(list);
    setMensual(m);
    setIngresos(ing);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const ocurrencias = useMemo(() => toOccurrences(items), [items]);
  const pendientes = ocurrencias.filter((o) => !o.paid);
  const pendienteTotal = pendientes.reduce((a, o) => a + o.amount, 0);
  const pagado = mensual - pendienteTotal;
  const libre = total - pendienteTotal;

  /** Quien cobra por quincena ve sus gastos repartidos en dos ciclos. */
  const quincenal = ingresos.find((i) => i.frequency === 'biweekly');
  const ciclos = useMemo(() => {
    if (!quincenal || !quincenal.pay_day_2) return null;
    const corte = quincenal.pay_day_2;
    // Primer ciclo: desde el primer pago hasta el dia antes del segundo.
    const c1 = ocurrencias.filter(
      (o) => o.dueDay >= quincenal.pay_day && o.dueDay < corte,
    );
    const c2 = ocurrencias.filter((o) => !c1.includes(o));
    return [
      { dia: quincenal.pay_day, items: c1 },
      { dia: corte, items: c2 },
    ];
  }, [ocurrencias, quincenal]);

  async function marcarPagado(o: Occurrence) {
    if (!accounts.length) {
      return Alert.alert('Sin cuentas', 'Crea una cuenta para registrar el pago.');
    }
    const cuenta = accounts.find((a) => a.id === o.expense.account_id) ?? accounts[0];
    Alert.alert(
      `Pagar ${o.expense.name}`,
      `Se registrara un gasto de ${money(o.amount)} desde ${cuenta.name}` +
        (o.expense.occurrences === 2 ? ` (${o.occurrence}a quincena).` : '.'),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar pago',
          onPress: async () => {
            await payFixedExpense({
              fixedExpenseId: o.expense.id,
              accountId: cuenta.id,
              occurrence: o.occurrence,
            });
            await Promise.all([load(), refresh()]);
          },
        },
      ],
    );
  }

  function borrar(f: FixedExpenseStatus) {
    Alert.alert('Eliminar gasto fijo', `¿Eliminar "${f.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteFixedExpense(f.id);
          await Promise.all([load(), refresh()]);
        },
      },
    ]);
  }

  /** Tarjeta de un vencimiento concreto. */
  const Vencimiento = ({ o }: { o: Occurrence }) => {
    const vencido = !o.paid && o.daysLeft < 0;
    const proximo = !o.paid && o.daysLeft >= 0 && o.daysLeft <= 3;

    return (
      <View style={{ marginBottom: t.space(2.5) }}>
        <SwipeRow
          onDelete={() => borrar(o.expense)}
          onPress={() =>
            nav.navigate('FixedExpenseForm', { fixedExpenseId: o.expense.id })
          }
        >
          <Card
            tone={o.paid ? 'alt' : 'default'}
            style={{ opacity: o.expense.status === 'paused' ? 0.5 : 1 }}
          >
            <Row justify="space-between" align="flex-start" gap={2}>
              <Row gap={2} style={{ flex: 1 }}>
                <View
                  style={{
                    width: 6,
                    alignSelf: 'stretch',
                    minHeight: 38,
                    borderRadius: 3,
                    backgroundColor: o.expense.color,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Row gap={2} align="center">
                    <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
                      {o.expense.name}
                    </Txt>
                    {o.expense.occurrences === 2 ? (
                      <Badge label={`${o.occurrence}a quincena`} tone="info" />
                    ) : null}
                  </Row>
                  <Spacer h={1} />
                  <Txt variant="tiny" faint>
                    {format(o.dueDate, "EEEE d 'de' LLLL", { locale: es })}
                    {o.expense.account_id
                      ? ` · ${
                          accounts.find((a) => a.id === o.expense.account_id)?.name ??
                          'cuenta eliminada'
                        }`
                      : ''}
                  </Txt>
                  <Spacer h={1} />
                  <Row gap={2} style={{ flexWrap: 'wrap' }}>
                    {o.expense.is_essential === 0 ? (
                      <Badge label="recortable" tone="warn" />
                    ) : null}
                    {o.paid ? (
                      <Badge label="pagado" tone="ok" />
                    ) : vencido ? (
                      <Badge label={`atrasado ${Math.abs(o.daysLeft)} d`} tone="danger" />
                    ) : proximo ? (
                      <Badge
                        label={o.daysLeft === 0 ? 'es hoy' : `en ${o.daysLeft} dias`}
                        tone="warn"
                      />
                    ) : null}
                  </Row>
                </View>
              </Row>
              <Txt variant="h3" numberOfLines={1}>
                {money(o.amount)}
              </Txt>
            </Row>

            <Spacer h={3} />
            {o.paid ? (
              <Button
                label="Deshacer pago"
                tone="ghost"
                size="sm"
                onPress={async () => {
                  await unpayFixedExpense(o.expense.id, o.occurrence);
                  await Promise.all([load(), refresh()]);
                }}
              />
            ) : (
              <Button
                label="Marcar como pagado"
                tone="neutral"
                size="sm"
                onPress={() => marcarPagado(o)}
              />
            )}
          </Card>
        </SwipeRow>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Gastos fijos</Txt>
        <Spacer h={1} />
        <Txt variant="small" muted>
          Lo que sale si o si cada mes.
        </Txt>

        {/* RESUMEN */}
        <Spacer h={4} />
        <Card glass>
          <Txt variant="tiny" faint weight="700">
            TE QUEDA LIBRE ESTE MES
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1} color={libre < 0 ? t.danger : t.text}>
            {money(libre)}
          </Txt>
          <Spacer h={2} />
          <Txt variant="tiny" faint>
            Saldo {money(total)} menos {money(pendienteTotal)} de gastos fijos que
            aun no pagas.
          </Txt>
          {mensual > 0 ? (
            <>
              <Spacer h={3} />
              <ProgressBar value={pct(pagado, mensual)} color={t.primary} />
              <Spacer h={2} />
              <Row justify="space-between">
                <Txt variant="tiny" faint>
                  Pagado {money(pagado)}
                </Txt>
                <Txt variant="tiny" faint>
                  Total mensual {money(mensual)}
                </Txt>
              </Row>
            </>
          ) : null}
        </Card>

        {/* POR CICLO DE PAGO */}
        {ciclos && pendientes.length ? (
          <>
            <Spacer h={6} />
            <SectionTitle title="Segun tus quincenas" />
            <Card tone="alt">
              <Txt variant="tiny" faint>
                Como te pagan el {ciclos[0].dia} y el {ciclos[1].dia}, esto es lo
                que debe salir de cada quincena.
              </Txt>
              <Spacer h={3} />
              {ciclos.map((c, i) => {
                const pend = c.items.filter((o) => !o.paid);
                const suma = pend.reduce((a, o) => a + o.amount, 0);
                const entra = quincenal?.amount ?? 0;
                const sobra = entra - suma;
                return (
                  <View key={c.dia}>
                    <Row justify="space-between" gap={2}>
                      <Txt variant="body" weight="700">
                        Quincena del {c.dia}
                      </Txt>
                      <Txt variant="body" weight="700" numberOfLines={1}>
                        {money(suma)}
                      </Txt>
                    </Row>
                    <Spacer h={1} />
                    <Txt variant="tiny" faint>
                      {pend.length} pago(s) pendiente(s)
                      {entra > 0
                        ? sobra >= 0
                          ? ` · te sobrarian ${money(sobra)}`
                          : ` · te faltarian ${money(Math.abs(sobra))}`
                        : ''}
                    </Txt>
                    {entra > 0 ? (
                      <>
                        <Spacer h={1.5} />
                        <ProgressBar
                          value={pct(suma, entra)}
                          color={sobra >= 0 ? t.primary : t.danger}
                          height={7}
                        />
                      </>
                    ) : null}
                    {i === 0 ? <Spacer h={3.5} /> : null}
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}

        {/* PENDIENTES */}
        <Spacer h={6} />
        <SectionTitle title={`Por pagar (${pendientes.length})`} />
        {pendientes.length ? (
          pendientes.map((o) => (
            <Vencimiento key={`${o.expense.id}-${o.occurrence}`} o={o} />
          ))
        ) : items.length ? (
          <Card tone="primary">
            <Txt variant="body" weight="700">
              Todo pagado este mes
            </Txt>
            <Spacer h={1} />
            <Txt variant="small" muted>
              No te queda ningun gasto fijo pendiente.
            </Txt>
          </Card>
        ) : (
          <EmptyState
            title="Sin gastos fijos"
            subtitle="Arriendo, servicios, mercado, suscripciones... Registralos con su frecuencia y la app sabra cuanta plata tienes de verdad."
          />
        )}

        {/* YA PAGADOS */}
        {ocurrencias.some((o) => o.paid) ? (
          <>
            <Spacer h={5} />
            <SectionTitle title="Ya pagados" />
            {ocurrencias
              .filter((o) => o.paid)
              .map((o) => (
                <Vencimiento key={`p-${o.expense.id}-${o.occurrence}`} o={o} />
              ))}
          </>
        ) : null}

        <Spacer h={4} />
        <Button
          label="+ Nuevo gasto fijo"
          onPress={() => nav.navigate('FixedExpenseForm', {})}
        />

        <Spacer h={5} />
        <Card tone="alt">
          <Txt variant="tiny" faint weight="700">
            POR QUE IMPORTA
          </Txt>
          <Spacer h={2} />
          <Txt variant="small" muted>
            Mirar el saldo de la cuenta engaña: ahi todavia esta el arriendo.
            Con tus gastos fijos y sus fechas registrados, el coach descuenta
            lo que falta por pagar antes de decirte si puedes gastar.
          </Txt>
        </Card>
        <Spacer h={2} />
        <Txt variant="tiny" faint>
          Desliza una fila hacia la izquierda para eliminarla. Pulsala para
          editarla.
        </Txt>
      </Screen>
    </View>
  );
}
