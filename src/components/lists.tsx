import React from 'react';
import { useTheme } from '@/theme';
import { Badge, Card, ProgressBar, Row, Spacer, Txt } from './ui';
import { money, pct } from '@/utils/money';
import { dueLabel, prettyDay } from '@/utils/date';
import type { AccountBalance, DebtProgress, TransactionRow } from '@/db/types';

export function AccountPill({
  account,
  onPress,
}: {
  account: AccountBalance;
  onPress?: () => void;
}) {
  const t = useTheme();
  const negative = account.balance < 0;

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex-shrink-0 w-36 sm:w-44 p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm select-none"
      style={{
        backgroundColor: t.card,
        borderColor: t.border,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs shrink-0"
          style={{ backgroundColor: account.color, color: '#06100B' }}
        >
          {(account.emoji ?? account.name.slice(0, 1)).toUpperCase()}
        </div>
        <span className="text-xs font-semibold truncate" style={{ color: t.textMuted }}>
          {account.name}
        </span>
      </div>
      <div
        className="text-base sm:text-lg font-bold tracking-tight truncate"
        style={{ color: negative ? t.danger : t.text }}
      >
        {money(account.balance)}
      </div>
      {account.include_in_total === 0 ? (
        <div className="mt-1">
          <Badge label="fuera del total" />
        </div>
      ) : null}
    </button>
  );
}

export function TransactionItem({
  tx,
  onPress,
}: {
  tx: TransactionRow;
  onPress?: () => void;
}) {
  const t = useTheme();
  const inflow = tx.type === 'income';
  const color =
    tx.type === 'income'
      ? t.primary
      : tx.type === 'debt_payment'
        ? t.warn
        : tx.type === 'transfer'
          ? t.info
          : t.text;

  const title =
    tx.type === 'debt_payment'
      ? `Abono: ${tx.debt_name ?? 'deuda'}`
      : tx.type === 'transfer'
        ? 'Traslado entre cuentas'
        : (tx.category_name ?? (inflow ? 'Ingreso' : 'Gasto'));

  return (
    <div
      onClick={onPress}
      className="flex items-center gap-3 py-3 px-2 rounded-xl transition-all hover:bg-white/5 active:scale-[0.99] cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
        style={{
          backgroundColor: (tx.category_color ?? color) + '22',
          borderWidth: 1,
          borderColor: (tx.category_color ?? color) + '44',
        }}
      >
        {tx.category_emoji ?? (tx.type === 'debt_payment' ? '%' : inflow ? '+' : '-')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: t.text }}>
          {title}
        </div>
        <div className="text-xs truncate" style={{ color: t.textFaint }}>
          {tx.account_name}
          {tx.note ? ` · ${tx.note}` : ''}
          {tx.coach_override === 1 ? ' · ignoraste el consejo' : ''}
        </div>
      </div>
      <div className="text-sm font-bold shrink-0" style={{ color }}>
        {inflow ? '+' : '-'} {money(tx.amount)}
      </div>
    </div>
  );
}

export function DayHeader({ day, total }: { day: string; total: number }) {
  const t = useTheme();
  return (
    <div className="flex justify-between items-center mt-4 mb-1 px-1">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.textFaint }}>
        {prettyDay(day).toUpperCase()}
      </span>
      <span className="text-xs font-semibold" style={{ color: t.textFaint }}>
        {money(total)}
      </span>
    </div>
  );
}

export function DebtCard({
  debt,
  onPress,
  priorityLabel,
}: {
  debt: DebtProgress;
  onPress?: () => void;
  priorityLabel?: string;
}) {
  const t = useTheme();
  const progress = pct(debt.paid_principal, debt.principal);
  const due = dueLabel(debt.due_day);
  const overdue = due.startsWith('Vencida');

  return (
    <Card onPress={onPress} className="mb-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: debt.color }} />
          <span className="text-base font-bold truncate" style={{ color: t.text }}>
            {debt.name}
          </span>
        </div>
        {priorityLabel ? <Badge label={priorityLabel} tone="warn" /> : null}
      </div>

      <div className="flex justify-between items-end mb-3">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: t.textFaint }}>
            Saldo pendiente
          </span>
          <span className="text-xl font-extrabold tracking-tight" style={{ color: t.text }}>
            {money(debt.outstanding)}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: t.textFaint }}>
            Cuota
          </span>
          <span className="text-sm font-bold" style={{ color: t.text }}>
            {money(debt.installment_amount ?? 0)}
          </span>
        </div>
      </div>

      <ProgressBar value={progress} color={debt.color} />

      <div className="flex justify-between items-center mt-2.5 text-xs font-medium">
        <span style={{ color: t.textFaint }}>
          {debt.installments_paid}/{debt.installments_total} cuotas · {(debt.monthly_rate_bp / 100).toFixed(2)}% m.v.
        </span>
        <span className="font-bold" style={{ color: overdue ? t.danger : t.textFaint }}>
          {due}
        </span>
      </div>
    </Card>
  );
}
