import React from 'react';
import { ArrowDownToLine, ArrowUp, BarChart3 } from 'lucide-react';
import { BRAND } from '@/theme/tokens';

export function QuickActions({
  onIncome,
  onExpense,
  onCoach,
}: {
  onIncome: () => void;
  onExpense: () => void;
  onCoach: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full">
      <button
        type="button"
        onClick={onIncome}
        className="h-13 sm:h-14 rounded-full flex items-center justify-center gap-2 font-black text-sm transition-all shadow-md active:scale-95 hover:opacity-90 cursor-pointer select-none"
        style={{
          backgroundColor: BRAND.turquoise,
          color: BRAND.navy,
        }}
      >
        <ArrowDownToLine className="w-5 h-5 stroke-[2.4]" />
        <span>Ingreso</span>
      </button>

      <button
        type="button"
        onClick={onExpense}
        className="h-13 sm:h-14 rounded-full flex items-center justify-center gap-2 font-black text-sm transition-all shadow-md active:scale-95 hover:opacity-90 cursor-pointer select-none"
        style={{
          backgroundColor: BRAND.coral,
          color: BRAND.white,
        }}
      >
        <ArrowUp className="w-5 h-5 stroke-[2.4]" />
        <span>Gasto</span>
      </button>

      <button
        type="button"
        onClick={onCoach}
        className="h-13 sm:h-14 rounded-full flex items-center justify-center gap-2 font-black text-sm transition-all shadow-md active:scale-95 hover:opacity-90 cursor-pointer select-none"
        style={{
          backgroundColor: BRAND.yellow,
          color: BRAND.navy,
        }}
      >
        <BarChart3 className="w-5 h-5 stroke-[2.4]" />
        <span>Coach</span>
      </button>
    </div>
  );
}
