export type AccountType =
  | 'bank'
  | 'wallet'
  | 'cash'
  | 'credit_card'
  | 'savings'
  | 'other';

export type TxType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'debt_payment'
  | 'goal_deposit';

export type DebtKind = 'credit_card' | 'loan' | 'installment' | 'person' | 'other';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  provider_key: string | null;
  currency: string;
  color: string;
  emoji: string | null;
  initial_balance: number;
  credit_limit: number | null;
  /** Dia de corte: cierra el extracto. */
  statement_day: number | null;
  /** Dia limite de pago: despues hay mora. */
  payment_due_day: number | null;
  /** Tasa de financiacion nominal mensual en basis points. */
  card_rate_bp: number;
  include_in_total: 0 | 1;
  archived: 0 | 1;
  sort_order: number;
}

export interface AccountBalance extends Account {
  balance: number;
}

export interface Category {
  id: number;
  name: string;
  kind: 'expense' | 'income';
  emoji: string;
  color: string;
  monthly_budget: number | null;
  is_essential: 0 | 1;
  archived: 0 | 1;
  sort_order: number;
}

export interface Debt {
  id: number;
  name: string;
  creditor: string | null;
  kind: DebtKind;
  principal: number;
  monthly_rate_bp: number;
  installments_total: number;
  installment_amount: number | null;
  due_day: number;
  start_date: string;
  account_id: number | null;
  color: string;
  notes: string | null;
  status: 'active' | 'paid' | 'paused';
}

export interface DebtProgress extends Omit<Debt, 'account_id' | 'notes'> {
  paid_total: number;
  paid_principal: number;
  paid_interest: number;
  outstanding: number;
  installments_paid: number;
  last_payment_at: string | null;
}

export interface Transaction {
  id: number;
  type: TxType;
  amount: number;
  account_id: number;
  to_account_id: number | null;
  category_id: number | null;
  debt_id: number | null;
  goal_id: number | null;
  investment_id: number | null;
  fixed_expense_id: number | null;
  // Columnas que las migraciones 10, 11 y 12 agregaron a la tabla y que
  // este tipo no declaraba. Leerlas es lo que permite distinguir un
  // "Gasto fijo" de una "Cuota" de un gasto cualquiera.
  installment_plan_id: number | null;
  fixed_income_id: number | null;
  savings_goal_id: number | null;
  note: string | null;
  occurred_at: string;
  occurred_day: string;
  coach_verdict: string | null;
  coach_override: 0 | 1;
}

export interface TransactionRow extends Transaction {
  category_name: string | null;
  category_emoji: string | null;
  category_color: string | null;
  account_name: string;
  account_color: string;
  debt_name: string | null;
}

export type InvestmentKind =
  | 'savings'
  | 'cdt'
  | 'fund'
  | 'stocks'
  | 'crypto'
  | 'real_estate'
  | 'other';

export interface Investment {
  id: number;
  name: string;
  kind: InvestmentKind;
  issuer: string | null;
  /** Rentabilidad efectiva anual esperada, en basis points (12,5% => 1250). */
  annual_rate_bp: number;
  /** Comisiones + impuestos anuales estimados, en basis points. */
  fee_rate_bp: number;
  liquidity: 'immediate' | 'term';
  risk: 'low' | 'medium' | 'high';
  initial_amount: number;
  monthly_target: number;
  account_id: number | null;
  start_date: string;
  maturity_date: string | null;
  color: string;
  notes: string | null;
  status: 'active' | 'closed';
}

export interface InvestmentProgress extends Omit<Investment, 'notes'> {
  balance: number;
  deposited: number;
  withdrawn: number;
  yields: number;
  last_move_at: string | null;
}

export interface InvestmentMove {
  id: number;
  investment_id: number;
  transaction_id: number | null;
  amount: number;
  kind: 'deposit' | 'withdraw' | 'yield';
  moved_at: string;
  note: string | null;
}

export interface Reminder {
  id: number;
  kind:
    | 'debt_due'
    | 'daily_log'
    | 'weekly_review'
    | 'fixed_due'
    | 'motivation'
    | 'custom';
  debt_id: number | null;
  title: string;
  body: string | null;
  hour: number;
  minute: number;
  days_before: number;
  weekday: number | null;
  enabled: 0 | 1;
  notification_id: string | null;
}

export interface CoachRuleRow {
  code: string;
  enabled: 0 | 1;
  severity: 'info' | 'warn' | 'block';
  params_json: string;
}
