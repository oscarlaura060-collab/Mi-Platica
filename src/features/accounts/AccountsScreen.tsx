import React, { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  CreditCard,
  EllipsisVertical,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import {
  accountMovementCount,
  archiveAccount,
  deleteOrArchiveAccount,
  listAccounts,
  restoreAccount,
} from '@/db/repositories/accounts';
import { BotonCTA, C, T } from '@/features/coach/income/parts';
import type { RootNav } from '@/app/navigation/types';
import type { AccountBalance, AccountType } from '@/db/types';

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

/**
 * MIS CUENTAS
 *
 * Donde esta tu plata y en que esta repartida.
 *
 * La regla que manda aqui es que nadie pierda su historial sin saberlo:
 * una cuenta con movimientos NO se borra, se archiva. Archivar la saca
 * de los selectores y del total, pero sus movimientos siguen intactos.
 * Solo una cuenta sin un solo movimiento se puede borrar de verdad, y
 * aun asi se pregunta antes.
 *
 * El total suma SOLO cuentas activas y deja fuera las tarjetas de
 * credito: el cupo de una tarjeta no es plata tuya.
 */
export function AccountsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { refresh } = useAppStore();

  const [cuentas, setCuentas] = useState<AccountBalance[] | null>(null);
  const [error, setError] = useState(false);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [hoja, setHoja] = useState<AccountBalance | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrada = useRef(new Animated.Value(0)).current;

  const cargar = useCallback(async () => {
    try {
      setError(false);
      setCuentas(await listAccounts(true));
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  React.useEffect(() => {
    if (!cuentas) return;
    if (t.reduceMotion) {
      entrada.setValue(1);
      return;
    }
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cuentas, entrada, t.reduceMotion]);

  const activas = (cuentas ?? []).filter((a) => a.archived === 0);
  const archivadas = (cuentas ?? []).filter((a) => a.archived === 1);

  // El total deja fuera las tarjetas: su saldo es deuda, no plata tuya.
  const total = activas
    .filter((a) => a.type !== 'credit_card' && a.include_in_total === 1)
    .reduce((s, a) => s + a.balance, 0);

  // --- Acciones -----------------------------------------------------------
  async function pedirArchivar(c: AccountBalance) {
    Alert.alert(
      'Archivar cuenta',
      `${c.name} dejará de aparecer para movimientos nuevos y no sumará a tu total. ` +
        'Sus movimientos no se borran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar cuenta',
          onPress: async () => {
            setOcupado(true);
            try {
              await archiveAccount(c.id);
              await Promise.all([cargar(), refresh()]);
            } finally {
              setOcupado(false);
            }
          },
        },
      ],
    );
  }

  async function pedirEliminar(c: AccountBalance) {
    if (ocupado) return;
    setOcupado(true);
    let n = 0;
    try {
      n = await accountMovementCount(c.id);
    } finally {
      setOcupado(false);
    }

    // Con movimientos NO se ofrece borrar: se ofrece archivar, que es lo
    // que de verdad quiere alguien que ya no usa una cuenta.
    if (n > 0) {
      Alert.alert(
        'Esta cuenta tiene movimientos asociados',
        `${c.name} tiene ${n} ${n === 1 ? 'movimiento' : 'movimientos'}. ` +
          'Para conservar tu historial, te recomendamos archivarla.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Archivar cuenta', onPress: () => pedirArchivar(c) },
        ],
      );
      return;
    }

    Alert.alert(
      '¿Eliminar esta cuenta?',
      'Esta cuenta no tiene movimientos asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setOcupado(true);
            try {
              await deleteOrArchiveAccount(c.id);
              await Promise.all([cargar(), refresh()]);
            } finally {
              setOcupado(false);
            }
          },
        },
      ],
    );
  }

  async function restaurar(c: AccountBalance) {
    setOcupado(true);
    try {
      await restoreAccount(c.id);
      await Promise.all([cargar(), refresh()]);
    } finally {
      setOcupado(false);
    }
  }

  const Sep = ({ h = 4 }: { h?: number }) => <View style={{ height: space(h) }} />;

  // --- Cabecera ------------------------------------------------------------
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
      <T size={25} weight="800" color={BRAND.white} style={{ flex: 1 }} lines={1} header>
        Mis cuentas
      </T>

      <Pressable
        onPress={() => nav.navigate('AccountForm', {})}
        accessibilityRole="button"
        accessibilityLabel="Agregar cuenta"
        style={({ pressed }) => ({
          alignItems: 'center',
          minWidth: 56,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: BRAND.turquoise,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={26} color={BRAND.navy} strokeWidth={3} />
        </View>
        <T size={12.5} weight="700" color={BRAND.white}>
          Agregar
        </T>
      </Pressable>
    </View>
  );

  // --- Tarjeta de cuenta ----------------------------------------------------
  const Tarjeta = ({ c }: { c: AccountBalance }) => {
    const Icon = TIPO_ICON[c.type];
    // En una tarjeta de credito el saldo negativo es lo que debes.
    const esTarjeta = c.type === 'credit_card';
    const valor = esTarjeta ? Math.max(-c.balance, 0) : c.balance;

    return (
      <Pressable
        onPress={() => nav.navigate('AccountDetail', { accountId: c.id })}
        accessibilityRole="button"
        accessibilityLabel={
          `${c.name}. ${TIPO_LABEL[c.type]}. ` +
          `${esTarjeta ? 'Debes' : 'Saldo'} ${money(valor)}. Abrir detalle.`
        }
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(2.5),
          minHeight: 84,
          backgroundColor: BRAND.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.borde,
          paddingVertical: space(3),
          paddingLeft: space(3),
          paddingRight: space(1),
          marginBottom: space(3),
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.color + '2E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={23} color={c.color} strokeWidth={2.2} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={16} weight="800" lines={1}>
            {c.name}
          </T>
          <T size={12.5} weight="500" color={C.textoSuave} lines={1}>
            {TIPO_LABEL[c.type]}
          </T>
        </View>

        {/* El monto y su etiqueta van en columna propia: en una sola fila
            con el nombre, el icono y los dos botones no cabian y el
            nombre terminaba partido en dos lineas. Para una tarjeta,
            "Debes" va escrito encima y no solo en el color. */}
        <View style={{ alignItems: 'flex-end', maxWidth: '42%' }}>
          {esTarjeta && valor > 0 ? (
            <T size={11.5} weight="600" color={BRAND.coral}>
              Debes
            </T>
          ) : null}
          <T
            size={money(valor).length > 10 ? 14 : 16.5}
            weight="800"
            color={esTarjeta && valor > 0 ? BRAND.coral : C.texto}
            lines={1}
          >
            {money(valor)}
          </T>
        </View>

        <Pressable
          onPress={() => nav.navigate('AccountForm', { accountId: c.id })}
          accessibilityRole="button"
          accessibilityLabel={`Editar cuenta ${c.name}`}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 34,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Pencil size={19} color={C.textoSuave} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            setHoja(c);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Más acciones para cuenta ${c.name}`}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 28,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <EllipsisVertical size={19} color={C.textoSuave} strokeWidth={2.4} />
        </Pressable>
      </Pressable>
    );
  };

  const FilaArchivada = ({ c }: { c: AccountBalance }) => {
    const Icon = TIPO_ICON[c.type];
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3.5),
          minHeight: 76,
          backgroundColor: '#EEF0F0',
          borderRadius: radius.lg,
          paddingVertical: space(3),
          paddingHorizontal: space(3.5),
          marginBottom: space(3),
        }}
        accessible
        accessibilityLabel={`${c.name}. ${TIPO_LABEL[c.type]}. Archivada.`}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#DDE1E1',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={25} color={BRAND.mutedDark} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={17} weight="800" color={BRAND.mutedDark} lines={2}>
            {c.name}
          </T>
          <T size={13.5} weight="500" color={BRAND.mutedDark} lines={1}>
            {TIPO_LABEL[c.type]}
          </T>
        </View>

        {/* La etiqueta dice "Archivada" con palabras: el gris no basta. */}
        <View
          style={{
            backgroundColor: '#DDE1E1',
            paddingVertical: space(1.5),
            paddingHorizontal: space(3),
            borderRadius: radius.pill,
          }}
        >
          <T size={12.5} weight="700" color={BRAND.mutedDark}>
            Archivada
          </T>
        </View>

        <Pressable
          onPress={() => restaurar(c)}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityLabel={`Restaurar cuenta ${c.name}`}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <RotateCcw size={20} color={BRAND.turquoiseDark} strokeWidth={2.3} />
        </Pressable>
      </View>
    );
  };

  // --- Contenido -------------------------------------------------------------
  const Panel = ({ children }: { children: React.ReactNode }) => (
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
    >
      {children}
    </ScrollView>
  );

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <Panel>
          <T size={20} weight="800" header>
            No pudimos cargar tus cuentas.
          </T>
          <Sep />
          <BotonCTA label="Intentar de nuevo" onPress={cargar} />
        </Panel>
      </View>
    );
  }

  if (!cuentas) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
        <Cabecera />
        <Panel>
          <Skeleton height={132} radius={radius.lg} />
          <Sep h={5} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginBottom: space(3) }}>
              <Skeleton height={84} radius={radius.lg} />
            </View>
          ))}
        </Panel>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
      <Cabecera />
      <Panel>
        <Animated.View style={{ opacity: entrada }}>
          {/* Resumen */}
          <View
            style={{
              backgroundColor: BRAND.navy,
              borderRadius: radius.lg,
              padding: space(5),
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(3),
            }}
            accessible
            accessibilityLabel={
              `Tu dinero está en ${money(total)}, distribuido en ${activas.length} ` +
              `${activas.length === 1 ? 'cuenta activa' : 'cuentas activas'}.`
            }
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={15} weight="500" color={BRAND.mutedLight}>
                Tu dinero está en
              </T>
              <Sep h={1} />
              <T
                size={money(total).length > 12 ? 28 : 34}
                weight="800"
                color={BRAND.white}
                lines={1}
              >
                {money(total)}
              </T>
              <Sep h={1} />
              <T size={14} weight="500" color={BRAND.mutedLight}>
                En {activas.length}{' '}
                {activas.length === 1 ? 'cuenta activa' : 'cuentas activas'}
              </T>
            </View>
            <PiggyBank size={56} color={BRAND.yellow} strokeWidth={1.6} />
          </View>

          {activas.length === 0 && archivadas.length === 0 ? (
            <>
              <Sep h={7} />
              <T size={20} weight="800" align="center" header>
                Todavía no tienes cuentas
              </T>
              <Sep h={2} />
              <T size={14.5} weight="500" color={C.textoSuave} align="center">
                Agrega tu primera cuenta para comenzar a organizar tu plata.
              </T>
              <Sep h={5} />
              <BotonCTA
                label="Agregar cuenta"
                onPress={() => nav.navigate('AccountForm', {})}
              />
            </>
          ) : (
            <>
              <Sep h={5} />
              <T size={21} weight="800" header>
                Cuentas activas
              </T>
              <Sep h={3} />
              {activas.map((c) => (
                <Tarjeta key={c.id} c={c} />
              ))}

              <Pressable
                onPress={() => nav.navigate('AccountForm', {})}
                accessibilityRole="button"
                accessibilityLabel="Agregar cuenta"
                style={({ pressed }) => ({
                  minHeight: 56,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: space(2.5),
                  borderRadius: radius.lg,
                  borderWidth: 2,
                  borderColor: BRAND.turquoise,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Plus size={22} color={BRAND.turquoiseDark} strokeWidth={2.8} />
                <T size={16.5} weight="800" color={BRAND.turquoiseDark}>
                  Agregar cuenta
                </T>
              </Pressable>

              {archivadas.length > 0 ? (
                <>
                  <Sep h={6} />
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: space(2),
                    }}
                  >
                    <T size={21} weight="800" style={{ flex: 1 }} lines={1}>
                      Cuentas archivadas
                    </T>
                    <Pressable
                      onPress={() => setVerArchivadas((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        verArchivadas ? 'Ocultar archivadas' : 'Ver archivadas'
                      }
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
                        {verArchivadas ? 'Ocultar' : 'Ver archivadas'}
                      </T>
                      <ChevronRight
                        size={17}
                        color={BRAND.turquoiseDark}
                        strokeWidth={2.6}
                      />
                    </Pressable>
                  </View>
                  <Sep h={3} />
                  {(verArchivadas ? archivadas : archivadas.slice(0, 1)).map((c) => (
                    <FilaArchivada key={c.id} c={c} />
                  ))}
                  <T size={12.5} weight="500" color={C.textoSuave}>
                    Una cuenta archivada conserva todos sus movimientos. Solo deja de
                    ofrecerse para registrar cosas nuevas.
                  </T>
                </>
              ) : null}
            </>
          )}
        </Animated.View>
      </Panel>

      {/* Hoja de acciones */}
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
            {hoja?.name}
          </T>
          <T size={14} weight="500" color={C.textoSuave}>
            {hoja ? TIPO_LABEL[hoja.type] : ''}
          </T>
          <Sep h={4} />

          <Pressable
            onPress={() => {
              const c = hoja;
              setHoja(null);
              if (c) nav.navigate('AccountForm', { accountId: c.id });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Editar cuenta ${hoja?.name ?? ''}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(3.5),
              minHeight: 58,
              borderBottomWidth: 1,
              borderBottomColor: C.borde,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Pencil size={22} color={BRAND.navy} strokeWidth={2.2} />
            <T size={16.5} weight="700">
              Editar cuenta
            </T>
          </Pressable>

          <Pressable
            onPress={() => {
              const c = hoja;
              setHoja(null);
              if (c) pedirEliminar(c);
            }}
            disabled={ocupado}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar cuenta ${hoja?.name ?? ''}. Esta acción requiere confirmación.`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(3.5),
              minHeight: 58,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Trash2 size={22} color={BRAND.coral} strokeWidth={2.2} />
            <T size={16.5} weight="700" color={BRAND.coral}>
              Eliminar cuenta
            </T>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
