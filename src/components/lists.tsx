import React from 'react';
import { Pressable, View } from 'react-native';
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 150,
        padding: t.space(3.5),
        borderRadius: t.radius.lg,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Row gap={2}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: account.color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="tiny" color="#06100B" weight="800">
            {(account.emoji ?? account.name.slice(0, 1)).toUpperCase()}
          </Txt>
        </View>
        <Txt variant="tiny" muted numberOfLines={1} style={{ flex: 1 }}>
          {account.name}
        </Txt>
      </Row>
      <Spacer h={2.5} />
      <Txt variant="h3" color={negative ? t.danger : t.text}>
        {money(account.balance)}
      </Txt>
      {account.include_in_total === 0 ? (
        <>
          <Spacer h={1.5} />
          <Badge label="fuera del total" />
        </>
      ) : null}
    </Pressable>
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space(3),
        paddingVertical: t.space(3),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (tx.category_color ?? color) + '22',
        }}
      >
        <Txt variant="body">
          {tx.category_emoji ?? (tx.type === 'debt_payment' ? '%' : inflow ? '+' : '-')}
        </Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="body" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="tiny" faint numberOfLines={1}>
          {tx.account_name}
          {tx.note ? ` · ${tx.note}` : ''}
          {tx.coach_override === 1 ? ' · ignoraste el consejo' : ''}
        </Txt>
      </View>
      <Txt variant="body" color={color} weight="700">
        {inflow ? '+' : '-'} {money(tx.amount)}
      </Txt>
    </Pressable>
  );
}

export function DayHeader({ day, total }: { day: string; total: number }) {
  const t = useTheme();
  return (
    <Row
      justify="space-between"
      style={{ marginTop: t.space(4), marginBottom: t.space(1) }}
    >
      <Txt variant="tiny" faint weight="700">
        {prettyDay(day).toUpperCase()}
      </Txt>
      <Txt variant="tiny" faint>
        {money(total)}
      </Txt>
    </Row>
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
    <Card onPress={onPress} style={{ marginBottom: t.space(3) }}>
      <Row justify="space-between">
        <Row gap={2} style={{ flex: 1 }}>
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: debt.color }}
          />
          <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
            {debt.name}
          </Txt>
        </Row>
        {priorityLabel ? <Badge label={priorityLabel} tone="warn" /> : null}
      </Row>

      <Spacer h={3} />
      <Row justify="space-between" align="flex-end">
        <View>
          <Txt variant="tiny" faint>
            Saldo pendiente
          </Txt>
          <Txt variant="h2">{money(debt.outstanding)}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="tiny" faint>
            Cuota
          </Txt>
          <Txt variant="body">{money(debt.installment_amount ?? 0)}</Txt>
        </View>
      </Row>

      <Spacer h={3} />
      <ProgressBar value={progress} color={debt.color} />
      <Spacer h={2} />
      <Row justify="space-between">
        <Txt variant="tiny" faint>
          {debt.installments_paid}/{debt.installments_total} cuotas ·{' '}
          {(debt.monthly_rate_bp / 100).toFixed(2)}% m.v.
        </Txt>
        <Txt variant="tiny" color={overdue ? t.danger : t.textFaint} weight="700">
          {due}
        </Txt>
      </Row>
    </Card>
  );
}
