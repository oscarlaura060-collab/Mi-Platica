import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  CalendarClock,
  ChartNoAxesColumn,
  ChevronRight,
  Coins,
  FileText,
  Landmark,
  Plus,
  Settings as SettingsIcon,
  Snowflake,
  SunMedium,
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
        paddingBottom: space(3),
      }}
    >
      <View accessible accessibilityLabel="Mi Platica">
        <Simbolo size={38} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={24} weight="800" color={BRAND.white} lines={1} header>
          Mis Deudas
        </T>
        <T size={12} weight="600" color={BRAND.mutedLight} lines={1}>
          Estrategia y paz mental
        </T>
      </View>

      <Pressable
        onPress={() => nav.navigate('Detected')}
        accessibilityRole="button"
        accessibilityLabel="Notificaciones"
        hitSlop={10}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Bell size={22} color={BRAND.white} strokeWidth={2.2} />
        {detectedPending > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 9,
              height: 9,
              borderRadius: 4.5,
              backgroundColor: BRAND.coral,
              borderWidth: 1.5,
              borderColor: BRAND.navy,
            }}
          />
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => nav.navigate('Settings')}
        accessibilityRole="button"
        accessibilityLabel="Ajustes"
        hitSlop={10}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <SettingsIcon size={22} color={BRAND.white} strokeWidth={2.2} />
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

    const numObligaciones = o.cards.length + o.upcoming.length;
    const proximo = o.upcoming[0];

    return (
      <View
        style={{
          marginHorizontal: space(5),
          backgroundColor: BRAND.surfaceContainerLow,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: BRAND.borderDark,
          padding: space(5),
        }}
      >
        {/* Header con etiqueta y badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T size={12} weight="800" color={BRAND.mutedLight} style={{ letterSpacing: 0.8 }}>
            TOTAL PENDIENTE POR PAGAR
          </T>
          {!o.isEmpty ? (
            <View
              style={{
                paddingHorizontal: space(2.5),
                paddingVertical: space(1),
                borderRadius: radius.pill,
                backgroundColor: 'rgba(20, 196, 212, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(20, 196, 212, 0.25)',
              }}
            >
              <T size={11} weight="800" color={BRAND.turquoise}>
                {numObligaciones > 0
                  ? `${numObligaciones} ${numObligaciones === 1 ? 'obligación activa' : 'obligaciones activas'}`
                  : 'Deuda activa'}
              </T>
            </View>
          ) : (
            <View
              style={{
                paddingHorizontal: space(2.5),
                paddingVertical: space(1),
                borderRadius: radius.pill,
                backgroundColor: 'rgba(20, 196, 212, 0.12)',
              }}
            >
              <T size={11} weight="800" color={BRAND.turquoise}>
                Al día
              </T>
            </View>
          )}
        </View>

        <Sep h={2} />

        {/* Monto Principal */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(1.5) }}>
          <T
            size={o.total >= 10_000_000_00 ? 28 : 34}
            weight="800"
            color={BRAND.white}
            lines={1}
            a11y={`Deuda total ${money(o.total)}`}
          >
            {money(o.total)}
          </T>
          <T size={16} weight="700" color={BRAND.mutedLight}>
            COP
          </T>
        </View>

        {o.total <= 0 ? (
          <>
            <Sep h={2} />
            <T size={15} weight="700" color={BRAND.turquoise}>
              ¡Estás libre de deudas! Todo tu dinero trabaja para ti.
            </T>
          </>
        ) : (
          <>
            <Sep h={3.5} />
            {/* Métricas dobles en cuadrícula */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: space(3),
                borderTopWidth: 1,
                borderBottomWidth: proximo ? 1 : 0,
                borderColor: 'rgba(28, 70, 92, 0.5)',
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={13} weight="500" color={BRAND.mutedLight}>
                  Cuota de este mes
                </T>
                <T size={18} weight="800" color={BRAND.yellow} lines={1} style={{ marginTop: 2 }}>
                  {money(o.monthlyCharge)}
                </T>
              </View>
              <View
                style={{
                  width: 1,
                  height: 34,
                  backgroundColor: 'rgba(28, 70, 92, 0.5)',
                  marginHorizontal: space(3),
                }}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={13} weight="500" color={BRAND.mutedLight}>
                  Meta proyectada
                </T>
                <T size={18} weight="800" color={BRAND.turquoise} lines={1} style={{ marginTop: 2 }}>
                  {libre === '—' ? 'Sin fecha' : `Libre en ${libre}`}
                </T>
              </View>
            </View>

            {/* Próximo vencimiento destacado */}
            {proximo ? (
              <Pressable
                onPress={() =>
                  proximo.kind === 'credit-card'
                    ? nav.navigate('CreditCard', { cardId: proximo.refId })
                    : nav.navigate('DebtDetail', { debtId: proximo.refId })
                }
                accessibilityRole="button"
                accessibilityLabel={`Próximo vencimiento en ${plazoTexto(proximo.dueInDays)}, ${proximo.name}, ${money(proximo.amount)}`}
                style={({ pressed }) => ({
                  marginTop: space(3),
                  backgroundColor: 'rgba(15, 33, 49, 0.85)',
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: 'rgba(28, 70, 92, 0.5)',
                  padding: space(3),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(3),
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255, 111, 97, 0.16)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarClock size={19} color={BRAND.coral} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1.5) }}>
                    <T size={11} weight="800" color={BRAND.coral}>
                      Próximo vencimiento
                    </T>
                    <T size={11} weight="600" color={BRAND.mutedLight}>
                      • {plazoTexto(proximo.dueInDays)}
                    </T>
                  </View>
                  <T size={14} weight="700" color={BRAND.white} lines={1} style={{ marginTop: 1 }}>
                    {proximo.name} · {money(proximo.amount)} COP
                  </T>
                </View>
                <ChevronRight size={18} color={BRAND.mutedLight} strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    );
  };

  // --- Acciones Primarias Gemelas ----------------------------------------
  const Acciones = () => (
    <View
      style={{
        flexDirection: 'row',
        gap: space(3),
        paddingHorizontal: space(5),
      }}
    >
      <Pressable
        onPress={() => nav.navigate('DebtForm', {})}
        accessibilityRole="button"
        accessibilityLabel="Agregar deuda"
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: BRAND.surfaceContainerHigh,
          borderWidth: 1,
          borderColor: BRAND.borderDark,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space(2),
          opacity: pressed ? 0.8 : 1,
          transform: pressed && !t.reduceMotion ? [{ scale: 0.98 }] : undefined,
        })}
      >
        <Plus size={19} color={BRAND.white} strokeWidth={2.5} />
        <T size={14.5} weight="800" color={BRAND.white}>
          Agregar deuda
        </T>
      </Pressable>

      <Pressable
        onPress={() => {
          if (data?.priority) {
            nav.navigate('DebtPay', {
              debtId: data.priority.refId,
              suggested: data.priority.amount,
            });
          } else if (data && data.upcoming.length > 0) {
            nav.navigate('DebtPay', {
              debtId: data.upcoming[0].refId,
              suggested: data.upcoming[0].amount,
            });
          } else {
            nav.navigate('DebtForm', {});
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Registrar abono"
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: BRAND.yellow,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space(2),
          opacity: pressed ? 0.85 : 1,
          transform: pressed && !t.reduceMotion ? [{ scale: 0.98 }] : undefined,
        })}
      >
        <Coins size={19} color={BRAND.navy} strokeWidth={2.5} />
        <T size={14.5} weight="800" color={BRAND.navy}>
          Registrar abono
        </T>
      </Pressable>
    </View>
  );

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
            minHeight: 46,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space(2),
            paddingHorizontal: space(3),
            borderRadius: radius.pill,
            borderWidth: activa ? 1.5 : 1,
            borderColor: activa ? BRAND.turquoise : BRAND.borderDark,
            backgroundColor: activa ? 'rgba(20, 196, 212, 0.15)' : BRAND.surfaceContainerLow,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Icon
            size={18}
            color={activa ? BRAND.turquoise : BRAND.mutedLight}
            strokeWidth={2.4}
          />
          <T
            size={13}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T size={15} weight="800" color={BRAND.onSurface} style={{ letterSpacing: 0.2 }}>
            Estrategia de pago
          </T>
          <T size={12} weight="600" color={BRAND.turquoise}>
            Personalizable
          </T>
        </View>

        <Sep h={2} />

        {/* Switch selector tipo píldora */}
        <View style={{ flexDirection: 'row', gap: space(2.5) }}>
          <Opcion valor="avalanche" label="Avalancha (interés)" Icon={TrendingUp} />
          <Opcion valor="snowball" label="Bola de nieve" Icon={Snowflake} />
        </View>

        <Sep h={3} />

        {/* Consejo amigable del Coach caribeño (sin culpa) */}
        <View
          style={{
            backgroundColor: BRAND.surfaceContainerLow,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: 'rgba(255, 212, 71, 0.32)',
            padding: space(3.5),
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space(3),
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(255, 212, 71, 0.16)',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <SunMedium size={18} color={BRAND.yellow} strokeWidth={2.4} />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: space(0.5) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}>
              <T size={11} weight="800" color={BRAND.yellow} style={{ letterSpacing: 0.3 }}>
                CONSEJO MI PLATICA
              </T>
              <T size={11} weight="600" color={BRAND.mutedLight}>
                • Sin culpas
              </T>
            </View>
            <T size={13} weight="500" color={BRAND.onSurface} style={{ lineHeight: 18 }}>
              {STRATEGY_HELP[estrategia]} ¡Tú tienes la autonomía para liquidar como te dé más tranquilidad!
            </T>
          </View>
        </View>
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
      <Sep h={4} />
      <Acciones />
      <Sep h={4.5} />
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
