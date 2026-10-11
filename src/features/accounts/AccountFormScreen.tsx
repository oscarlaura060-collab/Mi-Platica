import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Landmark,
  PiggyBank,
  Search,
  Smartphone,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import {
  createAccount,
  getAccount,
  listAccounts,
  updateAccount,
} from '@/db/repositories/accounts';
import {
  findInstitution,
  searchInstitutions,
  type AccountKind,
  type Institution,
} from '@/domain/accounts/institutions';
import { formatThousands, money, parseMoneyInput } from '@/utils/money';
import { C, T } from '@/features/coach/income/parts';
import type { AccountType } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

const COLORES = [
  { id: 'turquoise', token: BRAND.turquoise },
  { id: 'purple', token: '#8B5CF6' },
  { id: 'yellow', token: BRAND.yellow },
  { id: 'coral', token: BRAND.coral },
  { id: 'green', token: '#10B981' },
  { id: 'navy', token: BRAND.navySoft },
];

/**
 * Los cuatro sitios donde la gente guarda plata.
 *
 * El diseño pide empezar por Banco o Billetera. Se añaden Efectivo y
 * Tarjeta porque ya existen en la app y son de lo mas usado aqui:
 * dejarlos fuera seria quitar funciones que ya servian.
 */
const TIPOS: {
  type: AccountType;
  kind: AccountKind | null;
  label: string;
  sub: string;
  Icon: typeof Landmark;
}[] = [
  { type: 'bank', kind: 'bank', label: 'Banco', sub: 'Cuenta bancaria tradicional', Icon: Landmark },
  { type: 'wallet', kind: 'wallet', label: 'Billetera', sub: 'Billetera digital', Icon: Smartphone },
  { type: 'cash', kind: null, label: 'Efectivo', sub: 'Dinero en mano', Icon: Banknote },
  {
    type: 'credit_card',
    kind: null,
    label: 'Tarjeta',
    sub: 'Tarjeta de crédito',
    Icon: CreditCard,
  },
];

/**
 * AGREGAR / EDITAR CUENTA
 *
 * Una sola pantalla y un solo formulario para los dos modos. Primero se
 * pregunta DONDE esta la plata (banco, billetera, efectivo o tarjeta) y
 * solo despues se piden los detalles: preguntar el nombre antes de saber
 * el tipo obliga a pensar al reves.
 *
 * Mi Platica no se conecta con ningun banco. Elegir "Bancolombia" solo
 * le pone nombre y color a una cuenta que el usuario lleva a mano.
 *
 * El icono de la cuenta NO se elige aparte: sale del tipo. Un selector
 * suelto dejaria poner un chanchito a una tarjeta de credito, y la
 * pantalla de Mis cuentas quedaria mintiendo.
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
 * Campo de texto.
 *
 * Va FUERA de la pantalla a proposito: definido adentro, React lo veia
 * como un componente nuevo en cada render, desmontaba el TextInput y el
 * teclado se cerraba despues de cada tecla.
 */
function Campo(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={C.textoSuave}
      selectionColor={BRAND.turquoise}
      {...props}
      style={[
        {
          minHeight: 56,
          backgroundColor: BRAND.white,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: C.borde,
          paddingHorizontal: space(4),
          color: C.texto,
          fontSize: 16.5,
          fontWeight: '600',
        },
        props.style,
      ]}
    />
  );
}

export function AccountFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const editingId = useRoute<RouteProp<RootStackParamList, 'AccountForm'>>().params
    ?.accountId;
  const { refresh } = useAppStore();

  const [type, setType] = useState<AccountType | null>(editingId ? null : null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [otraEntidad, setOtraEntidad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [name, setName] = useState('');
  const [saldoTexto, setSaldoTexto] = useState('');
  const [color, setColor] = useState<string>(BRAND.turquoise);
  const [inTotal, setInTotal] = useState(true);
  const [nombresUsados, setNombresUsados] = useState<string[]>([]);

  // Campos exclusivos de tarjeta de credito
  const [creditLimitTexto, setCreditLimitTexto] = useState('');
  const [statementDay, setStatementDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [cardRate, setCardRate] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esTarjeta = type === 'credit_card';
  const institucion = findInstitution(institutionId);
  const kind = TIPOS.find((x) => x.type === type)?.kind ?? null;
  const necesitaEntidad = kind !== null;
  const saldo = parseMoneyInput(saldoTexto);

  useEffect(() => {
    listAccounts(true).then((rows) =>
      setNombresUsados(
        rows.filter((r) => r.id !== editingId).map((r) => r.name.trim().toLowerCase()),
      ),
    );
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    getAccount(editingId).then((a) => {
      if (!a) return;
      setType(a.type);
      setInstitutionId(a.provider_key);
      setName(a.name);
      setColor(a.color);
      // La tarjeta guarda la deuda en negativo; en pantalla va en
      // positivo porque "debo 250.000" es lo natural de leer.
      const cents =
        a.type === 'credit_card' ? Math.abs(a.initial_balance) : a.initial_balance;
      setSaldoTexto(cents ? formatThousands(String(Math.round(cents / 100))) : '');
      setInTotal(a.include_in_total === 1);
      setCreditLimitTexto(
        a.credit_limit ? formatThousands(String(Math.round(a.credit_limit / 100))) : '',
      );
      setStatementDay(a.statement_day ? String(a.statement_day) : '');
      setPaymentDueDay(a.payment_due_day ? String(a.payment_due_day) : '');
      setCardRate(a.card_rate_bp ? String(a.card_rate_bp / 100) : '');
    });
  }, [editingId]);

  const entidades = useMemo(
    () => (kind ? searchInstitutions(kind, busqueda) : []),
    [kind, busqueda],
  );

  function elegirTipo(nuevo: AccountType) {
    if (nuevo === type) return;
    setType(nuevo);
    setError(null);
    // Solo se limpia lo que deja de tener sentido. El nombre, el saldo y
    // el color escritos a mano se conservan.
    setInstitutionId(null);
    setBusqueda('');
    Haptics.selectionAsync().catch(() => undefined);
  }

  function elegirEntidad(i: Institution) {
    setInstitutionId(i.id);
    setColor(i.color);
    setError(null);
    // El nombre se precarga, pero se puede cambiar: "Nequi personal".
    if (!name.trim() || findInstitution(institutionId)?.name === name) {
      setName(i.isOther ? '' : i.name);
    }
    Haptics.selectionAsync().catch(() => undefined);
  }

  const nombreFinal = institucion?.isOther ? otraEntidad.trim() || name.trim() : name.trim();
  const duplicado = nombreFinal
    ? nombresUsados.includes(nombreFinal.toLowerCase())
    : false;

  function validar(): string | null {
    if (!type) return 'Elige si es un banco, una billetera, efectivo o una tarjeta.';
    if (necesitaEntidad && !institutionId) return 'Selecciona dónde tienes tu plata.';
    if (institucion?.isOther && otraEntidad.trim().length < 2) {
      return 'Escribe el nombre de la entidad.';
    }
    if (!nombreFinal) return 'Escribe un nombre para la cuenta.';
    if (saldo < 0) return 'Ingresa un saldo válido.';
    return null;
  }

  async function guardar() {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        name: nombreFinal,
        type: type!,
        provider_key: institutionId,
        color,
        emoji: null,
        // Clave del libro: la deuda de tarjeta va NEGATIVA.
        initial_balance: esTarjeta ? -Math.abs(saldo) : saldo,
        include_in_total: (inTotal ? 1 : 0) as 0 | 1,
        credit_limit: esTarjeta ? parseMoneyInput(creditLimitTexto) || null : null,
        statement_day: statementDay
          ? Math.min(31, Math.max(1, Number(statementDay)))
          : null,
        payment_due_day: paymentDueDay
          ? Math.min(31, Math.max(1, Number(paymentDueDay)))
          : null,
        card_rate_bp: cardRate ? Math.round(Number(cardRate.replace(',', '.')) * 100) : 0,
      };
      if (editingId) await updateAccount(editingId, payload);
      else await createAccount(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await refresh();
      nav.goBack();
    } catch {
      setError('No pudimos guardar la cuenta. Tus datos no se modificaron.');
    } finally {
      setGuardando(false);
    }
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
          {editingId ? 'Editar cuenta' : 'Agregar cuenta'}
        </T>
      </View>

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
          {!editingId ? (
            <>
              <T size={23} weight="800" align="center" header>
                Dale un lugar a tu plata
              </T>
              <Sep h={1.5} />
              <T size={15} weight="500" color={C.textoSuave} align="center">
                Registra una cuenta para tener todo más claro.
              </T>
              <Sep h={5} />
            </>
          ) : null}

          {/* Paso 1 · tipo */}
          <Etiqueta>¿Qué tipo de cuenta quieres agregar?</Etiqueta>
          <Sep h={1} />
          <T size={13.5} weight="500" color={C.textoSuave}>
            Elige dónde tienes guardada tu plata.
          </T>
          <Sep h={3} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
            {TIPOS.map((o) => {
              const activo = type === o.type;
              return (
                <Pressable
                  key={o.type}
                  onPress={() => elegirTipo(o.type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={`Tipo de cuenta. ${o.label}${activo ? ' seleccionada' : ''}. ${o.sub}`}
                  style={({ pressed }) => ({
                    width: '47%',
                    flexGrow: 1,
                    minHeight: 112,
                    padding: space(3.5),
                    borderRadius: radius.lg,
                    backgroundColor: activo ? BRAND.paleTurquoise : BRAND.white,
                    borderWidth: activo ? 2 : 1,
                    borderColor: activo ? BRAND.turquoise : C.borde,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}
                  >
                    <o.Icon
                      size={26}
                      color={activo ? BRAND.turquoiseDark : C.texto}
                      strokeWidth={2.2}
                    />
                    {/* El check hace que la seleccion no dependa del color. */}
                    {activo ? (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: BRAND.turquoise,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 'auto',
                        }}
                      >
                        <Check size={15} color={BRAND.navy} strokeWidth={3.4} />
                      </View>
                    ) : null}
                  </View>
                  <Sep h={2} />
                  <T size={16} weight="800" color={activo ? BRAND.turquoiseDark : C.texto}>
                    {o.label}
                  </T>
                  <T size={12.5} weight="500" color={C.textoSuave} lines={2}>
                    {o.sub}
                  </T>
                </Pressable>
              );
            })}
          </View>

          {/* Paso 2 · entidad */}
          {necesitaEntidad ? (
            <>
              <Sep h={5} />
              <Etiqueta>¿Dónde tienes tu plata?</Etiqueta>
              <Sep h={2.5} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(2.5),
                  backgroundColor: BRAND.white,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: C.borde,
                  paddingHorizontal: space(4),
                  minHeight: 54,
                }}
              >
                <Search size={20} color={C.textoSuave} strokeWidth={2.2} />
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar banco o billetera"
                  placeholderTextColor={C.textoSuave}
                  selectionColor={BRAND.turquoise}
                  accessibilityLabel="Buscar banco o billetera"
                  style={{
                    flex: 1,
                    color: C.texto,
                    fontSize: 15.5,
                    fontWeight: '600',
                    paddingVertical: space(3),
                  }}
                />
              </View>
              <Sep h={2.5} />

              <View
                style={{
                  backgroundColor: BRAND.white,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: C.borde,
                  paddingHorizontal: space(4),
                }}
              >
                {entidades.map((i, n) => {
                  const activo = institutionId === i.id;
                  return (
                    <Pressable
                      key={i.id}
                      onPress={() => elegirEntidad(i)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={`${i.name}. ${kind === 'bank' ? 'Banco' : 'Billetera digital'}. Seleccionar.`}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space(3),
                        minHeight: 56,
                        borderBottomWidth: n === entidades.length - 1 ? 0 : 1,
                        borderBottomColor: C.borde,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: i.color,
                        }}
                      />
                      <T size={15.5} weight={activo ? '800' : '600'} style={{ flex: 1 }}>
                        {i.name}
                      </T>
                      {activo ? (
                        <Check size={20} color={BRAND.turquoiseDark} strokeWidth={3} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {institucion?.isOther ? (
                <>
                  <Sep h={3} />
                  <Etiqueta>Nombre de la entidad</Etiqueta>
                  <Sep h={2} />
                  <Campo
                    value={otraEntidad}
                    onChangeText={(v) => {
                      setOtraEntidad(v);
                      setError(null);
                    }}
                    placeholder="Escribe el nombre"
                    accessibilityLabel="Nombre de la entidad"
                    maxLength={40}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {/* Nombre */}
          {type ? (
            <>
              <Sep h={5} />
              <Etiqueta>Nombre de la cuenta</Etiqueta>
              <Sep h={2} />
              <Campo
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setError(null);
                }}
                placeholder={kind === 'wallet' ? 'Ej. Nequi' : 'Ej. Bancolombia'}
                accessibilityLabel="Nombre de la cuenta"
                maxLength={40}
              />
              {duplicado ? (
                <>
                  <Sep h={1.5} />
                  <T size={13} weight="600" color={BRAND.coral}>
                    Ya tienes una cuenta con ese nombre. Puedes usar otro para
                    distinguirla.
                  </T>
                </>
              ) : null}

              {/* Saldo */}
              <Sep h={4} />
              <Etiqueta>{esTarjeta ? '¿Cuánto debes hoy?' : 'Saldo actual'}</Etiqueta>
              <Sep h={2} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(2),
                  minHeight: 62,
                  backgroundColor: BRAND.white,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: C.borde,
                  paddingHorizontal: space(4),
                }}
              >
                <T size={24} weight="800" color={C.texto}>
                  $
                </T>
                <TextInput
                  value={saldoTexto}
                  onChangeText={(v) => {
                    setSaldoTexto(formatThousands(v));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="0"
                  placeholderTextColor={C.textoSuave}
                  selectionColor={BRAND.turquoise}
                  accessibilityLabel={`${esTarjeta ? 'Deuda actual' : 'Saldo actual'}. ${money(saldo)}.`}
                  style={{
                    flex: 1,
                    color: C.texto,
                    fontSize: 24,
                    fontWeight: '800',
                    paddingVertical: 0,
                  }}
                />
              </View>
              <Sep h={1.5} />
              <T size={13} weight="500" color={C.textoSuave}>
                {esTarjeta
                  ? 'Lo que le debes al banco hoy. Puedes actualizarlo después.'
                  : 'Puedes actualizarlo después. Es el punto de partida para organizar tus movimientos.'}
              </T>

              {/* Tarjeta de credito */}
              {esTarjeta ? (
                <>
                  <Sep h={4} />
                  <Etiqueta>Datos de la tarjeta</Etiqueta>
                  <Sep h={2} />
                  <Campo
                    value={creditLimitTexto}
                    onChangeText={(v) => setCreditLimitTexto(formatThousands(v))}
                    keyboardType="number-pad"
                    placeholder="Cupo total"
                    accessibilityLabel="Cupo total de la tarjeta"
                  />
                  <Sep h={2.5} />
                  <View style={{ flexDirection: 'row', gap: space(2.5) }}>
                    <Campo
                      value={statementDay}
                      onChangeText={setStatementDay}
                      keyboardType="number-pad"
                      placeholder="Día de corte"
                      maxLength={2}
                      accessibilityLabel="Día de corte"
                      style={{ flex: 1 }}
                    />
                    <Campo
                      value={paymentDueDay}
                      onChangeText={setPaymentDueDay}
                      keyboardType="number-pad"
                      placeholder="Día de pago"
                      maxLength={2}
                      accessibilityLabel="Día límite de pago"
                      style={{ flex: 1 }}
                    />
                  </View>
                  <Sep h={2.5} />
                  <Campo
                    value={cardRate}
                    onChangeText={setCardRate}
                    keyboardType="decimal-pad"
                    placeholder="Tasa mensual %"
                    accessibilityLabel="Tasa mensual en porcentaje"
                  />
                </>
              ) : null}

              {/* Color */}
              <Sep h={4} />
              <Etiqueta>Color de la cuenta</Etiqueta>
              <Sep h={2.5} />
              <View style={{ flexDirection: 'row', gap: space(3), flexWrap: 'wrap' }}>
                {COLORES.map((c) => {
                  const activo = color.toLowerCase() === c.token.toLowerCase();
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setColor(c.token);
                        Haptics.selectionAsync().catch(() => undefined);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={`Color ${c.id}${activo ? ', seleccionado' : ''}`}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: c.token,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: activo ? 3 : 1,
                        borderColor: activo ? BRAND.ink : C.borde,
                      }}
                    >
                      {activo ? (
                        <Check size={24} color={BRAND.white} strokeWidth={3.4} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Disponibilidad */}
              <Sep h={4} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(3),
                  minHeight: 64,
                  backgroundColor: BRAND.white,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: C.borde,
                  paddingHorizontal: space(4),
                  paddingVertical: space(3),
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={15.5} weight="700">
                    Contar en mi dinero total
                  </T>
                  <T size={12.5} weight="500" color={C.textoSuave}>
                    Si lo apagas, la cuenta sigue existiendo pero no suma al total.
                  </T>
                </View>
                <Switch
                  value={inTotal}
                  onValueChange={setInTotal}
                  trackColor={{ true: BRAND.turquoise, false: BRAND.borderLight }}
                  accessibilityLabel={`Contar en mi dinero total. ${inTotal ? 'Activado' : 'Desactivado'}`}
                />
              </View>
            </>
          ) : null}

          {error ? (
            <>
              <Sep h={3} />
              <T size={13.5} weight="600" color={BRAND.coral}>
                {error}
              </T>
            </>
          ) : null}

          {/* Guardar */}
          <Sep h={5} />
          <Pressable
            onPress={guardar}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel={editingId ? 'Guardar cambios' : 'Guardar cuenta'}
            accessibilityState={{ disabled: guardando }}
            style={({ pressed }) => ({
              minHeight: 58,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: BRAND.turquoise,
              opacity: guardando ? 0.6 : pressed ? 0.88 : 1,
            })}
          >
            <T size={17} weight="800" color={BRAND.navy}>
              {guardando
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Guardar cuenta'}
            </T>
          </Pressable>
          <Sep h={3} />
          <T size={13.5} weight="500" color={C.textoSuave} align="center">
            Tus movimientos quedarán organizados aquí.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
