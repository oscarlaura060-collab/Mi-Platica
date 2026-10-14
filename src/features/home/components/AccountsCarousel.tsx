import React from 'react';
import {
  ChevronRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
  Banknote,
} from 'lucide-react';
import { BRAND } from '@/theme/tokens';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';
import type { AccountBalance } from '@/db/types';

const FONDOS = [BRAND.turquoise, BRAND.yellow, BRAND.coral] as const;

const ICONOS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  bank: Landmark,
  wallet: Wallet,
  cash: Banknote,
  credit_card: CreditCard,
  savings: PiggyBank,
  other: Wallet,
};

export function AccountsCarousel({
  accounts,
  primaryId,
  loading,
  onSeeAll,
  onOpen,
  onCreate,
}: {
  accounts: AccountBalance[];
  primaryId: number | null;
  loading?: boolean;
  onSeeAll: () => void;
  onOpen: (a: AccountBalance) => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black tracking-tight" style={{ color: BRAND.white }}>
          Mis cuentas
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs font-bold transition-all hover:opacity-80 cursor-pointer"
          style={{ color: BRAND.mutedLight }}
        >
          <span>Ver todas</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-hidden">
          <Skeleton width="75%" height={96} radius={20} onDark />
          <Skeleton width="25%" height={96} radius={20} onDark />
        </div>
      ) : accounts.length === 0 ? (
        <div
          className="rounded-2xl border p-5 text-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor: BRAND.borderDark,
          }}
        >
          <p className="text-base font-bold" style={{ color: BRAND.white }}>
            Aún no tienes cuentas registradas
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: BRAND.mutedLight }}>
            Agrega Nequi, Daviplata, Bancolombia, efectivo o tus tarjetas.
          </p>
          <Button label="Agregar cuenta" size="sm" onPress={onCreate} />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
          {accounts.map((a, i) => {
            const Icon = ICONOS[a.type] || Wallet;
            const esTarjeta = a.type === 'credit_card';
            const valor = esTarjeta ? Math.max(-a.balance, 0) : a.balance;
            const accentColor = a.color || FONDOS[i % FONDOS.length];
            const isPrimary = a.id === primaryId;

            return (
              <div
                key={a.id}
                onClick={() => onOpen(a)}
                className="flex-shrink-0 w-64 sm:w-72 rounded-2xl p-4 border transition-all duration-150 cursor-pointer snap-start hover:scale-[1.01] active:scale-95 shadow-md flex items-center justify-between gap-3 select-none"
                style={{
                  backgroundColor: BRAND.surfaceContainerLow,
                  borderColor: BRAND.borderDark,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: accentColor + '20',
                      borderColor: accentColor + '40',
                      color: accentColor,
                    }}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0">
                    <span className="block text-xs font-bold truncate" style={{ color: BRAND.onSurface }}>
                      {a.name}
                    </span>
                    <span className="block text-lg font-black tracking-tight truncate" style={{ color: BRAND.white }}>
                      {money(valor)}
                    </span>
                    {isPrimary ? (
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider" style={{ color: BRAND.turquoise }}>
                        Cuenta principal
                      </span>
                    ) : esTarjeta ? (
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider" style={{ color: BRAND.coral }}>
                        Cupo usado
                      </span>
                    ) : null}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 shrink-0" style={{ color: BRAND.mutedLight }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
