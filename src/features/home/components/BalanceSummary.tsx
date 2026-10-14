import React from 'react';
import { ArrowDownToLine, ArrowUp, ShieldCheck } from 'lucide-react';
import { BRAND } from '@/theme/tokens';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';

export function BalanceSummary({
  amount,
  loading,
  caption = 'Después de compromisos',
  accountName,
  commitmentsCovered = true,
  commitmentsAmount,
  onIncome,
  onExpense,
}: {
  amount: number;
  loading?: boolean;
  caption?: string;
  accountName?: string | null;
  commitmentsCovered?: boolean;
  commitmentsAmount?: number;
  onIncome?: () => void;
  onExpense?: () => void;
}) {
  const negativo = amount < 0;
  const texto = money(amount);

  return (
    <div
      className="rounded-3xl p-5 sm:p-6 border shadow-xl relative overflow-hidden transition-all"
      style={{
        backgroundColor: BRAND.surfaceContainerLow,
        borderColor: BRAND.borderDark,
      }}
    >
      {/* 1. Header del Hero: Etiqueta + Badge de Estado */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-black tracking-wider uppercase select-none"
          style={{ color: BRAND.turquoise }}
        >
          {accountName ? `DISPONIBLE EN ${accountName.toUpperCase()}` : 'SALDO DISPONIBLE REAL'}
        </span>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
          style={{
            backgroundColor: 'rgba(20, 196, 212, 0.12)',
            borderColor: 'rgba(20, 196, 212, 0.25)',
            color: BRAND.turquoise,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND.turquoise }} />
          <span>Al día</span>
        </div>
      </div>

      {/* 2. Cifra Protagonista */}
      {loading ? (
        <Skeleton width="75%" height={48} radius={12} onDark />
      ) : (
        <div className="flex items-baseline gap-2 flex-wrap my-1">
          <span
            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight"
            style={{ color: negativo ? BRAND.coral : BRAND.white }}
          >
            {texto}
          </span>
          <span className="text-sm sm:text-base font-extrabold uppercase" style={{ color: BRAND.mutedLight }}>
            COP
          </span>
        </div>
      )}

      {/* Subtítulo tranquilizador y sin culpa */}
      <p className="text-sm font-medium mt-1" style={{ color: BRAND.mutedLight }}>
        {caption}
      </p>

      {/* 3. Mini Badge de Compromisos */}
      {commitmentsAmount !== undefined && commitmentsAmount > 0 ? (
        <div
          className="mt-3.5 inline-flex items-center gap-2 py-1 px-3 rounded-full text-xs font-semibold border"
          style={{
            backgroundColor: 'rgba(15, 33, 49, 0.85)',
            borderColor: 'rgba(28, 70, 92, 0.6)',
            color: BRAND.mutedLight,
          }}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: BRAND.turquoise }} />
          <span>
            Compromisos del mes:{' '}
            <strong style={{ color: BRAND.white }}>
              {commitmentsCovered ? '100% cubiertos' : 'Pendientes'} ({money(commitmentsAmount)} COP)
            </strong>
          </span>
        </div>
      ) : null}

      {/* 4. Siguiente paso claro: Botones gemelos táctiles */}
      {onIncome && onExpense ? (
        <div className="grid grid-cols-2 gap-3 mt-5 pt-1">
          <button
            type="button"
            onClick={onIncome}
            className="flex items-center justify-center gap-2 h-12 rounded-full font-black text-sm transition-all duration-150 cursor-pointer shadow-md active:scale-95 hover:opacity-95"
            style={{
              backgroundColor: BRAND.turquoise,
              color: BRAND.navy,
            }}
          >
            <ArrowDownToLine className="w-5 h-5 stroke-[2.5]" />
            <span>+ Ingreso</span>
          </button>

          <button
            type="button"
            onClick={onExpense}
            className="flex items-center justify-center gap-2 h-12 rounded-full font-black text-sm transition-all duration-150 cursor-pointer border shadow-md active:scale-95 hover:opacity-95"
            style={{
              backgroundColor: BRAND.surfaceContainerHigh,
              borderColor: BRAND.borderDark,
              color: BRAND.white,
            }}
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" style={{ color: BRAND.coral }} />
            <span>- Gasto</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
