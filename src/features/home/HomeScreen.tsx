import React, { useCallback, useState, useEffect, useRef } from 'react';
import { BRAND } from '@/theme/tokens';
import { ErrorState } from '@/components/ErrorState';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/db/repositories/settings';
import { dayKey } from '@/utils/date';
import { money } from '@/utils/money';
import { pendingFixedIncomesDue } from '@/db/repositories/fixedIncomes';
import { HomeHeader } from './components/HomeHeader';
import { BalanceSummary } from './components/BalanceSummary';
import { CoachAdviceCard } from './components/CoachAdviceCard';
import { AccountsCarousel } from './components/AccountsCarousel';
import { RecentActivityPanel } from './components/RecentActivityPanel';
import { CoachMoodCard, type Mood } from './components/CoachMoodCard';
import type { AccountBalance, TransactionRow } from '@/db/types';

export function HomeScreen({
  onNavigate,
}: {
  onNavigate: (route: string, params?: Record<string, unknown>) => void;
}) {
  const {
    ready,
    accounts,
    recent,
    settings,
    availableReal,
    total,
    fixedPending,
    fixedMonthly,
    primaryAccount,
    detectedPending,
    advice,
    themePref,
    setTheme,
    refresh,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const avisoPospuestoHasta = useRef(0);

  const revisarIngresoFijo = useCallback(async () => {
    if (Date.now() < avisoPospuestoHasta.current) return;
    const pendientes = await pendingFixedIncomesDue();
    if (!pendientes.length) return;
    avisoPospuestoHasta.current = Date.now() + 6 * 60 * 60 * 1000;
    const f = pendientes[0];
    if (window.confirm(`¿Ya recibiste ${f.name}?\nIngreso fijo programado de ${money(f.amount)}.\n\n¿Quieres registrarlo ahora?`)) {
      onNavigate('fixedIncomes');
    }
  }, [onNavigate]);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      await refresh();
      await revisarIngresoFijo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  }, [refresh, revisarIngresoFijo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Animo del dia
  const moodGuardado =
    settings.mood_date === dayKey() ? (settings.mood_value as Mood) || null : null;
  const [mood, setMood] = useState<Mood | null>(moodGuardado);

  useEffect(() => {
    setMood(moodGuardado);
  }, [moodGuardado]);

  const guardarMood = async (m: Mood) => {
    setMood(m);
    await setSetting('mood_value', m);
    await setSetting('mood_date', dayKey());
  };

  const nombre = (settings.user_name ?? 'Amigo').trim() || 'Amigo';
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  const saldoAMostrar = primaryAccount ? primaryAccount.balance : availableReal;
  const nombreCuentaHero = primaryAccount ? primaryAccount.name : null;

  const subtituloHero = primaryAccount
    ? `Saldo de tu cuenta principal (${primaryAccount.name}).`
    : fixedPending > 0
      ? `Saldo total ${money(total)} menos gastos fijos pendientes (${money(fixedPending)}).`
      : fixedMonthly > 0
        ? `Gastos fijos del mes cubiertos (${money(fixedMonthly)}).`
        : 'Tus cuentas menos compromisos.';

  const isDark = themePref === 'dark';

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* 1. Header oscuro */}
      <div className="px-4 sm:px-6 pt-4 pb-2" style={{ backgroundColor: BRAND.navy }}>
        <HomeHeader
          greeting={saludo}
          name={nombre}
          hasAlerts={detectedPending > 0}
          onNotifications={() => onNavigate('notifications')}
          onSettings={() => onNavigate('settings')}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          isDark={isDark}
        />
      </div>

      {error ? (
        <div className="p-4">
          <ErrorState message={error} onRetry={cargar} />
        </div>
      ) : null}

      {/* 2. Cuerpo del Inicio en Navy */}
      <div className="px-4 sm:px-6 py-4 space-y-6 flex-1" style={{ backgroundColor: BRAND.navy }}>
        {/* Héroe de Disponible */}
        <BalanceSummary
          amount={saldoAMostrar}
          loading={!ready}
          caption={subtituloHero}
          accountName={nombreCuentaHero}
          commitmentsCovered={fixedPending === 0}
          commitmentsAmount={fixedMonthly}
          onIncome={() => onNavigate('quickAdd', { type: 'income' })}
          onExpense={() => onNavigate('quickAdd', { type: 'expense' })}
        />

        {/* Carrusel de Cuentas */}
        <AccountsCarousel
          accounts={accounts}
          primaryId={primaryAccount?.id ?? null}
          loading={!ready}
          onSeeAll={() => onNavigate('accounts')}
          onOpen={(a: AccountBalance) => onNavigate('accountDetail', { accountId: a.id })}
          onCreate={() => onNavigate('accountForm')}
        />

        {/* Tarjeta reflexiva del Coach */}
        <CoachAdviceCard
          advice={advice}
          onPress={() => onNavigate('coach')}
        />
      </div>

      {/* 3. Panel claro de movimientos recientes y estado de animo */}
      <RecentActivityPanel
        transactions={recent.slice(0, 8)}
        loading={!ready}
        onSeeAll={() => onNavigate('movements')}
        onOpen={(tx: TransactionRow) => onNavigate('transactionEdit', { txId: tx.id })}
        onRegister={() => onNavigate('quickAdd')}
      >
        <CoachMoodCard
          mood={mood}
          onSelect={guardarMood}
          onRecommendations={() => onNavigate('coach')}
        />
      </RecentActivityPanel>
    </div>
  );
}
