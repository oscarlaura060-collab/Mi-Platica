import React from 'react';
import { ChevronRight, SunMedium } from 'lucide-react';
import { BRAND } from '@/theme/tokens';
import type { CoachAlert } from '@/domain/coach/types';

export function CoachAdviceCard({
  advice,
  onPress,
}: {
  advice?: CoachAlert | null;
  onPress: () => void;
}) {
  const mensaje =
    advice?.message ||
    'Vas al día con tus compromisos de la quincena. Tienes margen para darte un gusto consciente o sumar a tu ahorro.';

  return (
    <div
      onClick={onPress}
      className="rounded-2xl p-4 sm:p-5 border flex items-start gap-3.5 transition-all duration-150 cursor-pointer shadow-md hover:scale-[1.01] active:scale-95 select-none"
      style={{
        backgroundColor: BRAND.surfaceContainerLow,
        borderColor: 'rgba(255, 212, 71, 0.35)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border mt-0.5"
        style={{
          backgroundColor: 'rgba(255, 212, 71, 0.16)',
          borderColor: 'rgba(255, 212, 71, 0.32)',
          color: BRAND.yellow,
        }}
      >
        <SunMedium className="w-5 h-5 stroke-[2.4]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className="text-[11px] font-black uppercase tracking-wider"
            style={{ color: BRAND.yellow }}
          >
            COACH FINANCIERO · SIN CULPA
          </span>
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: BRAND.turquoise }}>
            <span>Ver plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <p className="text-sm font-medium leading-relaxed" style={{ color: BRAND.onSurface }}>
          {mensaje}
        </p>
      </div>
    </div>
  );
}
