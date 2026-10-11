import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowDownToLine,
  ArrowLeft,
  Bus,
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Flame,
  House,
  PiggyBank,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
  UtensilsCrossed,
  Wifi,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import { prettyDay } from '@/utils/date';
import { transactionsByDay, softDelete } from '@/db/repositories/transactions';
import { standardRanges, type Range } from '@/domain/period/cycles';
import {
  balanceNote,
  calculateMovementSummary,
  directionOf,
  filterMovements,
  groupMovementsByDate,
  typeLabel,
  type MovementFilter,
} from '@/domain/stats/movements';
import { BotonCTA, C, T } from '@/features/coach/income/parts';
import type { RootNav } from '@/app/navigation/types';
import type { TransactionRow } from '@/db/types';

const FILTROS: { key: MovementFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
];

/**
 * Icono por palabra clave del nombre o la categoria.
 *
 * Se mira el TEXTO y no un id fijo porque las categorias las crea el
 * usuario: si alguien escribe "Mercado del sabado", merece su carrito
 * igual que quien escribio "Mercado".
 */
const CLAVES: { palabras: string[]; Icon: typeof ShoppingCart }[] = [
  { palabras: ['mercado', 'super', 'compra'], Icon: ShoppingCart },
  { palabras: ['comida', 'restaurante', 'domicilio', 'almuerzo'], Icon: UtensilsCrossed },
  { palabras: ['transporte', 'bus', 'taxi', 'gasolina', 'uber'], Icon: Bus },
  { palabras: ['internet', 'wifi', 'datos', 'celular', 'plan'], Icon: Wifi },
  { palabras: ['arriendo', 'casa', 'hogar', 'alquiler'], Icon: House },
  { palabras: ['luz', 'agua', 'gas', 'servicio'], Icon: Flame },
  { palabras: ['tarjeta', 'credito'], Icon: CreditCard },
];

function iconoDe(tx: TransactionRow) {
  const dir = directionOf(tx);
  if (dir === 'income') return ArrowDownToLine;
  if (dir === 'saving') return PiggyBank;
  if (dir === 'debt') return FileText;

  const texto = `${tx.category_name ?? ''} ${tx.note ?? ''}`.toLowerCase();
  for (const { palabras, Icon } of CLAVES) {
    if (palabras.some((p) => texto.includes(p))) return Icon;
  }
  return Receipt;
}

/** Color de cada direccion. El signo acompaña siempre al color. */
function colorDe(dir: ReturnType<typeof directionOf>) {
  if (dir === 'income') return BRAND.turquoiseDark;
  if (dir === 'saving') return BRAND.yellow;
  return BRAND.coral;
}

function fondoDe(dir: ReturnType<typeof directionOf>) {
  if (dir === 'income') return BRAND.paleTurquoise;
  if (dir === 'saving') return BRAND.paleYellow;
  return BRAND.paleCoral;
}

/**
 * MOVIMIENTOS
 *
 * Arriba, oscuro: cuanto entro, cuanto salio y con que quedaste en el
 * periodo. Abajo, en un panel claro: la lista agrupada por dia.
 *
 * El resumen se calcula SIEMPRE desde los movimientos del rango, nunca
 * se guarda aparte; asi no puede desincronizarse de la lista que se ve
 * debajo.
 *
 * La regla del balance (y por que los tres numeros no siempre se restan
 * a simple vista) esta explicada en domain/stats/movements.ts.
 */
export function MovementsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { refresh } = useAppStore();

  const rangos = useMemo(() => standardRanges(), []);
  const [rango, setRango] = useState<Range>(
    () => standardRanges().find((r) => r.key === 'month') ?? standardRanges()[3],
  );
  const [filtro, setFiltro] = useState<MovementFilter>('all');
  const [rows, setRows] = useState<TransactionRow[] | null>(null);
  const [error, setError] = useState(false);
  const [hojaRango, setHojaRango] = useState(false);
  const [menuAgregar, setMenuAgregar] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;

  const cargar = useCallback(async () => {
    try {
      setError(false);
      setRows(await transactionsByDay(rango.from, rango.to));
    } catch {
      setError(true);
    }
  }, [rango.from, rango.to]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  /** Transicion corta al cambiar filtro o periodo. */
  function animar() {
    if (t.reduceMotion) return;
    fade.setValue(0.35);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  const visibles = useMemo(
    () => (rows ? filterMovements(rows, filtro) : []),
    [rows, filtro],
  );
  // El resumen mira TODO el periodo, no solo lo filtrado: si no, al
  // tocar "Gastos" los ingresos caerian a cero y el balance mentiria.
  const resumen = useMemo(
    () => calculateMovementSummary(rows ?? []),
    [rows],
  );
  const secciones = useMemo(() => groupMovementsByDate(visibles), [visibles]);
  const nota = balanceNote(resumen);

  function eliminar(tx: TransactionRow) {
    Alert.alert(
      '¿Quieres eliminar este movimiento?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await softDelete(tx.id);
            await Promise.all([cargar(), refresh()]);
          },
        },
      ],
    );
  }

  const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

  // --- Cabecera ---------------------------------------------------------
  const Cabecera = () => (
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
        onPress={() => nav.navigate('Tabs', { screen: 'Home' })}
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
      <T size={26} weight="800" color={BRAND.white} style={{ flex: 1 }} lines={1} header>
        Movimientos
      </T>
      <Pressable
        onPress={() => setHojaRango(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir filtros avanzados"
        hitSlop={10}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: 'flex-end',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <SlidersHorizontal size={24} color={BRAND.white} strokeWidth={2.3} />
      </Pressable>
    </View>
  );

  // --- Resumen del periodo ------------------------------------------------
  const Resumen = () => {
    const balancePositivo = resumen.balance >= 0;
    // Las tres cifras comparten el ancho de la pantalla, asi que la mas
    // larga manda: todas usan el mismo tamaño para que no parezcan de
    // importancias distintas, y ese tamaño baja hasta que la mas larga
    // quepa entera. Cortar un monto con "..." no es una opcion.
    const largo = Math.max(
      ...[resumen.income, resumen.expenses, Math.abs(resumen.balance)].map(
        (v) => money(v).length,
      ),
    );
    const tamano = largo >= 12 ? 13 : largo >= 10 ? 14.5 : largo >= 9 ? 16 : 17;

    const Metrica = ({
      label,
      valor,
      color,
      signo,
    }: {
      label: string;
      valor: number;
      color: string;
      signo: '+' | '−';
    }) => (
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={13} weight="500" color={BRAND.mutedLight} lines={1}>
          {label}
        </T>
        <Sep h={0.5} />
        {/* El signo acompaña al color: no se distingue solo por tono. */}
        <T size={tamano} weight="800" color={color} lines={1}>
          {signo}
          {money(valor)}
        </T>
      </View>
    );

    return (
      <View
        style={{
          marginHorizontal: space(5),
          backgroundColor: BRAND.navySoft,
          borderRadius: radius.lg,
          padding: space(4),
        }}
        accessible
        accessibilityLabel={
          `${rango.label}. Ingresos ${money(resumen.income)}. ` +
          `Gastos ${money(resumen.expenses)}. ` +
          `Balance ${balancePositivo ? 'positivo' : 'negativo'} de ${money(Math.abs(resumen.balance))}.`
        }
      >
        <T size={16} weight="700" color={BRAND.white} lines={1}>
          {rango.label}
        </T>
        <Sep h={2.5} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Metrica
            label="Ingresos"
            valor={resumen.income}
            color={BRAND.turquoise}
            signo="+"
          />
          <View
            style={{
              width: 1,
              height: 40,
              backgroundColor: BRAND.mutedLight + '33',
              marginHorizontal: space(2.5),
            }}
          />
          <Metrica
            label="Gastos"
            valor={resumen.expenses}
            color={BRAND.coral}
            signo="−"
          />
          <View
            style={{
              width: 1,
              height: 40,
              backgroundColor: BRAND.mutedLight + '33',
              marginHorizontal: space(2.5),
            }}
          />
          <Metrica
            label="Balance"
            valor={Math.abs(resumen.balance)}
            color={balancePositivo ? BRAND.yellow : BRAND.coral}
            signo={balancePositivo ? '+' : '−'}
          />
        </View>

        {/* Sin esta linea los tres numeros no cuadrarian a simple vista. */}
        {nota ? (
          <>
            <Sep h={2.5} />
            <T size={12} weight="500" color={BRAND.mutedLight} style={{ lineHeight: 17 }}>
              {nota}
            </T>
          </>
        ) : null}
      </View>
    );
  };

  // --- Filtros rapidos ------------------------------------------------------
  const Filtros = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Sin flexGrow: 0 el ScrollView horizontal se estira a lo alto y se
      // come todo el espacio libre de la pantalla; con alignItems
      // 'center' encima, las pastillas quedaban flotando en la mitad de
      // un hueco enorme. Va con alto fijo para que ocupe solo lo suyo.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{
        paddingHorizontal: space(5),
        gap: space(2.5),
        alignItems: 'center',
        height: 46,
      }}
    >
      {FILTROS.map((f) => {
        const activo = filtro === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => {
              if (activo) return;
              setFiltro(f.key);
              animar();
              Haptics.selectionAsync().catch(() => undefined);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`Filtrar: ${f.label}`}
            style={({ pressed }) => ({
              minHeight: 46,
              justifyContent: 'center',
              paddingHorizontal: space(5),
              borderRadius: radius.pill,
              backgroundColor: activo ? BRAND.turquoise : 'transparent',
              borderWidth: activo ? 0 : 1,
              borderColor: BRAND.borderDark,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <T
              size={14.5}
              weight={activo ? '800' : '600'}
              color={activo ? BRAND.navy : BRAND.mutedLight}
            >
              {f.label}
            </T>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => setHojaRango(true)}
        accessibilityRole="button"
        accessibilityLabel={`Periodo: ${rango.label}. Cambiar`}
        style={({ pressed }) => ({
          minHeight: 46,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(2),
          paddingHorizontal: space(4),
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: BRAND.borderDark,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Calendar size={18} color={BRAND.white} strokeWidth={2.2} />
        <T size={14} weight="600" color={BRAND.white}>
          {rango.label}
        </T>
        <ChevronDown size={17} color={BRAND.mutedLight} strokeWidth={2.4} />
      </Pressable>
    </ScrollView>
  );

  // --- Tarjeta de movimiento -------------------------------------------------
  const Movimiento = ({ tx }: { tx: TransactionRow }) => {
    const dir = directionOf(tx);
    const Icon = iconoDe(tx);
    const color = colorDe(dir);
    const signo = dir === 'income' ? '+' : '−';
    const nombre = tx.category_name ?? tx.debt_name ?? tx.note ?? typeLabel(tx);

    return (
      <Pressable
        onPress={() => nav.navigate('TransactionEdit', { transactionId: tx.id })}
        onLongPress={() => eliminar(tx)}
        accessibilityRole="button"
        accessibilityLabel={
          `${nombre}. ${typeLabel(tx)} desde ${tx.account_name}. ` +
          `${signo === '+' ? 'Más' : 'Menos'} ${money(tx.amount)}. Abrir detalle.`
        }
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3.5),
          minHeight: 72,
          backgroundColor: BRAND.white,
          borderRadius: radius.md,
          paddingVertical: space(3),
          paddingHorizontal: space(3.5),
          marginBottom: space(2.5),
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: fondoDe(dir),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={23} color={color} strokeWidth={2.3} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={16} weight="700" lines={2}>
            {nombre}
          </T>
          {/* Dos lineas: "Abono a deuda · Nequi" no cabe en una sola y
              quedaba cortado justo en el nombre de la cuenta, que es
              justo el dato que uno viene a mirar. */}
          <T size={13} weight="500" color={C.textoSuave} lines={2}>
            {typeLabel(tx)} · {tx.account_name}
          </T>
        </View>

        <T size={16.5} weight="800" color={color} lines={1}>
          {signo}
          {money(tx.amount)}
        </T>
        <ChevronRight size={20} color={C.textoSuave} strokeWidth={2.4} />
      </Pressable>
    );
  };

  // --- Panel ------------------------------------------------------------------
  const panelStyle = {
    flex: 1,
    backgroundColor: C.fondo,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: space(4),
  } as const;

  const Vacio = ({
    titulo,
    detalle,
    cta,
    onCta,
  }: {
    titulo: string;
    detalle: string;
    cta: string;
    onCta: () => void;
  }) => (
    <View style={{ padding: space(6), alignItems: 'center' }}>
      <T size={19} weight="800" align="center" header>
        {titulo}
      </T>
      <Sep h={2} />
      <T size={14.5} weight="500" color={C.textoSuave} align="center">
        {detalle}
      </T>
      <Sep h={5} />
      <View style={{ alignSelf: 'stretch' }}>
        <BotonCTA label={cta} onPress={onCta} />
      </View>
    </View>
  );

  const contenido = () => {
    if (error) {
      return (
        <Vacio
          titulo="No pudimos cargar tus movimientos."
          detalle="Puede ser algo pasajero."
          cta="Intentar de nuevo"
          onCta={cargar}
        />
      );
    }

    if (rows === null) {
      return (
        <View style={{ padding: space(5) }}>
          <Skeleton height={24} radius={8} width="40%" />
          <Sep h={3} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginBottom: space(2.5) }}>
              <Skeleton height={72} radius={radius.md} />
            </View>
          ))}
        </View>
      );
    }

    if (rows.length === 0) {
      return (
        <Vacio
          titulo="No hay movimientos en este periodo."
          detalle="Registra un ingreso o un gasto para empezar."
          cta="Registrar movimiento"
          onCta={() => setMenuAgregar(true)}
        />
      );
    }

    if (visibles.length === 0) {
      return (
        <Vacio
          titulo="No encontramos movimientos con estos filtros."
          detalle="Prueba con otro tipo o cambia el periodo."
          cta="Limpiar filtros"
          onCta={() => {
            setFiltro('all');
            animar();
          }}
        />
      );
    }

    return (
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <SectionList
          sections={secciones.map((s) => ({ title: s.key, data: s.data }))}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingTop: space(4), paddingBottom: space(2.5) }}>
              <T size={21} weight="800" header>
                {prettyDay(section.title)}
              </T>
            </View>
          )}
          renderItem={({ item }) => <Movimiento tx={item} />}
          contentContainerStyle={{
            paddingHorizontal: space(5),
            paddingBottom: insets.bottom + space(24),
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      </Animated.View>
    );
  };

  const OpcionMenu = ({
    label,
    color,
    onPress,
  }: {
    label: string;
    color: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 58,
        justifyContent: 'center',
        paddingHorizontal: space(4),
        borderRadius: radius.md,
        backgroundColor: pressed ? BRAND.offWhite : 'transparent',
      })}
    >
      <T size={16} weight="700" color={color}>
        {label}
      </T>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
      <Cabecera />
      <Resumen />
      <Sep h={4} />
      <Filtros />
      <View style={panelStyle}>{contenido()}</View>

      {/* Aqui NO va un boton flotante. La barra inferior ya tiene el suyo
          en el centro, y poner otro dejaba dos "+" encimados tapando el
          monto de un movimiento. El mockup lo dibuja porque muestra la
          pantalla sin esa barra. */}

      {/* Periodo */}
      <Modal
        visible={hojaRango}
        transparent
        animationType={t.reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setHojaRango(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#07121BA8' }}
          onPress={() => setHojaRango(false)}
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
            ¿Qué periodo quieres ver?
          </T>
          <Sep h={3} />
          <ScrollView>
            {rangos.map((r) => {
              const activo = r.key === rango.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => {
                    setRango(r);
                    setHojaRango(false);
                    setRows(null);
                    animar();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={r.label}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    justifyContent: 'center',
                    paddingVertical: space(2.5),
                    borderBottomWidth: 1,
                    borderBottomColor: C.borde,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <T size={16} weight={activo ? '800' : '600'}>
                    {activo ? '✓  ' : ''}
                    {r.label}
                  </T>
                  <T size={12.5} weight="500" color={C.textoSuave}>
                    {r.days} {r.days === 1 ? 'día' : 'días'}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Registrar */}
      <Modal
        visible={menuAgregar}
        transparent
        animationType={t.reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setMenuAgregar(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#07121BA8' }}
          onPress={() => setMenuAgregar(false)}
          accessibilityLabel="Cerrar"
        />
        <View
          style={{
            position: 'absolute',
            left: space(5),
            right: space(5),
            bottom: insets.bottom + space(22),
            backgroundColor: BRAND.white,
            borderRadius: radius.xl,
            padding: space(3),
          }}
        >
          <OpcionMenu
            label="Registrar gasto"
            color={BRAND.coral}
            onPress={() => {
              setMenuAgregar(false);
              nav.navigate('QuickAdd', { type: 'expense' });
            }}
          />
          <OpcionMenu
            label="Registrar ingreso"
            color={BRAND.turquoiseDark}
            onPress={() => {
              setMenuAgregar(false);
              nav.navigate('QuickAdd', { type: 'income' });
            }}
          />
          <OpcionMenu
            label="Aportar a ahorro"
            color={BRAND.ink}
            onPress={() => {
              setMenuAgregar(false);
              nav.navigate('Tabs', { screen: 'Savings' });
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
