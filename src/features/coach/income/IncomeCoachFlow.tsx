import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  CreditCard,
  Download,
  PiggyBank,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import { buildDestinations, type DestinationPlan } from '@/domain/coach/destinations';
import {
  buildIncomePlan,
  leaveAllForLater,
  setDestination,
  toggleBucket,
  validate,
  type BucketKey,
  type IncomeCoachStep,
  type IncomePlan,
} from '@/domain/coach/incomePlan';
import { listGoals, contribute, type GoalProgress } from '@/db/repositories/goals';
import { payDebt } from '@/db/repositories/debts';
import { payCreditCard } from '@/db/repositories/creditCards';
import { payFixedExpense } from '@/db/repositories/fixedExpenses';
import { depositToInvestment } from '@/db/repositories/investments';
import { addTransaction } from '@/db/repositories/transactions';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';
import {
  Aviso,
  BarraProporcion,
  BotonCTA,
  C,
  Casilla,
  CheckConEstrellas,
  FilaDestino,
  IconoBolsa,
  PASOS,
  Panel,
  ProgresoPasos,
  Simbolo,
  T,
  TITULO_PASO,
} from './parts';

const ICONO: Record<BucketKey, typeof Briefcase> = {
  commitments: Briefcase,
  savings: PiggyBank,
  available: CreditCard,
};

const COLOR: Record<BucketKey, string> = {
  commitments: BRAND.turquoise,
  savings: BRAND.yellow,
  available: BRAND.turquoiseDark,
};

/**
 * EL COACH REPARTE UN INGRESO, EN CINCO PASOS
 *
 * El ingreso YA quedo registrado antes de llegar aqui. Lo que sigue es
 * decidir a donde va, y la regla que manda sobre todo lo demas es esta:
 * nada se escribe en la base hasta que la persona confirma en el paso 4.
 *
 * Las tres bolsas (Compromisos, Ahorro, Disponible) son presentacion.
 * Detras hay destinos concretos y ejecutables que salen de los datos
 * reales: este arriendo, esta tarjeta, esta meta. Si no hay compromisos
 * registrados, la bolsa aparece vacia y se dice; no se inventa nada.
 *
 * "Aplicar" registra pagos y aportes DENTRO de la app. No hay ninguna
 * conexion con un banco, y la interfaz lo repite en los dos pasos donde
 * alguien podria confundirse.
 */
export function IncomeCoachFlow() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { amount, accountId } =
    useRoute<RouteProp<RootStackParamList, 'AllocateIncome'>>().params;
  const { settings, accounts, refresh } = useAppStore();

  const [paso, setPaso] = useState<IncomeCoachStep>('recommendation');
  const [plan, setPlan] = useState<IncomePlan | null>(null);
  const [destinos, setDestinos] = useState<DestinationPlan | null>(null);
  const [metas, setMetas] = useState<GoalProgress[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [hoja, setHoja] = useState<null | 'source' | 'savings' | 'available'>(null);

  const cuenta = accounts.find((a) => a.id === accountId);
  const [origenId, setOrigenId] = useState(accountId);
  const origen = accounts.find((a) => a.id === origenId) ?? cuenta;

  // Transicion entre pasos: un fade corto, nada de rebotes.
  const fade = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (t.reduceMotion) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [paso, fade, t.reduceMotion]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [dp, gs] = await Promise.all([
      buildDestinations(amount, {
        strategy: (settings.debt_strategy as 'avalanche' | 'snowball') ?? 'avalanche',
        splitDebt: Number(settings.income_split_debt ?? 50),
        splitSave: Number(settings.income_split_save ?? 20),
        balance: cuenta ? cuenta.balance - amount : 0,
      }),
      listGoals('active'),
    ]);
    setDestinos(dp);
    setMetas(gs);
    setPlan(
      buildIncomePlan({
        income: amount,
        plan: dp,
        sourceAccountId: accountId,
        sourceAccountName: cuenta?.name ?? 'Tu cuenta',
      }),
    );
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, accountId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const problemas = useMemo(
    () => (plan ? validate(plan, origen?.balance ?? null) : []),
    [plan, origen],
  );
  const problemaDe = (k: BucketKey) =>
    problemas.find((p) => p.bucket === k)?.message ?? null;

  function ir(siguiente: IncomeCoachStep) {
    Haptics.selectionAsync().catch(() => undefined);
    setPaso(siguiente);
  }

  function atras() {
    const i = PASOS.indexOf(paso);
    // Volver conserva el estado: `plan` nunca se reinicia aqui.
    if (i <= 0) return nav.goBack();
    ir(PASOS[i - 1]);
  }

  async function aplicar() {
    if (!plan || !destinos || guardando || problemas.length > 0) return;

    setGuardando(true);
    setErrorGuardar(null);
    try {
      for (const b of plan.buckets) {
        if (!b.selected || b.amount <= 0) continue;

        if (b.key === 'commitments') {
          // Cada compromiso se paga contra su propia fila: por eso la
          // bolsa guarda los destinos concretos y no solo un total.
          for (const item of b.items) {
            const d = destinos.destinations.find((x) => x.key === item.key);
            if (!d) continue;
            if (d.kind === 'fixed') {
              await payFixedExpense({
                fixedExpenseId: d.refId,
                accountId: origenId,
                amount: item.amount,
              });
            } else if (d.kind === 'card') {
              await payCreditCard({
                cardId: d.refId,
                fromAccountId: origenId,
                amount: item.amount,
                advancePlans: true,
              });
            } else if (d.kind === 'debt') {
              await payDebt({
                debtId: d.refId,
                accountId: origenId,
                amount: item.amount,
                isExtra: true,
                note: 'Plan del ingreso',
              });
            }
          }
        } else if (b.key === 'savings') {
          if (b.destinationType === 'savings-goal' && b.destinationId) {
            await contribute({
              goalId: b.destinationId,
              accountId: origenId,
              amount: b.amount,
              note: 'Plan del ingreso',
            });
          } else {
            const inv = b.items.find((i) => i.key.startsWith('invest-'));
            if (inv) {
              await depositToInvestment({
                investmentId: Number(inv.key.split('-')[1]),
                accountId: origenId,
                amount: b.amount,
                note: 'Plan del ingreso',
              });
            }
          }
        } else if (b.key === 'available') {
          // Si el disponible se queda en la cuenta donde cayo el ingreso
          // NO se registra nada: la plata ya esta ahi. Inventar un
          // movimiento seria ensuciar el historial.
          if (b.destinationId && b.destinationId !== origenId) {
            await addTransaction({
              type: 'transfer',
              amount: b.amount,
              accountId: origenId,
              toAccountId: b.destinationId,
              note: 'Disponible del ingreso',
            });
          }
        }
      }

      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      setPaso('applied');
    } catch {
      setErrorGuardar('No pudimos aplicar este plan. Tus datos no cambiaron.');
    } finally {
      setGuardando(false);
    }
  }

  // --- Estructura -------------------------------------------------------
  const Cabecera = () => (
    <View
      style={{
        backgroundColor: C.header,
        paddingTop: insets.top + space(2),
        paddingHorizontal: space(5),
        paddingBottom: space(3.5),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {paso === 'applied' ? (
          <View style={{ width: 44 }} />
        ) : (
          <Pressable
            onPress={atras}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={10}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'flex-start',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ArrowLeft size={24} color={BRAND.white} strokeWidth={2.4} />
          </Pressable>
        )}

        <View style={{ flex: 1, alignItems: 'center' }}>
          <T size={17} weight="800" color={BRAND.white} lines={1} header>
            {TITULO_PASO[paso]}
          </T>
        </View>

        <View style={{ width: 44, alignItems: 'flex-end' }}>
          <Simbolo size={30} />
        </View>
      </View>

      {paso === 'applied' ? null : (
        <>
          <View style={{ height: space(3) }} />
          <ProgresoPasos paso={paso} />
        </>
      )}
    </View>
  );

  const Cuerpo = ({ children }: { children: React.ReactNode }) => (
    <Animated.View style={{ flex: 1, opacity: fade }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.fondo }}
        contentContainerStyle={{
          padding: space(5),
          paddingBottom: insets.bottom + space(8),
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );

  const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

  if (cargando || !plan) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo }}>
        <Cabecera />
        <Cuerpo>
          <Skeleton height={104} radius={radius.lg} />
          <Sep />
          <Skeleton height={132} radius={radius.lg} />
          <Sep h={3} />
          <Skeleton height={132} radius={radius.lg} />
        </Cuerpo>
      </View>
    );
  }

  const bolsa = (k: BucketKey) => plan.buckets.find((b) => b.key === k)!;
  const elegidas = plan.buckets.filter((b) => b.selected && b.amount > 0);

  const vacioTexto = (k: BucketKey) =>
    k === 'commitments'
      ? 'No tienes compromisos registrados. Puedes dejar esta parte disponible o agregar un compromiso después.'
      : 'Aún no tienes una meta de ahorro.';

  // =====================================================================
  // PASO 1 · Revisar recomendacion
  // =====================================================================
  const Recomendacion = () => (
    <Cuerpo>
      <T size={21} weight="800" header>
        ¿Qué hacemos con esta plata?
      </T>
      <Sep h={3.5} />

      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 17,
            backgroundColor: BRAND.paleTurquoise,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Download size={26} color={BRAND.turquoiseDark} strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={13} weight="500" color={C.textoSuave}>
            Ingreso recibido
          </T>
          <T size={27} weight="800" lines={1} a11y={money(amount)}>
            {money(amount)}
          </T>
          <T size={13} weight="500" color={C.textoSuave} lines={1}>
            Ingreso · {cuenta?.name ?? 'Tu cuenta'}
          </T>
        </View>
      </Panel>

      <Sep h={5} />
      <T size={17} weight="800">
        Te propongo este plan
      </T>
      <Sep h={1} />
      <T size={13} weight="500" color={C.textoSuave}>
        Es una propuesta. Tú decides qué aplicar en el siguiente paso.
      </T>
      <Sep h={3} />

      {plan.buckets.map((b) => (
        <View key={b.key}>
          <Panel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}>
              <IconoBolsa Icon={ICONO[b.key]} color={COLOR[b.key]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={15} weight="700">
                  {b.title}
                </T>
                <View
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(2.5) }}
                >
                  <T size={14} weight="600" color={C.textoSuave}>
                    {b.percentage}%
                  </T>
                  <T size={17} weight="800" lines={1}>
                    {money(b.amount)}
                  </T>
                </View>
              </View>
              <Casilla marcada={b.selected} color={COLOR[b.key]} />
            </View>

            <Sep h={2.5} />
            <BarraProporcion
              porcentaje={b.percentage}
              color={COLOR[b.key]}
              animar={!t.reduceMotion}
            />
            <Sep h={2} />
            <T size={12.5} weight="500" color={C.textoSuave} style={{ lineHeight: 18 }}>
              {b.amount > 0 ? b.description : vacioTexto(b.key)}
            </T>
          </Panel>
          <Sep h={3} />
        </View>
      ))}

      <Sep h={2} />
      <BotonCTA label="Continuar" onPress={() => ir('selection')} />
    </Cuerpo>
  );

  // =====================================================================
  // PASO 2 · Elegir que aceptar
  // =====================================================================
  const Seleccion = () => {
    const nada = elegidas.length === 0;
    return (
      <Cuerpo>
        <T size={14.5} weight="500" color={C.textoSuave} style={{ lineHeight: 21 }}>
          Elige las categorías que quieres incluir en este ingreso.
        </T>
        <Sep />

        {plan.buckets.map((b) => {
          const vacia = b.amount <= 0;
          return (
            <View key={b.key}>
              <Pressable
                onPress={() => {
                  if (vacia) return;
                  Haptics.selectionAsync().catch(() => undefined);
                  setPlan(toggleBucket(plan, b.key));
                }}
                disabled={vacia}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: b.selected, disabled: vacia }}
                accessibilityLabel={`${b.title}, ${b.percentage} por ciento, ${money(b.amount)}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : vacia ? 0.45 : 1 })}
              >
                <Panel>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}
                  >
                    <IconoBolsa Icon={ICONO[b.key]} color={COLOR[b.key]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T size={15} weight="700">
                        {b.title}
                      </T>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          gap: space(2.5),
                        }}
                      >
                        <T size={14} weight="600" color={C.textoSuave}>
                          {b.percentage}%
                        </T>
                        <T size={17} weight="800" lines={1}>
                          {money(b.amount)}
                        </T>
                      </View>
                    </View>
                    <Casilla marcada={b.selected} color={COLOR[b.key]} />
                  </View>
                  <Sep h={2} />
                  <T
                    size={12.5}
                    weight="500"
                    color={C.textoSuave}
                    style={{ lineHeight: 18 }}
                  >
                    {vacia ? vacioTexto(b.key) : b.description}
                  </T>
                </Panel>
              </Pressable>
              <Sep h={3} />
            </View>
          );
        })}

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            setPlan(leaveAllForLater(plan));
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: nada }}
          accessibilityLabel="Dejar disponible para después"
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          <Panel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}>
              <IconoBolsa Icon={Clock} color={BRAND.mutedDark} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={15} weight="700">
                  Dejar disponible para después
                </T>
                <T size={12.5} weight="500" color={C.textoSuave}>
                  Puedes aplicarlo más tarde.
                </T>
              </View>
              <Casilla marcada={nada} color={BRAND.mutedDark} />
            </View>
          </Panel>
        </Pressable>

        <Sep h={5} />
        <Panel>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: space(2),
            }}
          >
            <T size={14.5} weight="600" color={C.textoSuave} style={{ flex: 1 }}>
              Seleccionado:
            </T>
            <T size={20} weight="800" lines={1}>
              {money(plan.applied)}
            </T>
          </View>
          {plan.unassigned > 0 ? (
            <>
              <Sep h={2.5} />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: space(2),
                }}
              >
                <T size={13.5} weight="500" color={C.textoSuave} style={{ flex: 1 }}>
                  Para después:
                </T>
                <T size={15} weight="700" color={BRAND.turquoiseDark} lines={1}>
                  {money(plan.unassigned)}
                </T>
              </View>
            </>
          ) : null}
        </Panel>

        {nada ? (
          <>
            <Sep h={3} />
            <T size={13.5} weight="600" color={BRAND.coral}>
              Selecciona al menos una categoría para continuar.
            </T>
          </>
        ) : null}

        <Sep h={5} />
        <BotonCTA
          label="Elegir cuentas"
          onPress={() => ir('accounts')}
          disabled={nada}
        />
      </Cuerpo>
    );
  };

  // =====================================================================
  // PASO 3 · Cuentas de origen y destino
  // =====================================================================
  const Cuentas = () => {
    const sinSaldo = problemas.some((p) => p.message.includes('saldo suficiente'));
    const items = bolsa('commitments').items;

    return (
      <Cuerpo>
        <T size={14.5} weight="500" color={C.textoSuave} style={{ lineHeight: 21 }}>
          Asigna las cuentas o metas para organizar este ingreso. No es una
          transferencia automática.
        </T>
        <Sep h={4.5} />

        <T size={16} weight="800">
          Sale de
        </T>
        <Sep h={2.5} />
        <Panel style={{ paddingVertical: space(1) }}>
          <FilaDestino
            Icon={CreditCard}
            color={origen?.color ?? BRAND.turquoise}
            titulo={origen?.name ?? 'Tu cuenta'}
            subtitulo={origen?.id === accountId ? 'Cuenta principal' : 'Cuenta elegida'}
            monto={origen?.balance ?? 0}
            onPress={() => setHoja('source')}
            borde={false}
            a11y={`Cuenta de origen: ${origen?.name}, ${money(origen?.balance ?? 0)}`}
          />
        </Panel>

        {sinSaldo ? (
          <>
            <Sep h={2.5} />
            <T size={13.5} weight="600" color={BRAND.coral} style={{ lineHeight: 19 }}>
              Esta cuenta no tiene saldo suficiente. Elige otra cuenta o ajusta los
              montos.
            </T>
          </>
        ) : null}

        <Sep h={5} />
        <T size={16} weight="800">
          Se organiza así
        </T>
        <Sep h={2.5} />
        <Panel style={{ paddingVertical: space(1) }}>
          {elegidas.map((b, i) => {
            const ultima = i === elegidas.length - 1 && plan.unassigned <= 0;
            return (
              <View key={b.key}>
                <FilaDestino
                  Icon={ICONO[b.key]}
                  color={COLOR[b.key]}
                  titulo={b.title}
                  subtitulo={
                    b.key === 'available' && b.destinationId === accountId
                      ? `Se queda en ${b.destinationName}`
                      : (b.destinationName ?? 'Sin destino')
                  }
                  monto={b.amount}
                  borde={!ultima}
                  onPress={
                    b.key === 'savings'
                      ? () => setHoja('savings')
                      : b.key === 'available'
                        ? () => setHoja('available')
                        : undefined
                  }
                />
                {problemaDe(b.key) ? (
                  <T
                    size={12.5}
                    weight="600"
                    color={BRAND.coral}
                    style={{ marginBottom: space(2) }}
                  >
                    {problemaDe(b.key)}
                  </T>
                ) : null}
              </View>
            );
          })}

          {plan.unassigned > 0 ? (
            <FilaDestino
              Icon={Clock}
              color={BRAND.mutedDark}
              titulo="Sin asignar"
              subtitulo="Para después"
              monto={plan.unassigned}
              borde={false}
            />
          ) : null}
        </Panel>

        {/* El detalle de compromisos: la app paga filas concretas, no un
            total opaco, y el usuario tiene derecho a verlas. */}
        {bolsa('commitments').selected && items.length > 0 ? (
          <>
            <Sep h={4} />
            <T size={13} weight="700" color={C.textoSuave}>
              QUÉ SE PAGA CON COMPROMISOS
            </T>
            <Sep h={2} />
            <Panel style={{ paddingVertical: space(2) }}>
              {items.map((i) => (
                <View
                  key={i.key}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: space(2),
                    paddingVertical: space(1.5),
                  }}
                >
                  <T size={13.5} weight="500" color={C.textoSuave} style={{ flex: 1 }} lines={1}>
                    {i.label}
                  </T>
                  <T size={13.5} weight="700" lines={1}>
                    {money(i.amount)}
                  </T>
                </View>
              ))}
            </Panel>
          </>
        ) : null}

        <Sep h={4} />
        <Aviso texto="Estarás organizando tu dinero según tus elecciones." />

        <Sep h={5} />
        <BotonCTA
          label="Revisar plan"
          onPress={() => ir('review')}
          disabled={problemas.length > 0}
        />
      </Cuerpo>
    );
  };

  // =====================================================================
  // PASO 4 · Revisar antes de aplicar
  // =====================================================================
  const Revision = () => (
    <Cuerpo>
      <T size={14.5} weight="500" color={C.textoSuave} style={{ lineHeight: 21 }}>
        Verifica la información antes de aplicar. Nada se aplica hasta que tú lo
        confirmes.
      </T>
      <Sep h={4.5} />

      <Panel style={{ paddingVertical: space(2) }}>
        <T size={13} weight="600" color={C.textoSuave}>
          Desde
        </T>
        <FilaDestino
          Icon={CreditCard}
          color={origen?.color ?? BRAND.turquoise}
          titulo={origen?.name ?? 'Tu cuenta'}
          monto={amount}
          borde={false}
        />

        {elegidas.map((b) => (
          <FilaDestino
            key={b.key}
            Icon={ICONO[b.key]}
            color={COLOR[b.key]}
            titulo={`A ${b.title}`}
            subtitulo={b.destinationName}
            monto={b.amount}
            borde={false}
          />
        ))}

        {plan.unassigned > 0 ? (
          <FilaDestino
            Icon={Clock}
            color={BRAND.mutedDark}
            titulo="Para después"
            subtitulo="Sin asignar"
            monto={plan.unassigned}
            borde={false}
          />
        ) : null}
      </Panel>

      <Sep />
      <Aviso
        tono="amarillo"
        texto="La app organizará este ingreso según tus elecciones. No mueve plata en tu banco."
      />
      <Sep h={3} />
      <T size={13} weight="500" color={C.textoSuave} align="center">
        Nada se aplica hasta que tú lo confirmes.
      </T>

      {errorGuardar ? (
        <>
          <Sep />
          <Panel tono="coral">
            <T size={15} weight="700">
              {errorGuardar}
            </T>
          </Panel>
        </>
      ) : null}

      <Sep h={4.5} />
      <BotonCTA
        label={
          guardando ? 'Aplicando...' : errorGuardar ? 'Intentar de nuevo' : 'Aplicar plan'
        }
        onPress={aplicar}
        disabled={guardando || problemas.length > 0}
      />
      <Sep h={3} />
      <BotonCTA label="Editar" tono="contorno" onPress={() => ir('accounts')} />
    </Cuerpo>
  );

  // =====================================================================
  // PASO 5 · Plan aplicado
  // =====================================================================
  const Aplicado = () => (
    <Cuerpo>
      <Sep h={4} />
      <View style={{ alignItems: 'center' }}>
        <CheckConEstrellas reduceMotion={t.reduceMotion} />
        <Sep h={1} />
        <T size={34} weight="800" align="center" header>
          ¡Listo!
        </T>
        <Sep h={1.5} />
        <T size={16} weight="600" color={C.textoSuave} align="center">
          Tu ingreso quedó organizado
        </T>
      </View>

      <Sep h={5} />
      <Panel style={{ paddingVertical: space(1) }}>
        {elegidas.map((b, i) => (
          <FilaDestino
            key={b.key}
            Icon={ICONO[b.key]}
            color={COLOR[b.key]}
            titulo={b.title}
            monto={b.amount}
            punto
            borde={i < elegidas.length - 1 || plan.unassigned > 0}
          />
        ))}
        {plan.unassigned > 0 ? (
          <FilaDestino
            Icon={Clock}
            color={BRAND.mutedDark}
            titulo="Para después"
            monto={plan.unassigned}
            punto
            borde={false}
          />
        ) : null}
      </Panel>

      <Sep h={4.5} />
      <Panel
        tono="turquesa"
        style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}
      >
        <Simbolo size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={15} weight="700">
            Ahora sabes a dónde va tu plata.
          </T>
          <T size={13} weight="500" color={C.textoSuave}>
            Pequeñas decisiones, grandes planes.
          </T>
        </View>
      </Panel>

      <Sep h={5} />
      <BotonCTA
        label="Ver inicio"
        onPress={() => nav.navigate('Tabs', { screen: 'Home' })}
      />
    </Cuerpo>
  );

  // --- Hoja de seleccion -------------------------------------------------
  const opciones =
    hoja === 'savings'
      ? metas.map((g) => ({
          id: g.id,
          name: g.name,
          sub: `Llevas ${money(g.saved)} de ${money(g.target_amount)}`,
        }))
      : accounts.map((a) => ({ id: a.id, name: a.name, sub: money(a.balance) }));

  function elegirDeHoja(id: number, name: string) {
    if (hoja === 'source') setOrigenId(id);
    else if (hoja === 'savings')
      setPlan(setDestination(plan!, 'savings', { type: 'savings-goal', id, name }));
    else if (hoja === 'available')
      setPlan(setDestination(plan!, 'available', { type: 'account', id, name }));
    setHoja(null);
    Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <Cabecera />
      {paso === 'recommendation' ? <Recomendacion /> : null}
      {paso === 'selection' ? <Seleccion /> : null}
      {paso === 'accounts' ? <Cuentas /> : null}
      {paso === 'review' ? <Revision /> : null}
      {paso === 'applied' ? <Aplicado /> : null}

      <Modal
        visible={hoja !== null}
        transparent
        animationType={t.reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setHoja(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#07121BA8' }}
          onPress={() => setHoja(null)}
          accessibilityLabel="Cerrar"
        />
        <View
          style={{
            backgroundColor: C.tarjeta,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            padding: space(5),
            paddingBottom: insets.bottom + space(5),
            maxHeight: '70%',
          }}
        >
          <T size={18} weight="800">
            {hoja === 'source'
              ? '¿Desde qué cuenta?'
              : hoja === 'savings'
                ? '¿A qué meta?'
                : '¿Dónde queda disponible?'}
          </T>
          <Sep h={3} />
          <ScrollView>
            {opciones.length === 0 ? (
              <>
                <T size={14} weight="500" color={C.textoSuave}>
                  Aún no tienes una meta de ahorro.
                </T>
                <Sep h={3} />
                <BotonCTA
                  label="Crear meta"
                  onPress={() => {
                    setHoja(null);
                    nav.navigate('GoalForm', {});
                  }}
                />
              </>
            ) : (
              opciones.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => elegirDeHoja(o.id, o.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.name}, ${o.sub}`}
                  style={({ pressed }) => ({
                    minHeight: 58,
                    justifyContent: 'center',
                    paddingVertical: space(2.5),
                    borderBottomWidth: 1,
                    borderBottomColor: C.borde,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <T size={15} weight="700">
                    {o.name}
                  </T>
                  <T size={13} weight="500" color={C.textoSuave}>
                    {o.sub}
                  </T>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {guardando ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#07121B66',
          }}
        >
          <ActivityIndicator size="large" color={BRAND.turquoise} />
        </View>
      ) : null}
    </View>
  );
}
