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
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowDownToLine,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Bus,
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  EllipsisVertical,
  FileText,
  House,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Smartphone,
  Trash2,
  UtensilsCrossed,
  Wallet,
  Wifi,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import { prettyDay } from '@/utils/date';
import { getAccount, archiveAccount, restoreAccount } from '@/db/repositories/accounts';
import { transactionsByAccount, softDelete } from '@/db/repositories/transactions';
import {
  calculateAccountSummary,
  directionOf,
  filterMovements,
  groupMovementsByDate,
  typeLabel,
  type MovementFilter,
} from '@/domain/stats/movements';
import { BotonCTA, C, T } from '@/features/coach/income/parts';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';
import type { AccountBalance, AccountType, TransactionRow } from '@/db/types';

const TIPO_LABEL: Record<AccountType, string> = {
  bank: 'Cuenta bancaria',
  wallet: 'Billetera digital',
  cash: 'Dinero en mano',
  credit_card: 'Tarjeta de crédito',
  savings: 'Cuenta de ahorro',
  other: 'Otra cuenta',
};

const TIPO_ICON: Record<AccountType, typeof Wallet> = {
  bank: Landmark,
  wallet: Smartphone,
  cash: Banknote,
  credit_card: CreditCard,
  savings: PiggyBank,
  other: Wallet,
};

const FILTROS: { key: MovementFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
];

const CLAVES: { palabras: string[]; Icon: typeof ShoppingCart }[] = [
  { palabras: ['mercado', 'super', 'compra'], Icon: ShoppingCart },
  { palabras: ['comida', 'restaurante', 'domicilio'], Icon: UtensilsCrossed },
  { palabras: ['transporte', 'bus', 'taxi', 'gasolina'], Icon: Bus },
  { palabras: ['internet', 'wifi', 'celular', 'plan'], Icon: Wifi },
  { palabras: ['arriendo', 'casa', 'hogar'], Icon: House },
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

/** Los ultimos meses, para el selector de periodo. */
function ultimosMeses(n = 12) {
  const out: { key: string; label: string; from: string; to: string }[] = [];
  const hoy = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const p = (x: number) => String(x).padStart(2, '0');
    out.push({
      key: `${d.getFullYear()}-${p(d.getMonth() + 1)}`,
      label:
        i === 0
          ? 'Este mes'
          : d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
      from: `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`,
      to: `${fin.getFullYear()}-${p(fin.getMonth() + 1)}-${p(fin.getDate())}`,
    });
  }
  return out;
}

/**
 * DETALLE DE UNA CUENTA
 *
 * Todo lo que se ve aqui es de ESTA cuenta y de ninguna otra. El
 * repositorio ya filtra por `account_id` (y por `to_account_id`, para
 * que un traslado recibido aparezca en la cuenta que lo recibio), y la
 * pantalla nunca mezcla: si algo no toca esta cuenta, no entra.
 *
 * El resumen cuenta los traslados, al reves que el resumen general de
 * Movimientos. Es a proposito: mover plata de Nequi a Nu no cambia tu
 * patrimonio, pero para Nequi es plata que salio. Ignorarlo dejaria un
 * saldo que no cuadra con la lista de abajo.
 */
export function AccountDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { accountId } =
    useRoute<RouteProp<RootStackParamList, 'AccountDetail'>>().params;
  const { refresh } = useAppStore();

  const meses = useMemo(() => ultimosMeses(), []);
  const [mes, setMes] = useState(meses[0]);
  const [filtro, setFiltro] = useState<MovementFilter>('all');
  const [cuenta, setCuenta] = useState<AccountBalance | null>(null);
  const [rows, setRows] = useState<TransactionRow[] | null>(null);
  const [error, setError] = useState(false);
  const [noExiste, setNoExiste] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [hojaMes, setHojaMes] = useState(false);
  const [menuAgregar, setMenuAgregar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;

  const cargar = useCallback(async () => {
    try {
      setError(false);
      const [a, txs] = await Promise.all([
        getAccount(accountId),
        transactionsByAccount(accountId, 500),
      ]);
      if (!a) {
        setNoExiste(true);
        return;
      }
      setCuenta(a);
      setRows(txs);
    } catch {
      setError(true);
    }
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

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

  // Solo el mes elegido. El repositorio ya garantizo que son de esta cuenta.
  const delMes = useMemo(
    () =>
      (rows ?? []).filter((r) => r.occurred_day >= mes.from && r.occurred_day <= mes.to),
    [rows, mes],
  );
  const resumen = useMemo(
    () => calculateAccountSummary(delMes, accountId),
    [delMes, accountId],
  );
  const visibles = useMemo(() => filterMovements(delMes, filtro), [delMes, filtro]);
  const secciones = useMemo(() => groupMovementsByDate(visibles), [visibles]);

  const archivada = cuenta?.archived === 1;
  const esTarjeta = cuenta?.type === 'credit_card';
  const saldo = esTarjeta ? Math.max(-(cuenta?.balance ?? 0), 0) : (cuenta?.balance ?? 0);

  // --- Acciones --------------------------------------------------------
  function pedirArchivar() {
    if (!cuenta) return;
    Alert.alert(
      '¿Archivar esta cuenta?',
      'Tus movimientos se conservarán, pero la cuenta no aparecerá en nuevos movimientos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar cuenta',
          onPress: async () => {
            setOcupado(true);
            try {
              await archiveAccount(cuenta.id);
              await Promise.all([cargar(), refresh()]);
            } finally {
              setOcupado(false);
            }
          },
        },
      ],
    );
  }

  async function restaurar() {
    if (!cuenta || ocupado) return;
    setOcupado(true);
    try {
      await restoreAccount(cuenta.id);
      await Promise.all([cargar(), refresh()]);
    } finally {
      setOcupado(false);
    }
  }

  function eliminarMovimiento(tx: TransactionRow) {
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
        gap: space(1),
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

      <T
        size={cuenta && cuenta.name.length > 12 ? 18 : 21}
        weight="800"
        color={BRAND.white}
        align="center"
        style={{ flex: 1 }}
        lines={1}
        header
      >
        {cuenta ? `Cuenta ${cuenta.name}` : 'Cuenta'}
      </T>

      <Pressable
        onPress={() => cuenta && nav.navigate('AccountForm', { accountId: cuenta.id })}
        accessibilityRole="button"
        accessibilityLabel={`Editar cuenta ${cuenta?.name ?? ''}`}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 40,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Pencil size={22} color={BRAND.white} strokeWidth={2.3} />
      </Pressable>

      <Pressable
        onPress={() => setHoja(true)}
        accessibilityRole="button"
        accessibilityLabel={`Más acciones para cuenta ${cuenta?.name ?? ''}`}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 32,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <EllipsisVertical size={22} color={BRAND.white} strokeWidth={2.4} />
      </Pressable>
    </View>
  );

  const Panel = ({ children }: { children: React.ReactNode }) => (
    <View
      style={{
        flex: 1,
        backgroundColor: C.fondo,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
      }}
    >
      {children}
    </View>
  );

  // --- Estados de borde ---------------------------------------------------
  if (noExiste) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <Panel>
          <View style={{ padding: space(5) }}>
            <T size={20} weight="800" header>
              No encontramos esta cuenta.
            </T>
            <Sep />
            <BotonCTA label="Volver a Mis cuentas" onPress={() => nav.goBack()} />
          </View>
        </Panel>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <Panel>
          <View style={{ padding: space(5) }}>
            <T size={20} weight="800" header>
              No pudimos cargar los movimientos de esta cuenta.
            </T>
            <Sep />
            <BotonCTA label="Intentar de nuevo" onPress={cargar} />
          </View>
        </Panel>
      </View>
    );
  }

  if (!cuenta || rows === null) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <Panel>
          <View style={{ padding: space(5) }}>
            <Skeleton height={190} radius={radius.lg} />
            <Sep />
            <Skeleton height={46} radius={radius.pill} />
            <Sep h={3} />
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ marginBottom: space(2.5) }}>
                <Skeleton height={68} radius={radius.md} />
              </View>
            ))}
          </View>
        </Panel>
      </View>
    );
  }

  const Icon = TIPO_ICON[cuenta.type];

  // --- Fila de movimiento --------------------------------------------------
  const Movimiento = ({ tx }: { tx: TransactionRow }) => {
    // En un traslado, lo que importa es si entro o salio DE ESTA cuenta.
    const entra = tx.type === 'transfer' && tx.to_account_id === accountId;
    const dir = directionOf(tx);
    const positivo = dir === 'income' || entra;
    const color = positivo
      ? BRAND.turquoiseDark
      : dir === 'saving'
        ? BRAND.yellow
        : BRAND.coral;
    const fondo = positivo
      ? BRAND.paleTurquoise
      : dir === 'saving'
        ? BRAND.paleYellow
        : BRAND.paleCoral;
    const MovIcon = entra ? ArrowDownToLine : iconoDe(tx);
    const nombre = tx.category_name ?? tx.debt_name ?? tx.note ?? typeLabel(tx);
    const fecha = new Date(tx.occurred_day + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <Pressable
        onPress={() => nav.navigate('TransactionEdit', { transactionId: tx.id })}
        onLongPress={() => eliminarMovimiento(tx)}
        accessibilityRole="button"
        accessibilityLabel={
          `${nombre}. ${typeLabel(tx)} del ${fecha}. ` +
          `${positivo ? 'Más' : 'Menos'} ${money(tx.amount)} en ${cuenta.name}. Abrir detalle.`
        }
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
          minHeight: 70,
          paddingVertical: space(2.5),
          borderBottomWidth: 1,
          borderBottomColor: C.borde,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: fondo,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MovIcon size={22} color={color} strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={16} weight="700" lines={2}>
            {nombre}
          </T>
          <T size={13} weight="500" color={C.textoSuave} lines={1}>
            {entra ? 'Traslado recibido' : typeLabel(tx)} · {fecha}
          </T>
        </View>
        <T size={16} weight="800" color={color} lines={1}>
          {positivo ? '+' : '−'}
          {money(tx.amount)}
        </T>
        <ChevronRight size={19} color={C.textoSuave} strokeWidth={2.4} />
      </Pressable>
    );
  };

  const Metrica = ({
    Icono,
    label,
    valor,
    color,
    signo,
  }: {
    Icono: typeof ArrowUpRight;
    label: string;
    valor: number;
    color: string;
    signo: '+' | '−';
  }) => (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space(2.5) }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icono size={20} color={BRAND.white} strokeWidth={2.8} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={12.5} weight="500" color={C.textoSuave} lines={1}>
          {label}
        </T>
        <T size={money(valor).length > 10 ? 14 : 16} weight="800" color={color} lines={1}>
          {signo}
          {money(valor)}
        </T>
      </View>
    </View>
  );

  const Encabezado = () => (
    <View style={{ paddingHorizontal: space(5), paddingTop: space(5) }}>
      {/* Identidad y saldo */}
      <View
        style={{
          backgroundColor: BRAND.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.borde,
          padding: space(4),
        }}
        accessible
        accessibilityLabel={
          `Cuenta ${cuenta.name}. ${TIPO_LABEL[cuenta.type]}. ` +
          `${esTarjeta ? 'Debes' : 'Saldo'} ${money(saldo)}. ` +
          `${archivada ? 'Cuenta archivada' : 'Cuenta activa'}.`
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: cuenta.color + '2E',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={28} color={cuenta.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={19} weight="800" lines={2}>
              {cuenta.name}
            </T>
            <T size={13.5} weight="500" color={C.textoSuave} lines={1}>
              {TIPO_LABEL[cuenta.type]}
            </T>
          </View>
          {/* El estado se escribe, no se deja al color del punto. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(1.5),
              backgroundColor: archivada ? '#EEF0F0' : '#E8F8F0',
              paddingVertical: space(1.5),
              paddingHorizontal: space(2.5),
              borderRadius: radius.pill,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: archivada ? BRAND.mutedDark : '#0A8F5C',
              }}
            />
            <T
              size={11.5}
              weight="700"
              color={archivada ? BRAND.mutedDark : '#0A8F5C'}
            >
              {archivada ? 'Archivada' : 'Activa'}
            </T>
          </View>
        </View>

        <Sep h={3} />
        {esTarjeta && saldo > 0 ? (
          <T size={12.5} weight="600" color={BRAND.coral}>
            Debes
          </T>
        ) : null}
        <T
          size={money(saldo).length > 12 ? 26 : 32}
          weight="800"
          color={esTarjeta && saldo > 0 ? BRAND.coral : C.texto}
          lines={1}
        >
          {money(saldo)}
        </T>

        <Sep h={3} />
        <View style={{ height: 1, backgroundColor: C.borde }} />
        <Sep h={3} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          <Metrica
            Icono={ArrowUpRight}
            label={`Ingresos · ${mes.label.toLowerCase()}`}
            valor={resumen.income}
            color={BRAND.turquoise}
            signo="+"
          />
          <View style={{ width: 1, height: 40, backgroundColor: C.borde }} />
          <Metrica
            Icono={ArrowDownRight}
            label={`Gastos · ${mes.label.toLowerCase()}`}
            valor={resumen.expenses}
            color={BRAND.coral}
            signo="−"
          />
        </View>
      </View>

      {/* Filtros */}
      <Sep h={4} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: space(2.5), alignItems: 'center', height: 46 }}
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
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: space(5),
                borderRadius: radius.pill,
                backgroundColor: activo ? BRAND.turquoise : BRAND.white,
                borderWidth: 1,
                borderColor: activo ? BRAND.turquoise : C.borde,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <T
                size={14.5}
                weight={activo ? '800' : '600'}
                color={activo ? BRAND.navy : C.texto}
              >
                {f.label}
              </T>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setHojaMes(true)}
          accessibilityRole="button"
          accessibilityLabel={`Periodo: ${mes.label}. Cambiar`}
          style={({ pressed }) => ({
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(2),
            paddingHorizontal: space(4),
            borderRadius: radius.pill,
            backgroundColor: BRAND.white,
            borderWidth: 1,
            borderColor: C.borde,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Calendar size={18} color={C.texto} strokeWidth={2.2} />
          <T size={14} weight="600">
            {mes.label}
          </T>
          <ChevronDown size={17} color={C.textoSuave} strokeWidth={2.4} />
        </Pressable>
      </ScrollView>

      <Sep h={4} />
      <T size={21} weight="800" header>
        Movimientos de {cuenta.name}
      </T>
    </View>
  );

  const Vacio = () => (
    <View style={{ padding: space(6), alignItems: 'center' }}>
      <T size={18} weight="800" align="center" header>
        {delMes.length === 0
          ? 'Todavía no hay movimientos en esta cuenta.'
          : 'No encontramos movimientos con este filtro.'}
      </T>
      <Sep h={2} />
      <T size={14.5} weight="500" color={C.textoSuave} align="center">
        {delMes.length === 0
          ? 'Registra un ingreso o un gasto para empezar.'
          : 'Prueba con otro tipo o cambia el mes.'}
      </T>
      <Sep h={5} />
      <View style={{ alignSelf: 'stretch' }}>
        <BotonCTA
          label={delMes.length === 0 ? 'Agregar movimiento' : 'Ver todos'}
          onPress={() => {
            if (delMes.length === 0) setMenuAgregar(true);
            else {
              setFiltro('all');
              animar();
            }
          }}
        />
      </View>
    </View>
  );

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
      accessibilityLabel={`${label} en ${cuenta.name}`}
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
      <Panel>
        <Animated.View style={{ flex: 1, opacity: fade }}>
          <SectionList
            sections={secciones.map((s) => ({ title: s.key, data: s.data }))}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={<Encabezado />}
            ListEmptyComponent={<Vacio />}
            renderSectionHeader={({ section }) => (
              <View style={{ paddingTop: space(3.5), paddingBottom: space(1) }}>
                <T size={14} weight="700" color={C.textoSuave}>
                  {prettyDay(section.title)}
                </T>
              </View>
            )}
            renderItem={({ item }) => <Movimiento tx={item} />}
            contentContainerStyle={{
              paddingHorizontal: space(5),
              paddingBottom: insets.bottom + space(28),
            }}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        </Animated.View>

        {/* Acciones de la cuenta */}
        <View
          style={{
            position: 'absolute',
            left: space(5),
            right: space(5),
            bottom: insets.bottom + space(3),
            flexDirection: 'row',
            backgroundColor: BRAND.white,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: C.borde,
            ...t.shadow,
          }}
        >
          <Pressable
            onPress={() => nav.navigate('AccountForm', { accountId: cuenta.id })}
            accessibilityRole="button"
            accessibilityLabel={`Editar cuenta ${cuenta.name}`}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space(2),
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Pencil size={19} color={C.texto} strokeWidth={2.2} />
            <T size={14.5} weight="700">
              Editar
            </T>
          </Pressable>

          <View style={{ width: 1, marginVertical: space(3), backgroundColor: C.borde }} />

          <Pressable
            onPress={archivada ? restaurar : pedirArchivar}
            disabled={ocupado}
            accessibilityRole="button"
            accessibilityLabel={
              archivada
                ? `Restaurar cuenta ${cuenta.name}`
                : `Archivar cuenta ${cuenta.name}`
            }
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space(2),
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {archivada ? (
              <RotateCcw size={19} color={BRAND.turquoiseDark} strokeWidth={2.3} />
            ) : (
              <Trash2 size={19} color={BRAND.coral} strokeWidth={2.2} />
            )}
            <T
              size={14.5}
              weight="700"
              color={archivada ? BRAND.turquoiseDark : BRAND.coral}
            >
              {archivada ? 'Restaurar' : 'Archivar'}
            </T>
          </Pressable>
        </View>

        {/* Agregar movimiento, con esta cuenta ya elegida */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            setMenuAgregar(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Agregar movimiento en ${cuenta.name}`}
          style={({ pressed }) => ({
            position: 'absolute',
            right: space(5),
            bottom: insets.bottom + space(19),
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: BRAND.turquoise,
            alignItems: 'center',
            justifyContent: 'center',
            transform: pressed && !t.reduceMotion ? [{ scale: 0.98 }] : undefined,
            opacity: pressed ? 0.9 : 1,
            ...t.shadow,
          })}
        >
          <Plus size={30} color={BRAND.navy} strokeWidth={3} />
        </Pressable>
      </Panel>

      {/* Hoja: mes */}
      <Modal
        visible={hojaMes}
        transparent
        animationType={t.reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setHojaMes(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#07121BA8' }}
          onPress={() => setHojaMes(false)}
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
            ¿Qué mes quieres ver?
          </T>
          <Sep h={3} />
          <ScrollView>
            {meses.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => {
                  setMes(m);
                  setHojaMes(false);
                  animar();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: m.key === mes.key }}
                accessibilityLabel={m.label}
                style={({ pressed }) => ({
                  minHeight: 54,
                  justifyContent: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: C.borde,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <T size={16} weight={m.key === mes.key ? '800' : '600'}>
                  {m.key === mes.key ? '✓  ' : ''}
                  {m.label}
                </T>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Hoja: acciones */}
      <Modal
        visible={hoja}
        transparent
        animationType={t.reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setHoja(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#07121BA8' }}
          onPress={() => setHoja(false)}
          accessibilityLabel="Cerrar"
        />
        <View
          style={{
            backgroundColor: BRAND.white,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: space(5),
            paddingTop: space(3),
            paddingBottom: insets.bottom + space(5),
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 48,
              height: 5,
              borderRadius: 3,
              backgroundColor: C.borde,
            }}
          />
          <Sep h={4} />
          <T size={19} weight="800" lines={2}>
            {cuenta.name}
          </T>
          <T size={14} weight="500" color={C.textoSuave}>
            {TIPO_LABEL[cuenta.type]}
          </T>
          <Sep h={4} />
          <OpcionMenu
            label="Editar cuenta"
            color={C.texto}
            onPress={() => {
              setHoja(false);
              nav.navigate('AccountForm', { accountId: cuenta.id });
            }}
          />
          <OpcionMenu
            label={archivada ? 'Restaurar cuenta' : 'Archivar cuenta'}
            color={archivada ? BRAND.turquoiseDark : BRAND.coral}
            onPress={() => {
              setHoja(false);
              if (archivada) restaurar();
              else pedirArchivar();
            }}
          />
        </View>
      </Modal>

      {/* Hoja: registrar */}
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
          <T size={13} weight="600" color={C.textoSuave} style={{ paddingHorizontal: space(4) }}>
            En {cuenta.name}
          </T>
          <Sep h={1} />
          <OpcionMenu
            label="Registrar gasto"
            color={BRAND.coral}
            onPress={() => {
              setMenuAgregar(false);
              nav.navigate('QuickAdd', { type: 'expense', accountId: cuenta.id });
            }}
          />
          <OpcionMenu
            label="Registrar ingreso"
            color={BRAND.turquoiseDark}
            onPress={() => {
              setMenuAgregar(false);
              nav.navigate('QuickAdd', { type: 'income', accountId: cuenta.id });
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
