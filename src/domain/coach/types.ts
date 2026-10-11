import type { AccountBalance, Category, DebtProgress } from '@/db/types';

export type Severity = 'info' | 'warn' | 'block';

export interface CoachAlert {
  code: string;
  severity: Severity;
  title: string;
  message: string;
  /** Accion sugerida concreta (lo que el boton secundario del modal hara). */
  action?:
    | { kind: 'pay_debt'; debtId: number; amount: number; label: string }
    | { kind: 'save'; amount: number; label: string }
    | { kind: 'reduce'; amount: number; label: string }
    | { kind: 'none' };
}

export interface CoachVerdict {
  /** 'ok' = registra sin ruido | 'warn' = muestra hoja | 'block' = pide confirmar */
  level: 'ok' | 'warn' | 'block';
  alerts: CoachAlert[];
}

/** Snapshot que el motor necesita. Se arma una vez por evaluacion. */
export interface CoachContext {
  accounts: AccountBalance[];
  totalBalance: number;
  debts: DebtProgress[];
  commitments: { debtId: number; amount: number; daysLeft: number; name: string }[];
  committedTotal: number;
  /** Gastos fijos del mes que aun no se pagan. */
  fixedPending: { id: number; name: string; amount: number; dueDay: number }[];
  fixedPendingTotal: number;
  /** Total mensual de gastos fijos, pagados o no. */
  fixedMonthlyTotal: number;
  /** Gastos fijos recortables (no esenciales), de mayor a menor. */
  trimmable: { id: number; name: string; amount: number }[];
  /**
   * Plata REALMENTE libre: saldo menos gastos fijos pendientes menos
   * cuotas proximas. Es el unico numero honesto para decidir si gastar.
   */
  availableReal: number;
  /** Vehiculos de ahorro activos, para sugerir donde poner los excedentes. */
  investments: {
    id: number;
    name: string;
    netAnnualBp: number;
    liquidity: 'immediate' | 'term';
  }[];
  /**
   * Proximo ingreso seguro. Permite decir "te quedan X para N dias" en
   * vez de un consejo vago, y cambia el tono: andar corto el dia 28 con
   * el salario entrando el 30 no es lo mismo que andar corto el dia 2.
   */
  nextIncome: { name: string; amount: number; daysLeft: number } | null;
  /** Meta de ahorro mas cercana a cumplirse, para sugerir destino. */
  topGoal: { id: number; name: string; remaining: number; saved: number } | null;
  overdueDebtIds: number[];
  avgDailyExpense: number;
  spentToday: number;
  emergencyBuffer: number;
  rules: Record<
    string,
    { enabled: boolean; severity: Severity; params: Record<string, number> }
  >;
}

export interface ExpenseIntent {
  amount: number;
  accountId: number;
  category?: Category | null;
  categorySpentThisMonth?: number;
}

export interface IncomeIntent {
  amount: number;
  accountId: number;
}

export interface AllocationSlice {
  kind: 'debt' | 'save' | 'free' | 'commitment' | 'fixed' | 'invest';
  debtId?: number;
  investmentId?: number;
  label: string;
  amount: number;
  reason: string;
}

export interface AllocationPlan {
  total: number;
  slices: AllocationSlice[];
  headline: string;
  /**
   * Que pasaria con la parte destinada a inversion si la dejas quieta.
   * Es lo que convierte "ahorra 200.000" en una decision motivadora.
   */
  investmentOutlook: {
    amount: number;
    targetName: string | null;
    netAnnualBp: number;
    inOneYear: number;
    inFiveYears: number;
    inTenYears: number;
    /** Si repitieras este aporte todos los meses. */
    monthlyInTenYears: number;
  } | null;
}
