import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  ArrowLeft,
  ChartNoAxesColumn,
  CircleAlert,
  FileText,
  Lightbulb,
  MinusCircle,
  ShoppingCart,
  Smile,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';
import { BotonCTA, C, Panel, Simbolo, T } from '../income/parts';
import { takePendingDecision, type CoachDecision } from './handoff';
import {
  defaultMood,
  evaluateExpenseForCoach,
  type CoachEvaluation,
  type CoachRiskLevel,
} from '@/domain/coach/expenseCoach';

/** Colores de cada nivel del semaforo. */
const TONO: Record<
  CoachRiskLevel,
  { fuerte: string; suave: string; titulo: string; panel: 'turquesa' | 'amarillo' | 'coral' | 'blanco' }
> = {
  manageable: {
    fuerte: BRAND.turquoise,
    suave: BRAND.paleTurquoise,
    titulo: BRAND.turquoiseDark,
    panel: 'turquesa',
  },
  attention: {
    fuerte: BRAND.yellow,
    suave: BRAND.paleYellow,
    titulo: BRAND.coral,
    panel: 'amarillo',
  },
  risk: {
    fuerte: BRAND.coral,
    suave: BRAND.paleCoral,
    titulo: BRAND.coral,
    panel: 'coral',
  },
  unknown: {
    fuerte: BRAND.mutedDark,
    suave: BRAND.offWhite,
    titulo: BRAND.ink,
    panel: 'blanco',
  },
};

const ICONO_FILA: Record<string, typeof Wallet> = {
  spent: ShoppingCart,
  new: ShoppingCart,
  budget: UtensilsCrossed,
  commitments: FileText,
  left: Wallet,
  short: MinusCircle,
};

const ANIMOS = [
  { key: 'worried', emoji: '😟', label: 'Me preocupa' },
  { key: 'neutral', emoji: '😐', label: 'Voy regular' },
  { key: 'good', emoji: '🙂', label: 'Me siento bien' },
] as const;

export interface ExpenseCoachParams {
  amount: number;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string;
  note?: string | null;
}

/**
 * TU COACH · ¿ESTE GASTO CABE EN TU MES?
 *
 * Un semaforo, no un porton. El coach explica que pasa, por que pasa y
 * que alternativa hay; confirmar siempre es posible, incluso en rojo.
 * Lo unico que cambia con el nivel es cuanto cuesta decir que si: en
 * riesgo hay que confirmar dos veces y la consecuencia se dice completa.
 *
 * Nada se guarda aqui. La pantalla devuelve la decision al formulario,
 * que es el unico que escribe en la base. Asi no hay dos sitios
 * registrando gastos.
 *
 * Como el coach de ingresos, se pinta siempre claro: es un momento de
 * decision, aprobado asi en el diseño.
 */
export function ExpenseCoachScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const params = useRoute<RouteProp<Record<string, ExpenseCoachParams>, string>>()
    .params as ExpenseCoachParams;

  const [evalu, setEvalu] = useState<CoachEvaluation | null>(null);
  const [error, setError] = useState(false);
  const [mood, setMood] = useState<string>('good');
  const [confirmando, setConfirmando] = useState(false);
  const [hojaRiesgo, setHojaRiesgo] = useState(false);

  const barra = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { buildCoachContext } = await import('@/domain/coach/context');
        const { spentInCategoryThisMonth } = await import('@/db/repositories/stats');
        const { getCategory } = await import('@/db/repositories/categories');

        const ctx = await buildCoachContext();
        const categoria = params.categoryId
          ? ((await getCategory(params.categoryId)) ?? null)
          : null;
        const gastado = params.categoryId
          ? await spentInCategoryThisMonth(params.categoryId)
          : 0;
        const cuenta = ctx.accounts.find((a) => a.id === params.accountId);

        if (!vivo) return;
        const e = evaluateExpenseForCoach({
          amount: params.amount,
          category: categoria,
          categorySpentThisMonth: gastado,
          accountName: params.accountName,
          accountBalance: cuenta?.balance ?? 0,
          ctx,
        });
        setEvalu(e);
        setMood(defaultMood(e.level));
      } catch {
        if (vivo) setError(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [params.amount, params.accountId, params.categoryId]);

  useEffect(() => {
    if (!evalu) return;
    if (t.reduceMotion) {
      barra.setValue(1);
      entrada.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(entrada, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(barra, {
        toValue: 1,
        duration: 620,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        // El ancho en % no puede ir por el hilo nativo.
        useNativeDriver: false,
      }),
    ]).start();
  }, [evalu, barra, entrada, t.reduceMotion]);

  function decidir(d: CoachDecision) {
    // Guard de doble envio: el handler se consume una sola vez.
    if (confirmando) return;
    if (d === 'confirm') setConfirmando(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const handler = takePendingDecision();
    if (handler) handler(d, mood);
    else nav.goBack();
  }

  const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

  const Cabecera = () => (
    <View
      style={{
        backgroundColor: C.header,
        paddingTop: insets.top + space(2),
        paddingHorizontal: space(5),
        paddingBottom: space(4),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver al registro de gasto"
          hitSlop={10}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: 'flex-start',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={26} color={BRAND.white} strokeWidth={2.6} />
        </Pressable>
        <T size={24} weight="800" color={BRAND.white} lines={1} style={{ flex: 1 }} header>
          Tu coach
        </T>
        <Simbolo size={30} />
      </View>
    </View>
  );

  /** Panel claro con la esquina superior redondeada, como en el diseño. */
  const Cuerpo = ({ children }: { children: React.ReactNode }) => (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.header }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexGrow: 1,
          backgroundColor: C.fondo,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          padding: space(5),
          paddingBottom: insets.bottom + space(8),
        }}
      >
        {children}
      </View>
    </ScrollView>
  );

  // --- Cargando ---------------------------------------------------------
  if (!evalu && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.header }}>
        <Cabecera />
        <Cuerpo>
          <Skeleton height={28} radius={10} width="70%" />
          <Sep />
          <Skeleton height={88} radius={radius.lg} />
          <Sep h={3} />
          <Skeleton height={150} radius={radius.lg} />
          <Sep h={3} />
          <Skeleton height={190} radius={radius.lg} />
        </Cuerpo>
      </View>
    );
  }

  // --- Error de evaluacion ----------------------------------------------
  if (error || !evalu) {
    return (
      <View style={{ flex: 1, backgroundColor: C.header }}>
        <Cabecera />
        <Cuerpo>
          <T size={22} weight="800" header>
            No pudimos revisar este gasto.
          </T>
          <Sep h={2} />
          <T size={14.5} weight="500" color={C.textoSuave} style={{ lineHeight: 21 }}>
            Puedes volver al formulario o confirmarlo con la información disponible.
          </T>
          <Sep h={5} />
          <BotonCTA label="Revisar gasto" onPress={() => decidir('edit')} />
          <Sep h={3} />
          <BotonCTA
            label="Continuar de todas formas"
            tono="contorno"
            onPress={() => decidir('confirm')}
          />
        </Cuerpo>
      </View>
    );
  }

  const tono = TONO[evalu.level];
  const IconoEstado =
    evalu.level === 'manageable' ? Smile : evalu.level === 'unknown' ? Lightbulb : CircleAlert;

  // --- Fila de impacto ---------------------------------------------------
  const Fila = ({
    row,
    ultima,
  }: {
    row: CoachEvaluation['rows'][number];
    ultima: boolean;
  }) => {
    const Icon = ICONO_FILA[row.key] ?? Wallet;
    const color =
      row.emphasis === 'bad'
        ? BRAND.coral
        : row.emphasis === 'good'
          ? BRAND.turquoiseDark
          : C.texto;
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
          paddingVertical: space(3),
          borderBottomWidth: ultima ? 0 : 1,
          borderBottomColor: C.borde,
        }}
        accessible
        accessibilityLabel={`${row.label}, ${money(row.amount)}`}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: tono.suave,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={19} color={tono.fuerte} strokeWidth={2.2} />
        </View>
        <T size={14.5} weight="500" color={C.textoSuave} style={{ flex: 1 }} lines={2}>
          {row.label}
        </T>
        <T size={15.5} weight="800" color={color} lines={1}>
          {money(row.amount)}
        </T>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.header }}>
      <Cabecera />
      <Cuerpo>
        <T size={23} weight="800" header>
          ¿Este gasto cabe en tu mes?
        </T>
        <Sep h={3.5} />

        {/* Resumen del gasto */}
        <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: BRAND.paleCoral,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingCart size={24} color={BRAND.coral} strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={16} weight="700" lines={2}>
              {params.categoryName || 'Gasto'}
            </T>
            <T size={13.5} weight="500" color={C.textoSuave} lines={1}>
              {params.accountName}
            </T>
          </View>
          <T
            size={20}
            weight="800"
            color={BRAND.coral}
            lines={1}
            a11y={`menos ${money(params.amount)}`}
          >
            −{money(params.amount)}
          </T>
        </Panel>

        <Sep h={3} />

        {/* Tarjeta del semaforo */}
        <Animated.View
          style={{
            opacity: entrada,
            transform: [
              {
                translateY: entrada.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <Panel
            tono={tono.panel}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space(3.5) }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: tono.fuerte,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconoEstado
                size={30}
                color={evalu.level === 'attention' ? BRAND.navy : BRAND.white}
                strokeWidth={2.4}
              />
            </View>
            <View
              style={{ flex: 1, minWidth: 0 }}
              accessible
              accessibilityLabel={`Estado del gasto: ${evalu.title}. ${evalu.message}`}
            >
              <T size={21} weight="800" color={tono.titulo}>
                {evalu.title}
              </T>
              <Sep h={1.5} />
              <T size={14.5} weight="500" color={C.textoSuave} style={{ lineHeight: 21 }}>
                {evalu.message}
              </T>
            </View>
          </Panel>
        </Animated.View>

        <Sep h={3} />

        {/* Detalle del impacto */}
        <Panel style={{ paddingVertical: space(3) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space(2),
              flexWrap: 'wrap',
            }}
          >
            <T size={18} weight="800" style={{ flexShrink: 1 }}>
              {evalu.sectionTitle}
            </T>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(1.5),
                backgroundColor: tono.suave,
                paddingVertical: space(1.5),
                paddingHorizontal: space(3),
                borderRadius: radius.pill,
              }}
            >
              <ChartNoAxesColumn size={15} color={tono.fuerte} strokeWidth={2.6} />
              <T size={12.5} weight="700" color={evalu.level === 'risk' ? BRAND.coral : C.texto}>
                {evalu.badge}
              </T>
            </View>
          </View>

          <Sep h={1} />
          {evalu.rows.map((r, i) => (
            <Fila key={r.key} row={r} ultima={i === evalu.rows.length - 1} />
          ))}

          <Sep h={2} />
          <View
            style={{
              height: 9,
              borderRadius: 5,
              backgroundColor: BRAND.borderLight,
              overflow: 'hidden',
            }}
            accessible
            accessibilityLabel={`Usado: ${evalu.usedPercent} por ciento ${evalu.barLabel}`}
          >
            <Animated.View
              style={{
                width: barra.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${evalu.usedPercent}%`],
                }),
                height: '100%',
                borderRadius: 5,
                backgroundColor: tono.fuerte,
              }}
            />
          </View>
          <Sep h={2} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={13} weight="600" color={C.textoSuave}>
              {evalu.usedPercent}% usado {evalu.barLabel}
            </T>
            <T size={13} weight="600" color={C.textoSuave}>
              100%
            </T>
          </View>
        </Panel>

        <Sep h={3} />

        {/* Mensaje del coach */}
        <Panel
          tono="amarillo"
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space(3.5) }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: BRAND.yellow,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lightbulb size={24} color={BRAND.navy} strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={15.5} weight="700" style={{ lineHeight: 22 }}>
              {evalu.tipTitle}
            </T>
            <T size={14} weight="500" color={C.textoSuave} style={{ lineHeight: 20 }}>
              {evalu.tipBody}
            </T>
          </View>
        </Panel>

        <Sep h={4.5} />

        {/* Selector emocional */}
        <T size={15.5} weight="700">
          ¿Cómo te sientes con esta decisión?
        </T>
        <Sep h={2.5} />
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          {ANIMOS.map((a) => {
            const activo = mood === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => {
                  setMood(a.key);
                  Haptics.selectionAsync().catch(() => undefined);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={a.label}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 62,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  borderWidth: activo ? 2 : 1,
                  borderColor: activo ? BRAND.turquoise : C.borde,
                  backgroundColor: activo ? BRAND.paleTurquoise : C.tarjeta,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                {/* El estado activo no depende solo del color del borde. */}
                {activo ? (
                  <T size={10.5} weight="700" color={BRAND.turquoiseDark}>
                    {a.label}
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Sep h={5} />

        {/* Acciones. El primario es el que el coach recomienda. */}
        <BotonCTA
          label={confirmando ? 'Guardando...' : evalu.primaryAction}
          disabled={confirmando}
          onPress={() =>
            evalu.primaryAction.startsWith('Confirmar')
              ? decidir('confirm')
              : decidir('edit')
          }
        />
        <Sep h={3} />
        <BotonCTA
          label={evalu.secondaryAction}
          tono="contorno"
          disabled={confirmando}
          onPress={() => {
            if (evalu.secondaryAction === 'Agregar presupuesto') return decidir('edit');
            if (!evalu.secondaryAction.startsWith('Confirmar')) return decidir('edit');
            // En riesgo, decir que si cuesta dos veces y la consecuencia
            // se dice completa. No es un patron oscuro: el boton sigue
            // ahi y dice exactamente lo que hace.
            if (evalu.needsExtraConfirm) return setHojaRiesgo(true);
            decidir('confirm');
          }}
        />

        {evalu.level === 'risk' ? (
          <>
            <Sep h={3} />
            <View
              style={{ flexDirection: 'row', gap: space(2.5), alignItems: 'flex-start' }}
            >
              <AlertTriangle size={17} color={BRAND.coral} strokeWidth={2.4} />
              <T size={12.5} weight="500" color={C.textoSuave} style={{ flex: 1, lineHeight: 18 }}>
                {evalu.commitment
                  ? `Aún así, este gasto puede afectar tu pago de ${evalu.commitment.name} y dejarte sin plata para otros compromisos.`
                  : 'Aún así, este gasto puede dejarte sin plata para otros compromisos.'}
              </T>
            </View>
          </>
        ) : null}
      </Cuerpo>

      {/* Confirmacion reforzada del estado de riesgo */}
      <Modal
        visible={hojaRiesgo}
        transparent
        animationType={t.reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setHojaRiesgo(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#07121BA8' }}
          onPress={() => setHojaRiesgo(false)}
          accessibilityLabel="Cerrar"
        />
        <View
          style={{
            backgroundColor: C.tarjeta,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            padding: space(5),
            paddingBottom: insets.bottom + space(5),
            maxHeight: '80%',
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: BRAND.coral,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircleAlert size={30} color={BRAND.white} strokeWidth={2.4} />
            </View>
            <Sep h={3} />
            <T size={20} weight="800" header>
              Este gasto puede afectar tus compromisos próximos.
            </T>
            <Sep h={2} />
            <T size={14.5} weight="500" color={C.textoSuave} style={{ lineHeight: 21 }}>
              {evalu.commitment
                ? `Si continúas, podrías quedarte corto para tu pago de ${evalu.commitment.name}. Te faltarían ${money(evalu.shortfall)}.`
                : `Si continúas, podrías quedarte corto para tu próximo pago. Te faltarían ${money(evalu.shortfall)}.`}
            </T>
            <Sep h={3} />
            <T size={15.5} weight="700">
              ¿Quieres confirmarlo de todas formas?
            </T>
            <Sep h={5} />
            <BotonCTA
              label="Volver a revisar"
              onPress={() => setHojaRiesgo(false)}
            />
            <Sep h={3} />
            <BotonCTA
              label={confirmando ? 'Guardando...' : 'Confirmar gasto'}
              tono="contorno"
              disabled={confirmando}
              onPress={() => {
                setHojaRiesgo(false);
                decidir('confirm');
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
