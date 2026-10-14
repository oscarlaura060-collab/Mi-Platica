import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BRAND } from '@/theme/tokens';

export type Mood = 'worried' | 'neutral' | 'good';

const OPCIONES: { key: Mood; emoji: string; label: string }[] = [
  { key: 'worried', emoji: '😟', label: 'Me preocupa' },
  { key: 'neutral', emoji: '😐', label: 'Voy regular' },
  { key: 'good', emoji: '🙂', label: 'Voy bien' },
];

const COLOR: Record<Mood, string> = {
  worried: BRAND.coral,
  neutral: '#B8880A',
  good: BRAND.turquoiseDark,
};

export function CoachMoodCard({
  mood,
  onSelect,
  onRecommendations,
  supportText = 'Vamos paso a paso, tú puedes.',
}: {
  mood: Mood | null;
  onSelect: (m: Mood) => void;
  onRecommendations: () => void;
  supportText?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border transition-all"
      style={{
        backgroundColor: 'rgba(7,26,42,0.06)',
        borderColor: BRAND.borderLight,
      }}
    >
      <h3 className="text-sm sm:text-base font-bold mb-3" style={{ color: BRAND.ink }}>
        ¿Cómo te sientes hoy con tu plata?
      </h3>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {OPCIONES.map((o) => {
            const activo = mood === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => onSelect(o.key)}
                className={`flex-1 sm:flex-none min-w-[56px] min-h-[56px] p-2 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                  activo ? 'bg-white shadow-sm scale-105' : 'bg-transparent hover:bg-black/5 opacity-80'
                }`}
                style={{
                  borderColor: activo ? COLOR[o.key] : BRAND.borderLight,
                }}
              >
                <span className="text-2xl">{o.emoji}</span>
                {activo ? (
                  <span
                    className="text-[10px] font-bold mt-0.5 truncate max-w-[80px]"
                    style={{ color: COLOR[o.key] }}
                  >
                    {o.label}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRecommendations}
          className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-full font-black text-sm transition-all duration-150 cursor-pointer shadow-md active:scale-95 hover:opacity-90 shrink-0"
          style={{
            backgroundColor: BRAND.yellow,
            color: BRAND.navy,
          }}
        >
          <span>Ver recomendaciones</span>
          <ChevronRight className="w-4 h-4 stroke-[2.6]" />
        </button>
      </div>

      <p className="text-xs font-medium mt-3" style={{ color: BRAND.mutedDark }}>
        {supportText}
      </p>
    </div>
  );
}
