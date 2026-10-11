import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Briefcase,
  Bus,
  Calendar,
  CreditCard,
  Ellipsis,
  FileText,
  Gift,
  House,
  Laptop,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
  Wallet,
  Wifi,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { listCategories } from '@/db/repositories/categories';
import { spentInCategoryThisMonth } from '@/db/repositories/stats';
import { addTransaction } from '@/db/repositories/transactions';
import { payDebt } from '@/db/repositories/debts';
import { depositToInvestment } from '@/db/repositories/investments';
import { cardDates, createInstallmentPurchase } from '@/db/repositories/creditCards';
import { installmentAmount } from '@/domain/debt/amortization';
import { buildCoachContext } from '@/domain/coach/context';
import { allocateIncome, evaluateExpense } from '@/domain/coach/engine';
import { setPendingDecision } from '@/features/coach/expense/handoff';
import { formatThousands, money, parseMoneyInput } from '@/utils/money';
import { defaultAccountId } from '@/domain/accounts/defaultAccount';
import { dayKey } from '@/utils/date';
import { BotonCTA, C, T } from '@/features/coach/income/parts';
import type { Category } from '@/db/types';
import type { AllocationSlice, CoachVerdict } from '@/domain/coach/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

type Tipo = 'expense' | 'income';

/**
 * Iconos de las categorias rapidas.
 *
 * Se eligen por PALABRA del nombre, no por un id fijo, porque las
 * categorias las crea el usuario: quien escriba "Mercado del sabado"
 * merece su carrito igual que quien escribio "Mercado".
 */
const CLAVES: { palabras: string[]; Icon: typeof ShoppingCart }[] = [
  { palabras: ['mercado', 'super', 'compra'], Icon: ShoppingCart },
  { palabras: ['comida', 'restaurante', 'domicilio'], Icon: UtensilsCrossed },
  { palabras: ['transporte', 'bus', 'taxi', 'gasolina'], Icon: Bus },
  { palabras: ['hogar', 'casa', 'arriendo'], Icon: House },
  { palabras: ['internet', 'wifi', 'celular', 'servicio'], Icon: Wifi },
  { palabras: ['salario', 'sueldo', 'nomina'], Icon: Briefcase },
  { palabras: ['freelance', 'trabajo', 'proyecto'], Icon: Laptop },
  { palabras: ['regalo', 'bono', 'premio'], Icon: Gift },
];

function iconoCategoria(nombre: string) {
  const n = nombre.toLowerCase();
  for (const { palabras, Icon } of CLAVES) {
    if (palabras.some((p) => n.includes(p))) return Icon;
  }
  return Tag;
}

/** Los ultimos dias, para elegir fecha sin meter otra dependencia. */
function ultimosDias(n = 14) {
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      key: dayKey(d),
      label:
        i === 0
          ? 'Hoy'
          : i === 1
            ? 'Ayer'
            : d.toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
    });
  }
  return out;
}

/**
 * REGISTRAR MOVIMIENTO
 *
 * Una sola pantalla para gasto e ingreso. La estructura no cambia entre
 * los dos: cambian el color, la pregunta, las categorias y el boton. Que
 * sea la misma forma es lo que evita equivocarse de tipo.
 *
 * El monto manda: es lo mas grande de la pantalla y lo primero que se
 * toca. Todo lo demas viene precargado con algo razonable para que
 * registrar un gasto sean dos toques y no siete.
 *
 * Al guardar un GASTO no se escribe de una: el coach lo revisa primero y
 * devuelve la decision aqui, que es el unico sitio que escribe en la
 * base. Un INGRESO si entra de una (la plata ya llego) y despues se
 * ofrece repartirlo.
 */
export function QuickAddScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuickAdd'>>();

  const { accounts, primaryAccount, refresh, settings } = useAppStore();

  const [type, setType] = useState<Tipo>(route.params?.type ?? 'expense');
  const [montoTexto, setMontoTexto] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(() => dayKey(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoja, setHoja] = useState<null | 'category' | 'account' | 'date'>(null);

  // Compra a cuotas con tarjeta de credito
  const [installments, setInstallments] = useState(1);
  const [withInterest, setWithInterest] = useState(true);
  const [rate, setRate] = useState('');

  const [verdict, setVerdict] = useState<CoachVerdict | null>(null);

  const amount = parseMoneyInput(montoTexto);
  const esGasto = type === 'expense';
  const acento = esGasto ? BRAND.coral : BRAND.turquoise;
  const acentoSuave = esGasto ? BRAND.paleCoral : BRAND.paleTurquoise;

  const colorTipo = useRef(new Animated.Value(esGasto ? 0 : 1)).current;
  useEffect(() => {
    if (t.reduceMotion) {
      colorTipo.setValue(esGasto ? 0 : 1);
      return;
    }
    Animated.timing(colorTipo, {
      toValue: esGasto ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [esGasto, colorTipo, t.reduceMotion]);

  useEffect(() => {
    listCategories(type).then((rows) => {
      setCategories(rows);
      setCategoryId((prev) => {
        // Si la categoria elegida no existe para este tipo, se cambia.
        const sigueValida = rows.some((r) => r.id === prev);
        return sigueValida ? prev : (rows[0]?.id ?? null);
      });
    });
  }, [type]);

  // La cuenta llega preseleccionada cuando se entra desde el detalle de
  // una cuenta: ahi el usuario ya dijo de donde sale la plata.
  useEffect(() => {
    if (accountId !== null || !accounts.length) return;
    setAccountId(defaultAccountId(route.params?.accountId, accounts, primaryAccount?.id ?? null));
  }, [accounts, accountId, route.params?.accountId, primaryAccount]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isCard = selectedAccount?.type === 'credit_card';
  const cardDatesInfo = isCard ? cardDates(selectedAccount) : null;

  useEffect(() => {
    if (isCard && selectedAccount?.card_rate_bp && !rate) {
      setRate(String(selectedAccount.card_rate_bp / 100));
    }
    if (!isCard) setInstallments(1);
  }, [isCard, selectedAccount, rate]);

  const rateBp = withInterest
    ? Math.round(Number((rate || '0').replace(',', '.')) * 100)
    : 0;

  const cuotaPreview = useMemo(() => {
    if (installments <= 1 || amount <= 0) return { cuota: amount, interes: 0 };
    const cuota = installmentAmount(amount, rateBp, installments);
    return { cuota, interes: Math.max(cuota * installments - amount, 0) };
  }, [amount, rateBp, installments]);

  // Las tres primeras categorias reales + "Otros", que abre la lista
  // completa. No se inventan categorias que el usuario no tenga.
  const rapidas = categories.slice(0, 3);

  const dias = useMemo(() => ultimosDias(), []);
  const fechaLabel = dias.find((d) => d.key === fecha)?.label ?? fecha;

  // --- Validacion ---------------------------------------------------------
  function validar(): string | null {
    if (amount <= 0) return 'Ingresa un monto mayor que $ 0.';
    if (!categoryId) return 'Selecciona una categoría.';
    if (!accountId) return 'Selecciona una cuenta.';
    return null;
  }

  async function onSubmit() {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    if (saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const ctx = await buildCoachContext();

    if (type === 'expense') {
      const spent = selectedCategory
        ? await spentInCategoryThisMonth(selectedCategory.id)
        : 0;
      const v = evaluateExpense(ctx, {
        amount,
        accountId: accountId!,
        category: selectedCategory,
        categorySpentThisMonth: spent,
      });
      setVerdict(v);

      // El coach revisa TODO gasto antes de registrarlo, tambien los que
      // caben de sobra: ver "si, es manejable" y cuanto queda es parte de
      // la decision, no solo la alarma cuando algo va mal.
      const cuenta = accounts.find((a) => a.id === accountId);
      setPendingDecision((decision) => {
        nav.goBack();
        if (decision === 'confirm') persist([], v.level === 'block');
      });
      nav.navigate('ExpenseCoach', {
        amount,
        accountId: accountId!,
        accountName: cuenta?.name ?? 'Tu cuenta',
        categoryId: selectedCategory?.id ?? null,
        categoryName: selectedCategory?.name ?? 'Gasto',
      });
      return;
    }

    await persistIncomeThenAllocate();
  }

  /**
   * Registra el ingreso y abre el coach de reparto. Si el usuario lo
   * cierra sin repartir, la plata se queda en la cuenta: esa es la
   * opcion por defecto, no una excepcion.
   */
  async function persistIncomeThenAllocate() {
    if (!accountId || saving) return;
    setSaving(true);
    try {
      await addTransaction({
        type: 'income',
        amount,
        accountId,
        categoryId,
        note: note || null,
        occurredAt: `${fecha}T12:00:00`,
        coachVerdict: 'ok',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.replace('AllocateIncome', { amount, accountId });
    } catch {
      setError('No pudimos guardar este movimiento. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  /** Guarda el movimiento. `apply` son solo las tajadas que el usuario marco. */
  async function persist(apply: AllocationSlice[], override = false) {
    if (!accountId || saving) return;
    setSaving(true);
    try {
      // Compra diferida con tarjeta: crea el plan de cuotas y su gasto.
      if (type === 'expense' && isCard && installments > 1) {
        await createInstallmentPurchase({
          accountId,
          amount,
          installments,
          monthlyRateBp: rateBp,
          description: note.trim() || selectedCategory?.name || 'Compra a cuotas',
          categoryId,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        await refresh();
        nav.goBack();
        return;
      }

      await addTransaction({
        type,
        amount,
        accountId,
        categoryId,
        note: note || null,
        occurredAt: `${fecha}T12:00:00`,
        coachVerdict: verdict?.level ?? 'ok',
        coachOverride: override,
      });

      if (apply.length) {
        for (const s of apply) {
          if (s.amount <= 0) continue;
          if ((s.kind === 'debt' || s.kind === 'commitment') && s.debtId) {
            await payDebt({
              debtId: s.debtId,
              accountId,
              amount: s.amount,
              isExtra: s.kind === 'debt',
              note: 'Reparto sugerido por el coach',
            });
          } else if (s.kind === 'invest' && s.investmentId) {
            await depositToInvestment({
              investmentId: s.investmentId,
              accountId,
              amount: s.amount,
              note: 'Reparto sugerido por el coach',
            });
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.goBack();
    } catch {
      setError('No pudimos guardar este movimiento. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

  // --- Selector de tipo ----------------------------------------------------
  const SelectorTipo = () => {
    const Opcion = ({
      valor,
      label,
      Icon,
      color,
      textoActivo,
    }: {
      valor: Tipo;
      label: string;
      Icon: typeof ArrowUp;
      color: string;
      textoActivo: string;
    }) => {
      const activo = type === valor;
      return (
        <Pressable
          onPress={() => {
            if (activo) return;
            // Cambiar de tipo NO borra el monto, la fecha ni la nota: lo
            // unico que puede dejar de servir es la categoria, y eso lo
            // resuelve el efecto de arriba.
            setType(valor);
            setError(null);
            Haptics.selectionAsync().catch(() => undefined);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: activo }}
          accessibilityLabel={`Seleccionar ${label.toLowerCase()}`}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space(2.5),
            borderRadius: radius.pill,
            backgroundColor: activo ? color : 'transparent',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon
            size={21}
            color={activo ? textoActivo : BRAND.mutedLight}
            strokeWidth={2.6}
          />
          <T size={16} weight="800" color={activo ? textoActivo : BRAND.mutedLight}>
            {label}
          </T>
        </Pressable>
      );
    };

    return (
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: space(5),
          padding: space(1),
          borderRadius: radius.pill,
          backgroundColor: BRAND.navySoft,
          borderWidth: 1,
          borderColor: BRAND.borderDark,
        }}
      >
        <Opcion
          valor="expense"
          label="Gasto"
          Icon={ArrowUp}
          color={BRAND.coral}
          textoActivo={BRAND.white}
        />
        <Opcion
          valor="income"
          label="Ingreso"
          Icon={ArrowDown}
          color={BRAND.turquoise}
          textoActivo={BRAND.navy}
        />
      </View>
    );
  };

  // --- Fila de detalle ------------------------------------------------------
  const Fila = ({
    Icon,
    label,
    valor,
    onPress,
    placeholder,
  }: {
    Icon: typeof Tag;
    label: string;
    valor: string;
    onPress: () => void;
    placeholder?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} seleccionada: ${valor}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3.5),
        minHeight: 68,
        paddingHorizontal: space(4),
        paddingVertical: space(2.5),
        borderRadius: radius.md,
        backgroundColor: BRAND.white,
        borderWidth: 1,
        borderColor: C.borde,
        marginBottom: space(2.5),
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon size={24} color={C.textoSuave} strokeWidth={2} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={13} weight="500" color={C.textoSuave}>
          {label}
        </T>
        <T
          size={16.5}
          weight="700"
          color={placeholder ? C.textoSuave : C.texto}
          lines={1}
        >
          {valor}
        </T>
      </View>
      <T size={20} weight="400" color={C.textoSuave}>
        ›
      </T>
    </Pressable>
  );

  // --- Hoja de seleccion -----------------------------------------------------
  const opcionesHoja =
    hoja === 'category'
      ? categories.map((c) => ({ id: c.id, label: c.name, sub: null as string | null }))
      : hoja === 'account'
        ? accounts.map((a) => ({ id: a.id, label: a.name, sub: money(a.balance) }))
        : dias.map((d, i) => ({ id: i, label: d.label, sub: null }));

  function elegirDeHoja(id: number) {
    if (hoja === 'category') setCategoryId(id);
    else if (hoja === 'account') setAccountId(id);
    else setFecha(dias[id].key);
    setHoja(null);
    setError(null);
    Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
      {/* Cabecera */}
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
          onPress={() => nav.goBack()}
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
        <T size={24} weight="800" color={BRAND.white} style={{ flex: 1 }} lines={1} header>
          Registrar movimiento
        </T>
      </View>

      <SelectorTipo />
      <Sep h={4} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          {/* Monto */}
          <T size={19} weight="800" header>
            {esGasto ? '¿Cuánto gastaste?' : '¿Cuánto recibiste?'}
          </T>
          <Sep h={2.5} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(2.5),
              backgroundColor: BRAND.white,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: error && amount <= 0 ? BRAND.coral : C.borde,
              paddingHorizontal: space(4),
              paddingVertical: space(3),
              minHeight: 86,
            }}
          >
            <T size={38} weight="800" color={C.texto}>
              $
            </T>
            <TextInput
              value={montoTexto}
              onChangeText={(v) => {
                setMontoTexto(formatThousands(v));
                if (error) setError(null);
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              placeholderTextColor={BRAND.mutedDark}
              selectionColor={acento}
              accessibilityLabel={esGasto ? 'Monto del gasto' : 'Monto del ingreso'}
              style={{
                flex: 1,
                color: C.texto,
                fontSize: montoTexto.length > 10 ? 28 : montoTexto.length > 8 ? 33 : 38,
                fontWeight: '800',
                paddingVertical: 0,
                paddingHorizontal: 0,
              }}
            />
          </View>

          {error ? (
            <>
              <Sep h={2} />
              <T size={13.5} weight="600" color={BRAND.coral}>
                {error}
              </T>
            </>
          ) : null}

          {/* Categorias rapidas */}
          <Sep h={5} />
          <T size={17} weight="800">
            {esGasto ? 'Categoría' : 'Categoría rápida'}
          </T>
          <Sep h={2.5} />
          <View style={{ flexDirection: 'row', gap: space(2.5) }}>
            {rapidas.map((c) => {
              const activo = categoryId === c.id;
              const Icon = iconoCategoria(c.name);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setCategoryId(c.id);
                    setError(null);
                    Haptics.selectionAsync().catch(() => undefined);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={`Categoría ${c.name}`}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 88,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: space(2),
                    paddingHorizontal: space(1),
                    borderRadius: radius.md,
                    backgroundColor: activo ? acentoSuave : BRAND.white,
                    borderWidth: activo ? 2 : 1,
                    borderColor: activo ? acento : C.borde,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Icon
                    size={26}
                    color={activo ? acento : C.texto}
                    strokeWidth={2.1}
                  />
                  <T
                    size={13}
                    weight="700"
                    color={activo ? acento : C.texto}
                    lines={1}
                    align="center"
                  >
                    {c.name}
                  </T>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setHoja('category')}
              accessibilityRole="button"
              accessibilityLabel="Ver todas las categorías"
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 88,
                alignItems: 'center',
                justifyContent: 'center',
                gap: space(2),
                borderRadius: radius.md,
                backgroundColor: BRAND.white,
                borderWidth: 1,
                borderColor: C.borde,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ellipsis size={26} color={C.texto} strokeWidth={2.4} />
              <T size={13} weight="700" color={C.texto}>
                Otros
              </T>
            </Pressable>
          </View>

          {/* Detalle */}
          <Sep h={4} />
          <Fila
            Icon={Tag}
            label="Categoría"
            valor={selectedCategory?.name ?? 'Elegir'}
            placeholder={!selectedCategory}
            onPress={() => setHoja('category')}
          />
          <Fila
            Icon={Wallet}
            label="Cuenta"
            valor={selectedAccount?.name ?? 'Elegir'}
            placeholder={!selectedAccount}
            onPress={() => setHoja('account')}
          />
          <Fila
            Icon={Calendar}
            label="Fecha"
            valor={fechaLabel}
            onPress={() => setHoja('date')}
          />

          {/* Nota */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: space(3.5),
              minHeight: 68,
              paddingHorizontal: space(4),
              paddingVertical: space(3),
              borderRadius: radius.md,
              backgroundColor: BRAND.white,
              borderWidth: 1,
              borderColor: C.borde,
            }}
          >
            <FileText size={24} color={C.textoSuave} strokeWidth={2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={13} weight="500" color={C.textoSuave}>
                Nota
              </T>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Agrega una nota (opcional)"
                placeholderTextColor={C.textoSuave}
                multiline
                maxLength={280}
                accessibilityLabel="Nota opcional"
                style={{
                  color: C.texto,
                  fontSize: 16.5,
                  fontWeight: '600',
                  paddingVertical: 2,
                  paddingHorizontal: 0,
                  minHeight: 24,
                }}
              />
            </View>
          </View>

          {/* Compra a cuotas: solo con tarjeta de credito */}
          {isCard && esGasto ? (
            <>
              <Sep h={4} />
              <View
                style={{
                  backgroundColor: BRAND.white,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: C.borde,
                  padding: space(4),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space(3),
                  }}
                >
                  <CreditCard size={22} color={BRAND.coral} strokeWidth={2.2} />
                  <T size={15.5} weight="700" style={{ flex: 1 }}>
                    Diferir a cuotas
                  </T>
                  <Switch
                    value={installments > 1}
                    onValueChange={(v) => setInstallments(v ? 3 : 1)}
                    trackColor={{ true: BRAND.coral, false: BRAND.borderLight }}
                    accessibilityLabel="Diferir la compra a cuotas"
                  />
                </View>

                {installments > 1 ? (
                  <>
                    <Sep h={3} />
                    <View style={{ flexDirection: 'row', gap: space(2) }}>
                      {[3, 6, 12, 24].map((n) => (
                        <Pressable
                          key={n}
                          onPress={() => setInstallments(n)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: installments === n }}
                          accessibilityLabel={`${n} cuotas`}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: radius.sm,
                            borderWidth: installments === n ? 2 : 1,
                            borderColor: installments === n ? BRAND.coral : C.borde,
                          }}
                        >
                          <T
                            size={14}
                            weight="700"
                            color={installments === n ? BRAND.coral : C.texto}
                          >
                            {n}
                          </T>
                        </Pressable>
                      ))}
                    </View>
                    <Sep h={3} />
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}
                    >
                      <T size={14} weight="500" color={C.textoSuave} style={{ flex: 1 }}>
                        Cobra interés
                      </T>
                      <Switch
                        value={withInterest}
                        onValueChange={setWithInterest}
                        trackColor={{ true: BRAND.coral, false: BRAND.borderLight }}
                        accessibilityLabel="La tarjeta cobra interés"
                      />
                    </View>
                    {withInterest ? (
                      <>
                        <Sep h={2} />
                        <TextInput
                          value={rate}
                          onChangeText={setRate}
                          keyboardType="decimal-pad"
                          placeholder="Tasa mensual %"
                          placeholderTextColor={C.textoSuave}
                          accessibilityLabel="Tasa mensual en porcentaje"
                          style={{
                            color: C.texto,
                            fontSize: 15,
                            fontWeight: '600',
                            borderWidth: 1,
                            borderColor: C.borde,
                            borderRadius: radius.sm,
                            paddingHorizontal: space(3),
                            paddingVertical: space(2.5),
                          }}
                        />
                      </>
                    ) : null}
                    {amount > 0 ? (
                      <>
                        <Sep h={3} />
                        <T size={13.5} weight="600" color={C.textoSuave}>
                          {installments} cuotas de {money(cuotaPreview.cuota)}
                          {cuotaPreview.interes > 0
                            ? ` · ${money(cuotaPreview.interes)} de interés`
                            : ' · sin interés'}
                        </T>
                      </>
                    ) : null}
                    {cardDatesInfo?.daysToPayment !== null &&
                    cardDatesInfo?.daysToPayment !== undefined ? (
                      <>
                        <Sep h={1.5} />
                        <T size={12.5} weight="500" color={C.textoSuave}>
                          Tu próximo pago de esta tarjeta es{' '}
                          {cardDatesInfo.daysToPayment === 0
                            ? 'hoy'
                            : cardDatesInfo.daysToPayment === 1
                              ? 'mañana'
                              : `en ${cardDatesInfo.daysToPayment} días`}
                          .
                        </T>
                      </>
                    ) : null}
                  </>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Guardar */}
          <Sep h={5} />
          <Pressable
            onPress={onSubmit}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={esGasto ? 'Guardar gasto' : 'Guardar ingreso'}
            accessibilityState={{ disabled: saving }}
            style={({ pressed }) => ({
              minHeight: 58,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: acento,
              opacity: saving ? 0.6 : pressed ? 0.88 : 1,
            })}
          >
            <T
              size={17}
              weight="800"
              color={esGasto ? BRAND.white : BRAND.navy}
            >
              {saving
                ? 'Guardando...'
                : esGasto
                  ? 'Guardar gasto'
                  : 'Guardar ingreso'}
            </T>
          </Pressable>
          <Sep h={3} />
          <T size={13.5} weight="600" color={C.textoSuave} align="center">
            Podrás editarlo después
          </T>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selector de categoria, cuenta o fecha */}
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
            backgroundColor: BRAND.white,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            padding: space(5),
            paddingBottom: insets.bottom + space(5),
            maxHeight: '70%',
          }}
        >
          <T size={18} weight="800">
            {hoja === 'category'
              ? '¿Qué categoría?'
              : hoja === 'account'
                ? '¿Desde qué cuenta?'
                : '¿Qué día fue?'}
          </T>
          <Sep h={3} />
          <ScrollView>
            {opcionesHoja.map((o) => (
              <Pressable
                key={`${hoja}-${o.id}`}
                onPress={() => elegirDeHoja(o.id)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                style={({ pressed }) => ({
                  minHeight: 56,
                  justifyContent: 'center',
                  paddingVertical: space(2.5),
                  borderBottomWidth: 1,
                  borderBottomColor: C.borde,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <T size={16} weight="700">
                  {o.label}
                </T>
                {o.sub ? (
                  <T size={13} weight="500" color={C.textoSuave}>
                    {o.sub}
                  </T>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
