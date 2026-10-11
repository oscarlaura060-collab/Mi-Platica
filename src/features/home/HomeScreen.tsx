import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BRAND, space } from '@/theme/tokens';
import { ErrorState } from '@/components/ErrorState';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/db/repositories/settings';
import { dayKey } from '@/utils/date';
import { money } from '@/utils/money';
import { pendingFixedIncomesDue } from '@/db/repositories/fixedIncomes';
import { HomeHeader } from './components/HomeHeader';
import { BalanceSummary } from './components/BalanceSummary';
import { QuickActions } from './components/QuickActions';
import { AccountsCarousel } from './components/AccountsCarousel';
import { RecentActivityPanel } from './components/RecentActivityPanel';
import { CoachMoodCard, type Mood } from './components/CoachMoodCard';
import type { RootNav } from '@/app/navigation/types';

/**
 * INICIO
 *
 * Orden de lectura (debe entenderse en menos de cinco segundos):
 *   1. quien eres          4. tus cuentas
 *   2. cuanto tienes       5. tus ultimos movimientos
 *   3. que puedes hacer    6. como te sientes y que recomendamos
 *
 * El header es navy y el panel de movimientos offWhite en AMBOS temas:
 * es el lenguaje visual de la marca, no el modo oscuro.
 *
 * Todos los datos son REALES, de la base local. No hay mocks.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const {
    ready,
    accounts,
    recent,
    settings,
    availableReal,
    total,
    primaryAccount,
    detectedPending,
    advice,
    refresh,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [recargando, setRecargando] = useState(false);
  const avisoPospuestoHasta = React.useRef(0);

  const revisarIngresoFijo = useCallback(async () => {
    if (Date.now() < avisoPospuestoHasta.current) return;
    const pendientes = await pendingFixedIncomesDue();
    if (!pendientes.length) return;
    // Evita duplicados entre el temporizador y el retorno a Inicio.
    avisoPospuestoHasta.current = Date.now() + 6 * 60 * 60 * 1000;
    const f = pendientes[0];
    Alert.alert(`¿Ya recibiste ${f.name}?`, `Ingreso fijo de ${money(f.amount)}.`, [
      { text: 'Después', style: 'cancel' },
      { text: 'Sí, registrar ingreso', onPress: () => nav.navigate('FixedIncomes') },
    ]);
  }, [nav]);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      await refresh();
      await revisarIngresoFijo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  }, [refresh, revisarIngresoFijo]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  React.useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      void revisarIngresoFijo().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(timer);
  }, [ready, revisarIngresoFijo]);

  // ---- Animo del dia -------------------------------------------------
  // Se guarda con la fecha para preguntarlo una vez al dia.
  const moodGuardado =
    settings.mood_date === dayKey() ? (settings.mood_value as Mood) || null : null;
  const [mood, setMood] = useState<Mood | null>(moodGuardado);

  React.useEffect(() => {
    setMood(moodGuardado);
  }, [moodGuardado]);

  async function elegirMood(m: Mood) {
    setMood(m);
    Haptics.selectionAsync().catch(() => undefined);
    await setSetting('mood_value', m);
    await setSetting('mood_date', dayKey());
    await refresh();
  }

  // ---- Textos --------------------------------------------------------
  const nombre = (settings.user_name ?? '').trim();
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  // El mensaje de apoyo acompaña el animo; nunca culpa.
  const apoyo =
    mood === 'worried'
      ? 'Vamos paso a paso, tú puedes.'
      : mood === 'neutral'
        ? 'Vas construyendo. Un paso a la vez.'
        : mood === 'good'
          ? 'Qué bueno. Sigamos así.'
          : 'Vamos paso a paso, tú puedes.';

  // Con compromisos registrados se muestra el disponible real; si no hay
  // ninguno, mostrarlo seria repetir el saldo con otro nombre.
  const hayCompromisos = availableReal !== total;
  const montoPrincipal = hayCompromisos ? availableReal : total;
  const leyenda = hayCompromisos
    ? 'Después de compromisos'
    : primaryAccount && accounts.length > 1
      ? `De ${accounts.length} cuentas`
      : 'Disponible hoy';

  const cargando = !ready || recargando;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.navy }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space(26) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recargando}
            onRefresh={async () => {
              setRecargando(true);
              await cargar();
              setRecargando(false);
            }}
            tintColor={BRAND.turquoise}
          />
        }
      >
        {/* ---------- ZONA OSCURA ---------- */}
        <View
          style={{
            paddingTop: insets.top + space(2),
            paddingHorizontal: space(5),
            paddingBottom: space(6),
          }}
        >
          <HomeHeader
            greeting={saludo}
            name={nombre || 'Hola'}
            hasAlerts={detectedPending > 0 || advice?.severity === 'block'}
            onNotifications={() => nav.navigate('Detected')}
            onSettings={() => nav.navigate('Settings')}
          />

          <View style={{ height: space(7) }} />
          <BalanceSummary
            amount={montoPrincipal}
            caption={leyenda}
            loading={cargando}
          />

          <View style={{ height: space(6) }} />
          <QuickActions
            onIncome={() => nav.navigate('QuickAdd', { type: 'income' })}
            onExpense={() => nav.navigate('QuickAdd', { type: 'expense' })}
            onCoach={() => nav.navigate('Coach')}
          />

          <View style={{ height: space(7) }} />
          <AccountsCarousel
            accounts={accounts}
            primaryId={primaryAccount?.id ?? null}
            loading={cargando}
            onSeeAll={() => nav.navigate('Accounts')}
            onCreate={() => nav.navigate('AccountForm', {})}
            onOpen={(a) =>
              a.type === 'credit_card'
                ? nav.navigate('CreditCard', { cardId: a.id })
                : nav.navigate('AccountDetail', { accountId: a.id })
            }
          />
        </View>

        {/* ---------- PANEL CLARO ---------- */}
        {error ? (
          <View
            style={{
              backgroundColor: BRAND.offWhite,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              padding: space(5),
              minHeight: 300,
            }}
          >
            <ErrorState
              title="No pudimos cargar tus movimientos"
              message="Puede ser algo pasajero."
              onRetry={cargar}
            />
          </View>
        ) : (
          <RecentActivityPanel
            transactions={recent.slice(0, 5)}
            loading={cargando}
            onSeeAll={() => nav.navigate('Movements')}
            onRegister={() => nav.navigate('QuickAdd', { type: 'expense' })}
            onOpen={(tx) =>
              nav.navigate('TransactionEdit', { transactionId: tx.id })
            }
          >
            <CoachMoodCard
              mood={mood}
              supportText={apoyo}
              onSelect={elegirMood}
              onRecommendations={() => nav.navigate('Coach')}
            />
          </RecentActivityPanel>
        )}
      </ScrollView>
    </View>
  );
}
