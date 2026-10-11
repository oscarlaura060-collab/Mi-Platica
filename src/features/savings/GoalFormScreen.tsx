import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  BadgeAlert,
  Calendar,
  ChartNoAxesColumn,
  Check,
  ChevronRight,
  CircleAlert,
  Coins,
  GraduationCap,
  Heart,
  House,
  Info,
  Leaf,
  Plane,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { createGoal, deleteGoal, getGoal, updateGoal } from '@/db/repositories/goals';
import { useAppStore } from '@/store/useAppStore';
import { FREQUENCY_LABEL, type Frequency } from '@/domain/savings/plan';
import { buildOptions, type SavingsOption } from '@/domain/savings/options';
import { useCapacity } from './useCapacity';
import { formatThousands, money, parseMoneyInput } from '@/utils/money';
import { dayKey } from '@/utils/date';
import { BotonCTA, C, T } from '@/features/coach/income/parts';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

/** Propositos comunes, para no empezar en blanco. */
const PRESETS: {
  key: string;
  name: string;
  purpose: string;
  emoji: string;
  color: string;
  Icon: typeof Plane;
}[] = [
  { key: 'travel', name: 'Viaje', purpose: 'Ahorrar para un viaje', emoji: 'V', color: BRAND.turquoise, Icon: Plane },
  { key: 'emergency', name: 'Fondo de emergencia', purpose: 'Para imprevistos sin endeudarme', emoji: 'E', color: '#16A34A', Icon: ShieldCheck },
  { key: 'education', name: 'Estudio', purpose: 'Pagar un curso o semestre', emoji: 'S', color: '#8B9BF5', Icon: GraduationCap },
  { key: 'home', name: 'Casa', purpose: 'Cuota inicial de vivienda', emoji: 'C', color: BRAND.yellow, Icon: House },
  { key: 'gift', name: 'Regalo', purpose: 'Un gusto para alguien', emoji: 'R', color: '#A855F7', Icon: Heart },
  { key: 'other', name: '', purpose: '', emoji: 'O', color: BRAND.coral, Icon: Sparkles },
];

/** Como se presenta cada una de las cuatro opciones. */
const PLAN_UI: Record<
  SavingsOption['kind'],
  { Icon: typeof Rocket; color: string; suave: string; esfuerzo: string }
> = {
  recommended: {
    Icon: ChartNoAxesColumn,
    color: BRAND.turquoiseDark,
    suave: BRAND.paleTurquoise,
    esfuerzo: 'Equilibrada',
  },
  intermediate: {
    Icon: Rocket,
    color: '#C98A00',
    suave: BRAND.paleYellow,
    esfuerzo: 'Más esfuerzo',
  },
  flexible: {
    Icon: Leaf,
    color: '#0A8F5C',
    suave: '#E8F8F0',
    esfuerzo: 'Más llevadera',
  },
  target: {
    Icon: Calendar,
    color: BRAND.coral,
    suave: BRAND.paleCoral,
    esfuerzo: 'Tu fecha',
  },
};

function mesAnio(d: Date) {
  return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

/** Los proximos meses, para la fecha limite sin meter otra dependencia. */
function mesesFuturos(n = 36) {
  const out: { key: string; label: string }[] = [];
  const hoy = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i + 1, 0);
    out.push({ key: dayKey(d), label: mesAnio(d) });
  }
  return out;
}

/**
 * CREAR UNA META DE AHORRO
 *
 * Dos pasos. Primero los datos de la meta; despues los cuatro planes
 * para compararlos y escoger.
 *
 * La meta que la persona escribio NUNCA se cambia sola. Si la fecha que
 * eligio pide un aporte que no le cabe, la app lo dice y ofrece salidas,
 * pero no le mueve la fecha ni el monto por su cuenta.
 *
 * Crear la meta guarda un plan DENTRO de la app. No mueve plata en
 * ningun banco.
 */
const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <T size={15.5} weight="800">
      {children}
    </T>
  );
}

/**
 * Campo de dinero.
 *
 * Vive FUERA de la pantalla a proposito. Definido adentro, React lo
 * tomaba por un componente distinto en cada render, desmontaba el
 * TextInput y el teclado se cerraba despues de cada tecla. Es el mismo
 * motivo por el que Paso1, Paso2 y la hoja de ajuste se invocan como
 * funciones y no como <Paso1 />.
 */
function CampoMoneda({
  valor,
  onChange,
  a11y,
  grande,
}: {
  valor: string;
  onChange: (v: string) => void;
  a11y: string;
  grande?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(2.5),
        minHeight: grande ? 72 : 60,
        backgroundColor: BRAND.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: C.borde,
        paddingHorizontal: space(4),
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: BRAND.paleTurquoise,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Coins size={20} color={BRAND.turquoiseDark} strokeWidth={2.2} />
      </View>
      <T size={grande ? 26 : 22} weight="800">
        $
      </T>
      <TextInput
        value={valor}
        onChangeText={(v) => onChange(formatThousands(v))}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="0"
        placeholderTextColor={C.textoSuave}
        selectionColor={BRAND.turquoise}
        accessibilityLabel={a11y}
        style={{
          flex: 1,
          color: C.texto,
          fontSize: grande ? 26 : 22,
          fontWeight: '800',
          paddingVertical: 0,
        }}
      />
    </View>
  );
}

function Fila({
  Icon,
  label,
  valor,
  onPress,
  suave,
}: {
  Icon: typeof Calendar;
  label: string;
  valor: string;
  onPress: () => void;
  suave?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${valor}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3.5),
        minHeight: 68,
        backgroundColor: BRAND.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: C.borde,
        paddingHorizontal: space(4),
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: BRAND.paleTurquoise,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={BRAND.turquoiseDark} strokeWidth={2.2} />
      </View>
      <T
        size={16.5}
        weight="700"
        color={suave ? C.textoSuave : C.texto}
        style={{ flex: 1 }}
        lines={1}
      >
        {valor}
      </T>
      <ChevronRight size={20} color={C.textoSuave} strokeWidth={2.4} />
    </Pressable>
  );
}

export function GoalFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'GoalForm'>>();
  const editingId = route.params?.goalId;
  const { accounts, refresh } = useAppStore();
  const capacity = useCapacity();

  const [paso, setPaso] = useState<1 | 2>(1);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [targetTexto, setTargetTexto] = useState('');
  const [initialTexto, setInitialTexto] = useState('');
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>('biweekly');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [emoji, setEmoji] = useState('*');
  const [color, setColor] = useState<string>(BRAND.turquoise);
  const [planKind, setPlanKind] = useState<SavingsOption['kind'] | null>(null);
  const [aporteTexto, setAporteTexto] = useState('');
  const [hoja, setHoja] = useState<null | 'date' | 'account' | 'adjust'>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const target = parseMoneyInput(targetTexto);
  const initial = parseMoneyInput(initialTexto);
  const aporte = parseMoneyInput(aporteTexto);
  const restante = Math.max(target - initial, 0);
  const yaAlcanzada = target > 0 && initial >= target;

  useEffect(() => {
    if (!editingId) return;
    getGoal(editingId).then((g) => {
      if (!g) return;
      setName(g.name);
      setPurpose(g.purpose ?? '');
      setTargetTexto(formatThousands(String(Math.round(g.target_amount / 100))));
      setInitialTexto(
        g.initial_amount ? formatThousands(String(Math.round(g.initial_amount / 100))) : '',
      );
      setTargetDate(g.target_date);
      setFrequency(g.frequency);
      setAccountId(g.account_id);
      setEmoji(g.emoji);
      setColor(g.color);
      setAporteTexto(
        g.planned_contribution
          ? formatThousands(String(Math.round(g.planned_contribution / 100)))
          : '',
      );
      setPlanKind((g.plan_kind as SavingsOption['kind'] | null) ?? null);
    });
  }, [editingId]);

  useEffect(() => {
    if (accountId === null && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const opciones = useMemo(
    () => buildOptions({ remaining: restante, targetDate, frequency, capacity }),
    [restante, targetDate, frequency, capacity],
  );

  // Se precarga la opcion sugerida, salvo que ya haya una escogida.
  useEffect(() => {
    if (planKind || aporte > 0 || restante <= 0) return;
    const sugerida = opciones.options.find((o) => o.kind === opciones.highlight);
    if (sugerida) {
      setPlanKind(sugerida.kind);
      setAporteTexto(formatThousands(String(Math.round(sugerida.amount / 100))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones.highlight, restante]);

  const etiqueta = FREQUENCY_LABEL[frequency];
  const periodos = aporte > 0 ? Math.ceil(restante / aporte) : null;
  const fechaFin = useMemo(() => {
    if (periodos === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + (frequency === 'biweekly' ? 15 : 30) * periodos);
    return d;
  }, [periodos, frequency]);

  const cuenta = accounts.find((a) => a.id === accountId);
  const meses = useMemo(() => mesesFuturos(), []);

  function elegirPreset(p: (typeof PRESETS)[number]) {
    setPresetKey(p.key);
    setEmoji(p.emoji);
    setColor(p.color);
    setError(null);
    if (p.key !== 'other') {
      setName(p.name);
      setPurpose(p.purpose);
    } else {
      setName('');
      setPurpose('');
    }
    Haptics.selectionAsync().catch(() => undefined);
  }

  function validarPaso1(): string | null {
    if (!presetKey && !name.trim()) return 'Elige para qué quieres ahorrar.';
    if (!name.trim()) return '¿Para qué quieres ahorrar?';
    if (target <= 0) return 'Indica un monto mayor que cero.';
    if (yaAlcanzada) {
      return 'Ya superaste esta meta. Puedes ajustar el monto o crear una nueva.';
    }
    if (targetDate && targetDate <= dayKey(new Date())) {
      return 'Elige una fecha futura para calcular tu plan.';
    }
    return null;
  }

  async function guardar() {
    if (guardando) return;
    const problema = validarPaso1();
    if (problema) {
      setError(problema);
      setPaso(1);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        purpose: purpose.trim() || null,
        target_amount: target,
        initial_amount: initial,
        target_date: targetDate,
        frequency,
        account_id: accountId,
        emoji,
        color,
        planned_contribution: aporte,
        plan_kind: planKind,
      };
      if (editingId) await updateGoal(editingId, payload);
      else await createGoal(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.goBack();
    } catch {
      setError('No pudimos guardar tu meta. Tus datos siguen intactos.');
    } finally {
      setGuardando(false);
    }
  }


  // =====================================================================
  // PASO 1 · Define tu meta
  // =====================================================================
  const Paso1 = () => (
    <>
      <T size={24} weight="800" header>
        Define tu meta
      </T>
      <Sep h={1.5} />
      <T size={15} weight="500" color={C.textoSuave}>
        Cuéntanos los detalles de tu ahorro para armar tu plan.
      </T>
      <Sep h={4.5} />

      {/* Proposito */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2.5) }}>
        {PRESETS.map((p) => {
          const activo = presetKey === p.key;
          const label = p.key === 'other' ? 'Otro' : p.name;
          return (
            <Pressable
              key={p.key}
              onPress={() => elegirPreset(p)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${label}${activo ? ', seleccionado' : ''}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(2),
                minHeight: 52,
                paddingHorizontal: space(3.5),
                borderRadius: radius.md,
                backgroundColor: activo ? BRAND.paleTurquoise : BRAND.white,
                borderWidth: activo ? 2 : 1,
                borderColor: activo ? BRAND.turquoise : C.borde,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <p.Icon
                size={21}
                color={activo ? BRAND.turquoiseDark : C.texto}
                strokeWidth={2.2}
              />
              <T size={14.5} weight="700" color={activo ? BRAND.turquoiseDark : C.texto}>
                {label}
              </T>
              {activo ? (
                <Check size={17} color={BRAND.turquoiseDark} strokeWidth={3.2} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {presetKey ? (
        <>
          <Sep h={4} />
          <Etiqueta>¿Para qué quieres ahorrar?</Etiqueta>
          <Sep h={2} />
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
            placeholder="Ej. Viaje a San Andrés"
            placeholderTextColor={C.textoSuave}
            selectionColor={BRAND.turquoise}
            accessibilityLabel="Nombre de la meta"
            maxLength={50}
            style={{
              minHeight: 56,
              backgroundColor: BRAND.white,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: C.borde,
              paddingHorizontal: space(4),
              color: C.texto,
              fontSize: 16.5,
              fontWeight: '600',
            }}
          />
        </>
      ) : null}

      {/* Meta total */}
      <Sep h={4} />
      <Etiqueta>Meta total</Etiqueta>
      <Sep h={2} />
      <CampoMoneda
        valor={targetTexto}
        onChange={setTargetTexto}
        a11y={`Meta total, ${money(target)}`}
        grande
      />

      {/* Ya tienes */}
      <Sep h={4} />
      <Etiqueta>Ya tienes ahorrado</Etiqueta>
      <Sep h={2} />
      <CampoMoneda
        valor={initialTexto}
        onChange={setInitialTexto}
        a11y={`Ya tienes ahorrado, ${money(initial)}`}
        grande
      />
      {yaAlcanzada ? (
        <>
          <Sep h={2} />
          <T size={13.5} weight="600" color={BRAND.coral}>
            Ya superaste esta meta. Puedes ajustar el monto o crear una nueva.
          </T>
        </>
      ) : null}

      {/* Fecha limite */}
      <Sep h={4} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(2) }}>
        <Etiqueta>Fecha límite</Etiqueta>
        <T size={13.5} weight="500" color={C.textoSuave}>
          (opcional)
        </T>
      </View>
      <Sep h={2} />
      <Fila
        Icon={Calendar}
        label="Fecha límite"
        valor={
          targetDate
            ? mesAnio(new Date(targetDate + 'T00:00:00'))
            : 'Sin fecha límite'
        }
        suave={!targetDate}
        onPress={() => setHoja('date')}
      />
      <Sep h={1.5} />
      <T size={12.5} weight="500" color={C.textoSuave}>
        Si no eliges una fecha, te mostraremos planes según diferentes ritmos.
      </T>

      {/* Cuenta */}
      <Sep h={4} />
      <Etiqueta>¿Dónde quieres guardar este ahorro?</Etiqueta>
      <Sep h={2} />
      {accounts.length === 0 ? (
        <BotonCTA
          label="Agregar cuenta"
          tono="contorno"
          onPress={() => nav.navigate('AccountForm', {})}
        />
      ) : (
        <Fila
          Icon={Wallet}
          label="Cuenta"
          valor={cuenta?.name ?? 'Elegir cuenta'}
          suave={!cuenta}
          onPress={() => setHoja('account')}
        />
      )}

      {/* Contexto del calculo */}
      <Sep h={4.5} />
      <View
        style={{
          flexDirection: 'row',
          gap: space(3.5),
          backgroundColor: BRAND.paleTurquoise,
          borderRadius: radius.md,
          padding: space(4),
        }}
      >
        <ChartNoAxesColumn size={24} color={BRAND.turquoiseDark} strokeWidth={2.3} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={15.5} weight="800">
            Para calcular tu plan
          </T>
          <Sep h={1} />
          <T size={13.5} weight="500" color={C.textoSuave} style={{ lineHeight: 19 }}>
            Usaremos tus ingresos, gastos, deudas y próximos compromisos.
          </T>
        </View>
      </View>
      <Sep h={2} />
      <View style={{ flexDirection: 'row', gap: space(2), alignItems: 'flex-start' }}>
        <Info size={16} color={C.textoSuave} strokeWidth={2.2} />
        <T size={12.5} weight="500" color={C.textoSuave} style={{ flex: 1 }}>
          Si falta algún dato, te lo diremos antes de recomendarte.
        </T>
      </View>

      {error ? (
        <>
          <Sep h={3} />
          <T size={13.5} weight="600" color={BRAND.coral}>
            {error}
          </T>
        </>
      ) : null}

      <Sep h={5} />
      <BotonCTA
        label="Ver opciones"
        onPress={() => {
          const problema = validarPaso1();
          if (problema) return setError(problema);
          setError(null);
          setPaso(2);
          Haptics.selectionAsync().catch(() => undefined);
        }}
      />
    </>
  );

  // =====================================================================
  // PASO 2 · Opciones para tu meta
  // =====================================================================
  const TarjetaPlan = ({ o }: { o: SavingsOption }) => {
    const ui = PLAN_UI[o.kind];
    const activo = planKind === o.kind;
    const esFecha = o.kind === 'target';
    const advertir = esFecha ? !o.feasible : !o.feasible && opciones.safePerPeriod > 0;

    return (
      <Pressable
        onPress={() => {
          setPlanKind(o.kind);
          setAporteTexto(formatThousands(String(Math.round(o.amount / 100))));
          Haptics.selectionAsync().catch(() => undefined);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: activo }}
        accessibilityLabel={
          `Plan ${o.title}, ${money(o.amount)} por ${etiqueta}` +
          (o.periods ? `, termina en ${o.periods} ${etiqueta}s` : '') +
          (advertir ? '. Revisar viabilidad.' : '')
        }
        style={({ pressed }) => ({
          backgroundColor: activo ? ui.suave : BRAND.white,
          borderRadius: radius.lg,
          borderWidth: activo ? 2 : 1,
          borderColor: activo ? ui.color : C.borde,
          padding: space(4),
          marginBottom: space(3),
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {o.kind === opciones.highlight ? (
          <>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: ui.color,
                paddingVertical: space(1),
                paddingHorizontal: space(2.5),
                borderRadius: radius.pill,
              }}
            >
              <T size={11.5} weight="800" color={BRAND.white}>
                Recomendada
              </T>
            </View>
            <Sep h={2.5} />
          </>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: ui.suave,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ui.Icon size={22} color={ui.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={17} weight="800" lines={1}>
              {o.title}
            </T>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: ui.suave,
                paddingVertical: space(0.5),
                paddingHorizontal: space(2),
                borderRadius: radius.pill,
                marginTop: 2,
              }}
            >
              {/* La viabilidad se dice con palabras, no solo con color. */}
              <T size={11.5} weight="700" color={ui.color}>
                {advertir ? 'Revisar viabilidad' : ui.esfuerzo}
              </T>
            </View>
          </View>

          {/* El radio deja claro que se puede elegir. */}
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 2,
              borderColor: activo ? ui.color : C.borde,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activo ? (
              <View
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 7,
                  backgroundColor: ui.color,
                }}
              />
            ) : null}
          </View>
        </View>

        <Sep h={3} />
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={12} weight="500" color={C.textoSuave}>
              {esFecha ? 'Necesitas' : 'Aporte'}
            </T>
            <T size={16} weight="800" lines={1}>
              {money(o.amount)}
            </T>
            <T size={11.5} weight="500" color={C.textoSuave}>
              por {etiqueta}
            </T>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={12} weight="500" color={C.textoSuave}>
              Duración
            </T>
            <T size={16} weight="800" lines={1}>
              {o.periods ?? '—'} {etiqueta}s
            </T>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={12} weight="500" color={C.textoSuave}>
              Terminarías
            </T>
            <T size={14} weight="800" lines={2}>
              {o.endDate ? mesAnio(o.endDate) : '—'}
            </T>
          </View>
        </View>

        <Sep h={2.5} />
        <View
          style={{ flexDirection: 'row', gap: space(2), alignItems: 'flex-start' }}
        >
          {advertir ? (
            <CircleAlert size={17} color={BRAND.coral} strokeWidth={2.4} />
          ) : (
            <Check size={17} color={ui.color} strokeWidth={3} />
          )}
          <T
            size={12.5}
            weight="500"
            color={advertir ? BRAND.coral : C.textoSuave}
            style={{ flex: 1, lineHeight: 18 }}
          >
            {o.reason}
          </T>
        </View>
      </Pressable>
    );
  };

  const Paso2 = () => (
    <>
      {/* Resumen de la meta */}
      <View
        style={{
          backgroundColor: BRAND.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.borde,
          padding: space(4),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3.5) }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: color + '2E',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.createElement(
              PRESETS.find((p) => p.key === presetKey)?.Icon ?? Sparkles,
              { size: 27, color, strokeWidth: 2.2 },
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={17} weight="800" lines={2}>
              {name || 'Tu meta'}
            </T>
            <T size={money(target).length > 12 ? 22 : 26} weight="800" lines={1}>
              {money(target)}
            </T>
          </View>
        </View>

        <Sep h={3} />
        <View style={{ height: 1, backgroundColor: C.borde }} />
        <Sep h={3} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={13} weight="500" color={C.textoSuave}>
              Ya tienes
            </T>
            <T size={16.5} weight="800" color={BRAND.turquoiseDark} lines={1}>
              {money(initial)}
            </T>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.borde }} />
          <View style={{ flex: 1, minWidth: 0, paddingLeft: space(4) }}>
            <T size={13} weight="500" color={C.textoSuave}>
              Te faltan
            </T>
            <T size={16.5} weight="800" color={BRAND.coral} lines={1}>
              {money(restante)}
            </T>
          </View>
        </View>
      </View>

      {/* Contexto */}
      <Sep h={3} />
      <View style={{ flexDirection: 'row', gap: space(2.5), alignItems: 'flex-start' }}>
        <Info size={18} color={BRAND.turquoiseDark} strokeWidth={2.3} />
        <T size={13} weight="500" color={C.textoSuave} style={{ flex: 1, lineHeight: 18 }}>
          {opciones.missing.length
            ? `Este cálculo es aproximado porque aún faltan algunos datos: ${opciones.missing.join(', ')}.`
            : 'Calculado con tus ingresos, gastos y compromisos actuales.'}
        </T>
      </View>

      {/* Frecuencia */}
      <Sep h={4} />
      <View
        style={{
          flexDirection: 'row',
          gap: space(2.5),
          backgroundColor: BRAND.white,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: C.borde,
          padding: space(1),
        }}
      >
        {(['biweekly', 'monthly'] as Frequency[]).map((f) => {
          const activo = frequency === f;
          return (
            <Pressable
              key={f}
              onPress={() => {
                if (activo) return;
                setFrequency(f);
                // Al cambiar el ritmo, los planes se recalculan y el
                // aporte vuelve al sugerido: dejar el monto anterior
                // significaria otra cosa en el nuevo ritmo.
                setPlanKind(null);
                setAporteTexto('');
                Haptics.selectionAsync().catch(() => undefined);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={f === 'biweekly' ? 'Quincenal' : 'Mensual'}
              style={{
                flex: 1,
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space(2),
                borderRadius: radius.pill,
                backgroundColor: activo ? BRAND.paleTurquoise : 'transparent',
                borderWidth: activo ? 2 : 0,
                borderColor: BRAND.turquoise,
              }}
            >
              <Calendar
                size={19}
                color={activo ? BRAND.turquoiseDark : C.textoSuave}
                strokeWidth={2.2}
              />
              <T
                size={15}
                weight={activo ? '800' : '600'}
                color={activo ? BRAND.turquoiseDark : C.textoSuave}
              >
                {f === 'biweekly' ? 'Quincenal' : 'Mensual'}
              </T>
            </Pressable>
          );
        })}
      </View>

      {/* Planes */}
      <Sep h={4} />
      {opciones.safePerPeriod <= 0 ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              gap: space(3),
              backgroundColor: BRAND.paleYellow,
              borderRadius: radius.md,
              padding: space(4),
              marginBottom: space(3),
            }}
          >
            <BadgeAlert size={22} color={'#C98A00'} strokeWidth={2.3} />
            <T size={13.5} weight="500" style={{ flex: 1, lineHeight: 19 }}>
              Por ahora no encontramos un aporte que deje suficiente margen para tus
              compromisos. Puedes arrancar con poco o elegir una fecha más adelante.
            </T>
          </View>
        </>
      ) : null}

      {opciones.options.map((o) => (
        <TarjetaPlan key={o.kind} o={o} />
      ))}

      {/* Nota */}
      <Sep h={1} />
      <View
        style={{
          flexDirection: 'row',
          gap: space(3),
          backgroundColor: BRAND.paleTurquoise,
          borderRadius: radius.md,
          padding: space(3.5),
        }}
      >
        <Heart size={20} color={BRAND.turquoiseDark} strokeWidth={2.2} />
        <T size={13} weight="500" style={{ flex: 1, lineHeight: 18 }}>
          La meta no cambia; puedes ajustar el aporte o la frecuencia.
        </T>
      </View>

      {error ? (
        <>
          <Sep h={3} />
          <T size={13.5} weight="600" color={BRAND.coral}>
            {error}
          </T>
        </>
      ) : null}

      <Sep h={5} />
      <BotonCTA label="Ajustar y elegir plan" onPress={() => setHoja('adjust')} />
      <Sep h={3} />
      <BotonCTA
        label="Cambiar fecha"
        tono="contorno"
        onPress={() => setHoja('date')}
      />

      {editingId ? (
        <>
          <Sep h={4} />
          <Pressable
            onPress={() =>
              Alert.alert('Eliminar meta', 'Se borra la meta y sus aportes.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteGoal(editingId);
                    await refresh();
                    nav.goBack();
                  },
                },
              ])
            }
            accessibilityRole="button"
            accessibilityLabel="Eliminar meta"
            style={({ pressed }) => ({
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <T size={14.5} weight="700" color={BRAND.coral}>
              Eliminar meta
            </T>
          </Pressable>
        </>
      ) : null}
    </>
  );

  // --- Hoja de ajuste ------------------------------------------------------
  const superaCapacidad =
    opciones.safePerPeriod > 0 && aporte > opciones.safePerPeriod;

  const HojaAjuste = () => (
    <View
      style={{
        backgroundColor: BRAND.white,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
        padding: space(5),
        paddingBottom: insets.bottom + space(5),
        maxHeight: '90%',
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <T size={19} weight="800" header>
          Revisa y crea tu meta
        </T>
        <Sep h={1} />
        <T size={13.5} weight="500" color={C.textoSuave}>
          Puedes cambiar el aporte. La meta de {money(target)} no cambia.
        </T>

        <Sep h={4} />
        <Etiqueta>Aporte por {etiqueta}</Etiqueta>
        <Sep h={2} />
        <CampoMoneda
          valor={aporteTexto}
          onChange={(v) => {
            setAporteTexto(v);
            setPlanKind(null);
          }}
          a11y={`Aporte por ${etiqueta}, ${money(aporte)}`}
        />

        {superaCapacidad ? (
          <>
            <Sep h={2} />
            <View
              style={{
                flexDirection: 'row',
                gap: space(2.5),
                backgroundColor: BRAND.paleCoral,
                borderRadius: radius.md,
                padding: space(3.5),
              }}
            >
              <CircleAlert size={19} color={BRAND.coral} strokeWidth={2.4} />
              <T size={13} weight="500" style={{ flex: 1, lineHeight: 18 }}>
                Este aporte puede dejarte con poco margen para tus compromisos y
                necesidades. Te sobran {money(opciones.safePerPeriod)} por {etiqueta}.
              </T>
            </View>
          </>
        ) : null}

        <Sep h={4} />
        <View
          style={{
            backgroundColor: C.fondo,
            borderRadius: radius.md,
            padding: space(4),
          }}
        >
          {(
            [
              ['Meta', `${name || 'Tu meta'} — ${money(target)}`],
              ['Ya tienes', money(initial)],
              ['Te falta', money(restante)],
              ['Aporte elegido', `${money(aporte)} por ${etiqueta}`],
              ['Durante', periodos === null ? '—' : `${periodos} ${etiqueta}s`],
              ['Fecha estimada', fechaFin ? mesAnio(fechaFin) : '—'],
              ['Cuenta', cuenta?.name ?? 'Sin cuenta'],
            ] as [string, string][]
          ).map(([k, v]) => (
            <View
              key={k}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: space(3),
                paddingVertical: space(1.5),
              }}
            >
              <T size={13.5} weight="500" color={C.textoSuave} style={{ flex: 1 }}>
                {k}
              </T>
              <T size={14} weight="700" style={{ flex: 1.4 }} align="right" lines={2}>
                {v}
              </T>
            </View>
          ))}
        </View>

        <Sep h={5} />
        <BotonCTA
          label={guardando ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear meta'}
          disabled={guardando || aporte <= 0}
          onPress={() => {
            setHoja(null);
            guardar();
          }}
        />
        {aporte <= 0 ? (
          <>
            <Sep h={2} />
            <T size={13} weight="600" color={BRAND.coral} align="center">
              Escribe un aporte mayor que cero.
            </T>
          </>
        ) : null}
      </ScrollView>
    </View>
  );

  // --- Render ---------------------------------------------------------------
  return (
    <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(2),
          paddingHorizontal: space(5),
          paddingTop: insets.top + space(2),
          paddingBottom: space(4),
        }}
      >
        <Pressable
          onPress={() => (paso === 2 ? setPaso(1) : nav.goBack())}
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
          <ArrowLeft size={26} color={BRAND.white} strokeWidth={2.6} />
        </Pressable>
        <T
          size={22}
          weight="800"
          color={BRAND.white}
          align="center"
          style={{ flex: 1 }}
          lines={1}
          header
        >
          {paso === 1
            ? editingId
              ? 'Editar meta'
              : 'Crear ahorro'
            : 'Opciones para tu meta'}
        </T>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={{ flex: 1, opacity: fade }}>
          <ScrollView
            style={{
              flex: 1,
              backgroundColor: C.fondo,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
            }}
            contentContainerStyle={{
              padding: space(5),
              paddingBottom: insets.bottom + space(10),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {paso === 1 ? Paso1() : Paso2()}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Hojas */}
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
        {hoja === 'adjust' ? (
          HojaAjuste()
        ) : (
          <View
            style={{
              backgroundColor: BRAND.white,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              padding: space(5),
              paddingBottom: insets.bottom + space(5),
              maxHeight: '70%',
            }}
          >
            <T size={18} weight="800">
              {hoja === 'date' ? '¿Para cuándo la quieres?' : '¿En qué cuenta?'}
            </T>
            <Sep h={3} />
            <ScrollView>
              {hoja === 'date' ? (
                <>
                  <Pressable
                    onPress={() => {
                      setTargetDate(null);
                      setHoja(null);
                      setPlanKind(null);
                      setAporteTexto('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Sin fecha límite"
                    style={({ pressed }) => ({
                      minHeight: 54,
                      justifyContent: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: C.borde,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <T size={16} weight={targetDate === null ? '800' : '600'}>
                      {targetDate === null ? '✓  ' : ''}Sin fecha límite
                    </T>
                  </Pressable>
                  {meses.map((m) => (
                    <Pressable
                      key={m.key}
                      onPress={() => {
                        setTargetDate(m.key);
                        setHoja(null);
                        setPlanKind(null);
                        setAporteTexto('');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={m.label}
                      style={({ pressed }) => ({
                        minHeight: 54,
                        justifyContent: 'center',
                        borderBottomWidth: 1,
                        borderBottomColor: C.borde,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <T size={16} weight={targetDate === m.key ? '800' : '600'}>
                        {targetDate === m.key ? '✓  ' : ''}
                        {m.label}
                      </T>
                    </Pressable>
                  ))}
                </>
              ) : (
                accounts.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      setAccountId(a.id);
                      setHoja(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${a.name}, ${money(a.balance)}`}
                    style={({ pressed }) => ({
                      minHeight: 56,
                      justifyContent: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: C.borde,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <T size={16} weight={accountId === a.id ? '800' : '600'}>
                      {accountId === a.id ? '✓  ' : ''}
                      {a.name}
                    </T>
                    <T size={13} weight="500" color={C.textoSuave}>
                      {money(a.balance)}
                    </T>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
