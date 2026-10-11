import { create } from 'zustand';
import { openDb } from '@/db';
import { getSettings, setSetting } from '@/db/repositories/settings';
import { listAccounts, totalBalance } from '@/db/repositories/accounts';
import { listDebts } from '@/db/repositories/debts';
import { recentTransactions } from '@/db/repositories/transactions';
import { avgDailyExpense, loggingStreak, spentToday } from '@/db/repositories/stats';
import { buildCoachContext } from '@/domain/coach/context';
import { dailyAdvice } from '@/domain/coach/engine';
import { investedTotal, listInvestments } from '@/db/repositories/investments';
import { creditCardDebtTotal } from '@/db/repositories/creditCards';
import { ingestNotifications, pendingCount } from '@/db/repositories/detected';
import type {
  AccountBalance,
  DebtProgress,
  InvestmentProgress,
  TransactionRow,
} from '@/db/types';
import type { CoachAlert, CoachContext } from '@/domain/coach/types';
import { initNotifications, resyncAll } from '@/notifications';

type ThemePref = 'system' | 'light' | 'dark';

interface AppState {
  ready: boolean;
  themePref: ThemePref;
  settings: Record<string, string>;

  accounts: AccountBalance[];
  total: number;
  debts: DebtProgress[];
  investments: InvestmentProgress[];
  invested: number;
  /** Lo que tienes (cuentas + inversiones) menos lo que debes. */
  netWorth: number;
  /** Gastos fijos del mes que aun no se pagan. */
  fixedPending: number;
  /** Total mensual de gastos fijos. */
  fixedMonthly: number;
  /** Saldo menos gastos fijos pendientes menos cuotas proximas. */
  availableReal: number;
  /** Movimientos leidos de las notificaciones que esperan confirmacion. */
  detectedPending: number;
  /**
   * Cuenta destacada en el inicio. Es solo preferencia de pantalla: su
   * saldo NO reemplaza ni se suma aparte al total de cuentas.
   */
  primaryAccount: AccountBalance | null;
  setPrimaryAccount: (id: number | null) => Promise<void>;
  recent: TransactionRow[];
  todaySpent: number;
  avgDaily: number;
  streak: number;

  coach: CoachContext | null;
  advice: CoachAlert | null;

  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  setTheme: (t: ThemePref) => Promise<void>;
  saveSetting: (k: string, v: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  themePref: 'dark',
  settings: {},
  accounts: [],
  total: 0,
  debts: [],
  investments: [],
  invested: 0,
  netWorth: 0,
  fixedPending: 0,
  fixedMonthly: 0,
  availableReal: 0,
  detectedPending: 0,
  primaryAccount: null,
  recent: [],
  todaySpent: 0,
  avgDaily: 0,
  streak: 0,
  coach: null,
  advice: null,

  bootstrap: async () => {
    await openDb();
    await initNotifications();
    const settings = await getSettings();
    set({
      settings,
      themePref: (settings.theme as ThemePref) ?? 'dark',
    });
    // Procesa las notificaciones capturadas mientras la app estuvo cerrada.
    await ingestNotifications().catch(() => 0);
    await get().refresh();
    set({ ready: true });
    // No bloquea el arranque: reprograma notificaciones en segundo plano.
    resyncAll().catch(() => undefined);
  },

  refresh: async () => {
    const [
      accounts,
      total,
      debts,
      investments,
      invested,
      recent,
      todaySpent,
      avgDaily,
      streak,
      coach,
    ] = await Promise.all([
      listAccounts(),
      totalBalance(),
      listDebts('active'),
      listInvestments(),
      investedTotal(),
      recentTransactions(25),
      spentToday(),
      avgDailyExpense(30),
      loggingStreak(),
      buildCoachContext(),
    ]);
    // El saldo usado de las tarjetas es deuda real aunque no viva en
    // `debts`: sin esto el patrimonio neto saldria inflado.
    const cardDebt = await creditCardDebtTotal();
    const detectedPending = await pendingCount();
    const totalDebt = debts.reduce((a, d) => a + d.outstanding, 0) + cardDebt;
    set({
      accounts,
      total,
      debts,
      investments,
      invested,
      netWorth: total + invested - totalDebt,
      fixedPending: coach.fixedPendingTotal,
      fixedMonthly: coach.fixedMonthlyTotal,
      availableReal: coach.availableReal,
      detectedPending,
      // Si la cuenta marcada ya no existe o fue archivada, se cae a la
      // primera activa en vez de dejar el inicio sin referencia.
      primaryAccount:
        accounts.find((a) => String(a.id) === (get().settings.primary_account_id ?? '')) ??
        (accounts.length === 1 ? accounts[0] : null),
      recent,
      todaySpent,
      avgDaily,
      streak,
      coach,
      advice: dailyAdvice(coach),
    });
  },

  setTheme: async (t) => {
    await setSetting('theme', t);
    set({ themePref: t });
  },

  setPrimaryAccount: async (id) => {
    await setSetting('primary_account_id', id === null ? '' : String(id));
    set({
      settings: {
        ...get().settings,
        primary_account_id: id === null ? '' : String(id),
      },
    });
    await get().refresh();
  },

  saveSetting: async (k, v) => {
    await setSetting(k, v);
    set({ settings: { ...get().settings, [k]: v } });
  },
}));
