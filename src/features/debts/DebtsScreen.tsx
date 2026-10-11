import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  ChartNoAxesColumn,
  ChevronRight,
  FileText,
  Landmark,
  Settings as SettingsIcon,
  Snowflake,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import { listDebts, upcomingCommitments } from '@/db/repositories/debts';
import { cardDates, listCreditCards } from '@/db/repositories/creditCards';
import { setSetting } from '@/db/repositories/settings';
import {
  STRATEGY_HELP,
  buildDebtOverview,
  plazoTexto,
  priorityText,
  type DebtOverview,
  type DebtStrategy,
  type UpcomingPayment,
} from '@/domain/debt/overview';
import { BotonCTA, C, Simbolo, T } from '@/features/coach/income/parts';
import type { RootNav } from '@/app/navigation/types';

const ICONO_VENCIMIENTO = {
  loan: Landmark,
  debt: FileText,
  'credit-card': ChartNoAxesColumn,
} as const;

/**
 * DEUDAS
 *
 * Arriba, oscuro: cuanto debes, cuanto te sale al mes y cuando sales.
 * Abajo, en un panel claro: que vence primero, como van las tarjetas y
 * cual es la proxima movida.
 *
 * Las tarjetas de credito cuentan dentro de la deuda total. Dejarlas
 * fuera daria un numero mas bonito y mas falso.
 *
 * La estrategia no es decoracion: se guarda en ajustes y es la misma que
 * usa el coach para repartir un ingreso, asi que cambiarla aqui cambia
 * lo que la app recomienda alla.
 */
export function DebtsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { settings, detectedPending, refresh } = useAppStore();

  const [data, setData] = useState<DebtOverview | null>(null);
  const [error, setError] = useState(false);
  const [estrategia, setEstrategia] = useState<DebtStrategy>(
    (settings.debt_strategy as DebtStrategy) ?? 'avalanche',
  );

  const entrada = useRef(new Animated.Value(0)).current;

  const cargar = useCallback(async () => {
    try {
      setError(false);
      const [debts, cards, commitments] = await Promise.all([
        listDebts('active'),
        listCreditCards(),
        upcomingCommitments(45),
      ]);

      const cardDueDays: Record<number, number | null> = {};
      for (const c of cards) {
        const d = cardDates(c);
        cardDueDays[c.id] = d.daysToPayment ?? null;
      }

      setData(
        buildDebtOverview({
          debts,
          cards,
          commitments: commitments.map((c) => ({
            debtId: c.debt.id,
            name: c.debt.name,
            amount: c.amount,
            daysLeft: c.daysLeft,
          })),
          cardDueDays,
        }),
      );
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  useEffect(() => {
    if (!data) return;
    if (t.reduceMotion) {
      entrada.setValue(1);
      return;
    }
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [data, entrada, t.reduceMotion]);

  async function cambiarEstrategia(s: DebtStrategy) {
    if (s === estrategia) return;
    setEstrategia(s);
    Haptics.selectionAsync().catch(() => undefined);
    // Se guarda: el coach reparte los ingresos con esta misma estrategia.
    await setSetting('debt_strategy', s);
    await refresh();
  }

  const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

  // --- Cabecera ---------------------------------------------------------
  const Cabecera = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        paddingHorizontal: space(5),
        paddingTop: insets.top + space(2),
        paddingBottom: space(4),
      }}
    >
      <View accessible accessibilityLabel="Mi Platica">
        <Simbolo size={38} />
      </View>
      <T size={28} weight="800" color={BRAND.white} style={{ flex: 1 }} lines={1} header>
        Deudas
      </T>

      <Pressable
        onPress={() => nav.navigate('Detected')}
        accessibilityRole="button"
        accessibilityLabel="Notificaciones"
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Bell size={24} color={BRAND.white} strokeWidth={2.2} />
        {detectedPending > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 9,
              right: 9,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: BRAND.coral,
            }}
          />
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => nav.navigate('Settings')}
        accessibilityRole="button"
        accessibilityLabel="Ajustes"
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <SettingsIcon size={24} color={BRAND.white} strokeWidth={2.2} />
      </Pressable>
    </View>
  );

  // --- Resumen ----------------------------------------------------------
  const Resumen = ({ o }: { o: DebtOverview }) => {
    const libre =
      o.monthsToFreedom === null
        ? '—'
        : o.monthsToFreedom === 0
          ? 'ya'
          : `${o.monthsToFreedom} ${o.monthsToFreedom === 1 ? 'mes' : 'meses'}`;

    return (
      <View
        style={{
          marginHorizontal: space(5),
          backgroundColor: BRAND.plum,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: BRAND.coral + '44',
          padding: space(4.5),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={15} weight="500" color={BRAND.mutedLight}>
              Deuda total
            </T>
            <Sep h={1} />
            {/* El total es el dato dominante: se encoge antes que partirse. */}
            <T
              size={o.total >= 10_000_000_00 ? 30 : 36}
              weight="800"
              color={BRAND.white}
              lines={1}
              a11y={`Deuda total ${money(o.total)}`}
            >
              {money(o.total)}
            </T>
          </View>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 1,
              borderColor: BRAND.coral + '55',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChartNoAxesColumn size={24} color={BRAND.coral} strokeWidth={2.4} />
          </View>
        </View>

        {o.total <= 0 ? (
          <>
            <Sep h={2} />
            <T size={16} weight="700" color={BRAND.turquoise}>
              ¡Vas muy bien!
            </T>
          </>
        ) : (
          <>
            <Sep h={3.5} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={14} weight="500" color={BRAND.mutedLight}>
                  Carga mensual
                </T>
                <T size={19} weight="800" color={BRAND.white} lines={1}>
                  {money(o.monthlyCharge)}
                </T>
              </View>
              <View
                style={{
                  width: 1,
                  height: 38,
                  backgroundColor: BRAND.mutedLight + '33',
                  marginHorizontal: space(4),
                }}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={14} weight="500" color={BRAND.mutedLight}>
                  Libre en
                </T>
                <T size={19} weight="800" color={BRAND.white} lines={1}>
                  {libre}
                </T>
              </View>
            </View>
            {o.monthsToFreedom === null ? (
              <>
                <Sep h={2} />
                <T size={12.5} weight="500" color={BRAND.mutedLight}>
                  Con las cuotas actuales no alcanzo a calcular cuándo quedas libre.
                </T>
              </>
            ) : null}
          </>
        )}
      </View>
    );
  };

  // --- Estrategia --------------------------------------------------------
  const Estrategia = () => {
    const Opcion = ({
      valor,
      label,
      Icon,
    }: {
      valor: DebtStrategy;
      label: string;
      Icon: typeof TrendingUp;
    }) => {
      const activa = estrategia === valor;
      return (
        <Pressable
          onPress={() => cambiarEstrategia(valor)}
          accessibilityRole="radio"
          accessibilityState={{ selected: activa }}
          accessibilityLabel={`Seleccionar estrategia ${label}`}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space(2),
            paddingHorizontal: space(3),
            borderRadius: radius.pill,
            borderWidth: activa ? 2 : 1,
            borderColor: activa ? BRAND.turquoise : BRAND.borderDark,
            backgroundColor: activa ? 'transparent' : BRAND.navySoft,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Icon
            size={19}
            color={activa ? BRAND.turquoise : BRAND.mutedLight}
            strokeWidth={2.3}
          />
          <T
            size={13.5}
            weight={activa ? '800' : '600'}
            color={activa ? BRAND.white : BRAND.mutedLight}
            lines={1}
            style={{ flexShrink: 1 }}
          >
            {label}
          </T>
        </Pressable>
      );
    };

    return (
      <View style={{ paddingHorizontal: space(5) }}>
        <T size={16} weight="700" color={BRAND.mutedLight}>
          Estrategia de salida
        </T>
        <Sep h={2.5} />
        <View style={{ flexDirection: 'row', gap: space(2.5) }}>
          <Opcion valor="avalanche" label="Avalancha (menos interés)" Icon={TrendingUp} />
          <Opcion valor="snowball" label="Bola de nieve" Icon={Snowflake} />
        </View>
        <Sep h={2.5} />
        <T size={13} weight="500" color={BRAND.mutedLight} style={{ lineHeight: 19 }}>
          {STRATEGY_HELP[estrategia]}
        </T>
      </View>
    );
  };

  // --- Panel claro -------------------------------------------------------
  const TituloSeccion = ({
    titulo,
    accion,
    onAccion,
  }: {
    titulo: string;
    accion?: string;
    onAccion?: () => void;
  }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space(2),
      }}
    >
      <T size={20} weight="800" style={{ flex: 1 }} lines={1}>
        {titulo}
      </T>
      {accion ? (
        <Pressable
          onPress={onAccion}
          accessibilityRole="button"
          accessibilityLabel={accion}
          hitSlop={10}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(1),
            minHeight: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <T size={14.5} weight="700" color={BRAND.turquoiseDark}>
            {accion}
          </T>
          <ChevronRight size={17} color={BRAND.turquoiseDark} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );

  const FilaVencimiento = ({
    p,
    ultima,
  }: {
    p: UpcomingPayment;
    ultima: boolean;
  }) => {
    // Urgente = vence dentro de una semana. El color no va solo: el
    // plazo tambien se escribe.
    const urgente = p.dueInDays <= 7;
    const Icon = ICONO_VENCIMIENTO[p.kind];
    return (
      <Pressable
        onPress={() =>
          p.kind === 'credit-card'
            ? nav.navigate('CreditCard', { cardId: p.refId })
            : nav.navigate('DebtDetail', { debtId: p.refId })
        }
        accessibilityRole="button"
        accessibilityLabel={`${p.name}, ${plazoTexto(p.dueInDays)}, ${money(p.amount)}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3.5),
          minHeight: 64,
          paddingVertical: space(3),
          borderBottomWidth: ultima ? 0 : 1,
          borderBottomColor: C.borde,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: urgente ? BRAND.paleCoral : BRAND.paleTurquoise,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            size={21}
            color={urgente ? BRAND.coral : BRAND.turquoiseDark}
            strokeWidth={2.3}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={16} weight="700" lines={1}>
            {p.name}
          </T>
          <T
            size={13.5}
            weight="600"
            color={urgente ? BRAND.coral : C.textoSuave}
            lines={1}
          >
            {plazoTexto(p.dueInDays)}
          </T>
        </View>
        <T size={17} weight="800" color={urgente ? BRAND.coral : C.texto} lines={1}>
          {money(p.amount)}
        </T>
        <ChevronRight size={20} color={C.textoSuave} strokeWidth={2.4} />
      </Pressable>
    );
  };

  const Tarjeta = ({ c }: { c: DebtOverview['cards'][number] }) => (
    <Pressable
      onPress={() => nav.navigate('CreditCard', { cardId: c.id })}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, debes ${money(c.amountOwed)}, cupo libre ${money(c.availableCredit)}`}
      style={({ pressed }) => ({
        backgroundColor: BRAND.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: C.borde,
        padding: space(4),
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2.5) }}>
        <View
          style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color }}
        />
        <T size={18} weight="800" style={{ flex: 1 }} lines={1}>
          {c.name}
        </T>
        {c.dueInDays !== null ? (
          <View
            style={{
              backgroundColor: BRAND.yellow,
              paddingVertical: space(1.5),
              paddingHorizontal: space(3),
              borderRadius: radius.pill,
            }}
          >
            <T size={12.5} weight="800" color={BRAND.navy}>
              paga {plazoTexto(c.dueInDays)}
            </T>
          </View>
        ) : null}
      </View>

      <Sep h={3} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={13.5} weight="500" color={C.textoSuave}>
            Debes
          </T>
          <T size={22} weight="800" lines={1}>
            {money(c.amountOwed)}
          </T>
        </View>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
          <T size={13.5} weight="500" color={C.textoSuave}>
            Cupo libre
          </T>
          <T size={22} weight="800" color={BRAND.turquoiseDark} lines={1}>
            {money(c.availableCredit)}
          </T>
        </View>
      </View>

      {c.usagePercent !== null ? (
        <>
          <Sep h={3} />
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: BRAND.borderLight,
              overflow: 'hidden',
            }}
            accessible
            accessibilityLabel={`Cupo utilizado: ${c.usagePercent} por ciento`}
          >
            <View
              style={{
                width: `${c.usagePercent}%`,
                height: '100%',
                borderRadius: 4,
                backgroundColor: c.usagePercent >= 80 ? BRAND.coral : BRAND.turquoise,
              }}
            />
          </View>
          <Sep h={1.5} />
          <T size={12} weight="600" color={C.textoSuave}>
            {c.usagePercent}% del cupo usado
          </T>
        </>
      ) : null}
    </Pressable>
  );

  // --- Render -------------------------------------------------------------
  const Panel = ({ children }: { children: React.ReactNode }) => (
    <Animated.View
      style={{
        flexGrow: 1,
        backgroundColor: C.fondo,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
        marginTop: space(5),
        padding: space(5),
        paddingBottom: insets.bottom + space(10),
        opacity: entrada,
      }}
    >
      {children}
    </Animated.View>
  );

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <Panel>
          <T size={20} weight="800" header>
            No pudimos cargar tus deudas.
          </T>
          <Sep h={4} />
          <BotonCTA label="Intentar de nuevo" onPress={cargar} />
        </Panel>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <View style={{ paddingHorizontal: space(5) }}>
          <Skeleton height={150} radius={radius.lg} onDark />
          <Sep />
          <Skeleton height={54} radius={radius.pill} onDark />
        </View>
        <Panel>
          <Skeleton height={26} radius={8} width="60%" />
          <Sep h={3} />
          <Skeleton height={64} radius={radius.md} />
          <Sep h={2} />
          <Skeleton height={64} radius={radius.md} />
        </Panel>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BRAND.navy }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <Cabecera />
      <Resumen o={data} />
      <Sep h={5} />
      <Estrategia />

      <Panel>
        {data.isEmpty ? (
          <View style={{ alignItems: 'center', paddingVertical: space(8) }}>
            <T size={20} weight="800" align="center" header>
              No tienes deudas registradas
            </T>
            <Sep h={2} />
            <T size={14.5} weight="500" color={C.textoSuave} align="center">
              Registra una deuda para comenzar a organizar tu plan.
            </T>
            <Sep h={5} />
            <View style={{ alignSelf: 'stretch' }}>
              <BotonCTA label="Agregar deuda" onPress={() => nav.navigate('DebtForm', {})} />
            </View>
          </View>
        ) : (
          <>
            {/* Proximos vencimientos */}
            <TituloSeccion
              titulo="Próximos vencimientos"
              accion={data.upcoming.length > 3 ? 'Ver todos' : undefined}
              onAccion={() => nav.navigate('Dashboard')}
            />
            <Sep h={1} />
            {data.upcoming.length === 0 ? (
              <View style={{ paddingVertical: space(5) }}>
                <T size={16} weight="700">
                  No tienes vencimientos próximos
                </T>
                <Sep h={1} />
                <T size={14} weight="500" color={C.textoSuave}>
                  Tus pagos están al día.
                </T>
              </View>
            ) : (
              data.upcoming
                .slice(0, 3)
                .map((p, i, arr) => (
                  <FilaVencimiento key={p.id} p={p} ultima={i === arr.length - 1} />
                ))
            )}

            {/* Tarjetas de credito */}
            {data.cards.length > 0 ? (
              <>
                <Sep h={5} />
                <TituloSeccion titulo="Tarjetas de crédito" />
                <Sep h={3} />
                {data.cards.map((c) => (
                  <View key={c.id}>
                    <Tarjeta c={c} />
                    <Sep h={3} />
                  </View>
                ))}
              </>
            ) : null}

            {/* Orden recomendado */}
            <Sep h={4} />
            <TituloSeccion titulo="Orden recomendado" />
            <Sep h={3} />
            <View
              style={{
                backgroundColor: BRAND.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: C.borde,
                padding: space(4),
                flexDirection: 'row',
                gap: space(3.5),
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: BRAND.paleTurquoise,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target size={24} color={BRAND.turquoiseDark} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={16} weight="800">
                  Tu próxima prioridad
                </T>
                <Sep h={1.5} />
                <T size={13.5} weight="500" color={C.textoSuave} style={{ lineHeight: 19 }}>
                  {priorityText(data)}
                </T>
                {data.priority ? (
                  <>
                    <Sep h={3} />
                    <BotonCTA
                      label="Ver plan de pago"
                      onPress={() =>
                        data.priority!.kind === 'credit-card'
                          ? nav.navigate('CreditCard', { cardId: data.priority!.refId })
                          : nav.navigate('DebtPay', {
                              debtId: data.priority!.refId,
                              suggested: data.priority!.amount,
                            })
                      }
                    />
                  </>
                ) : null}
              </View>
            </View>

            <Sep h={4} />
            <BotonCTA
              label="Agregar deuda"
              tono="contorno"
              onPress={() => nav.navigate('DebtForm', {})}
            />
          </>
        )}
      </Panel>
    </ScrollView>
  );
}
