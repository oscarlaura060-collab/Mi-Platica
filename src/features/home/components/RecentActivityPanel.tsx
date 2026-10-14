import React from 'react';
import {
  ArrowDownToLine,
  ArrowUp,
  Bus,
  ChevronRight,
  CreditCard,
  House,
  PiggyBank,
  ShoppingCart,
  Utensils,
  Zap,
} from 'lucide-react';
import { BRAND } from '@/theme/tokens';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';
import type { TransactionRow } from '@/db/types';

function iconoPara(tx: TransactionRow) {
  if (tx.type === 'income') return ArrowDownToLine;
  if (tx.type === 'debt_payment') return CreditCard;
  if (tx.type === 'goal_deposit') return PiggyBank;

  const n = (tx.category_name ?? '').toLowerCase();
  if (n.includes('mercado') || n.includes('compra')) return ShoppingCart;
  if (n.includes('transporte')) return Bus;
  if (n.includes('comida') || n.includes('restaurante')) return Utensils;
  if (n.includes('servicio') || n.includes('luz')) return Zap;
  if (n.includes('arriendo') || n.includes('casa')) return House;
  return ArrowUp;
}

function tituloDe(tx: TransactionRow): string {
  if (tx.type === 'debt_payment') return tx.debt_name ?? 'Abono a deuda';
  if (tx.type === 'goal_deposit') return tx.note || 'Aporte a meta';
  if (tx.type === 'transfer') return 'Traslado entre cuentas';
  return tx.note || tx.category_name || (tx.type === 'income' ? 'Ingreso' : 'Gasto');
}

function subtituloDe(tx: TransactionRow): string {
  const tipo =
    tx.type === 'income'
      ? 'Ingreso'
      : tx.type === 'transfer'
        ? 'Traslado'
        : tx.type === 'debt_payment'
          ? 'Abono'
          : tx.type === 'goal_deposit'
            ? 'Ahorro'
            : 'Gasto';
  return `${tipo} · ${tx.account_name}`;
}

export function RecentActivityPanel({
  transactions,
  loading,
  onSeeAll,
  onOpen,
  onRegister,
  children,
}: {
  transactions: TransactionRow[];
  loading?: boolean;
  onSeeAll: () => void;
  onOpen: (tx: TransactionRow) => void;
  onRegister: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-t-[34px] p-5 sm:p-6 shadow-2xl transition-all"
      style={{
        backgroundColor: BRAND.offWhite,
        color: BRAND.ink,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black tracking-tight" style={{ color: BRAND.ink }}>
          Últimos movimientos
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs font-bold transition-all hover:opacity-80 cursor-pointer"
          style={{ color: BRAND.turquoiseDark }}
        >
          <span>Ver todos</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 py-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={44} height={44} radius={22} />
              <div className="flex-1 space-y-2">
                <Skeleton width="55%" height={14} />
                <Skeleton width="35%" height={11} />
              </div>
              <Skeleton width={82} height={16} />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-base font-bold" style={{ color: BRAND.ink }}>
            Aún no tienes movimientos registrados
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: BRAND.mutedDark }}>
            Registra tu primer ingreso o gasto para comenzar tu seguimiento.
          </p>
          <Button label="Registrar movimiento" size="sm" onPress={onRegister} />
        </div>
      ) : (
        <div className="divide-y divide-gray-200/70">
          {transactions.map((tx) => {
            const Icon = iconoPara(tx);
            const entra = tx.type === 'income';
            const neutro = tx.type === 'goal_deposit' || tx.type === 'transfer';
            const signo = entra ? '+' : neutro ? '' : '−';
            const colorValor = entra
              ? BRAND.turquoiseDark
              : neutro
                ? BRAND.ink
                : BRAND.coral;
            const fondoIcono = entra
              ? BRAND.paleTurquoise
              : neutro
                ? BRAND.paleYellow
                : BRAND.paleCoral;
            const colorIcono = entra
              ? BRAND.turquoiseDark
              : neutro
                ? '#B8880A'
                : BRAND.coral;

            return (
              <div
                key={tx.id}
                onClick={() => onOpen(tx)}
                className="flex items-center gap-3 py-3.5 transition-all hover:bg-black/5 active:scale-[0.99] cursor-pointer rounded-xl px-2"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: fondoIcono, color: colorIcono }}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate" style={{ color: BRAND.ink }}>
                    {tituloDe(tx)}
                  </span>
                  <span className="block text-xs truncate" style={{ color: BRAND.mutedDark }}>
                    {subtituloDe(tx)}
                  </span>
                </div>

                <div className="text-base font-black shrink-0 tracking-tight" style={{ color: colorValor }}>
                  {signo}
                  {money(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
