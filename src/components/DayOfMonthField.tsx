import React, { useState } from 'react';
import { useTheme } from '@/theme';
import { nextDueDate, format } from '@/utils/date';
import { es } from 'date-fns/locale';

export function DayOfMonthField({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (day: number) => void;
  label?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const proxima = nextDueDate(value);

  return (
    <div className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all hover:opacity-95"
        style={{
          backgroundColor: t.mode === 'dark' ? t.cardAlt : t.bgElevated,
          borderColor: t.border,
        }}
      >
        <div>
          {label ? (
            <span className="block text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: t.textFaint }}>
              {label}
            </span>
          ) : null}
          <div className="text-sm font-bold" style={{ color: t.text }}>
            Día {value}
          </div>
          <div className="text-xs font-medium" style={{ color: t.textFaint }}>
            Próxima vez: {format(proxima, "d 'de' LLLL", { locale: es })}
          </div>
        </div>
        <span className="text-xs font-semibold" style={{ color: t.primary }}>
          cambiar
        </span>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 right-0 top-full mt-2 z-50 p-4 rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95"
            style={{
              backgroundColor: t.bgElevated,
              borderColor: t.border,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textFaint }}>
                {label ?? 'Elige el día del mes'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold px-2 py-1 rounded-md cursor-pointer hover:bg-white/10"
                style={{ color: t.textMuted }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const sel = d === value;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      sel ? 'shadow-sm' : 'hover:bg-white/10'
                    }`}
                    style={{
                      backgroundColor: sel ? t.primary : 'transparent',
                      color: sel ? t.onPrimary : t.text,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-center" style={{ color: t.textFaint }}>
              Si el mes no tiene ese día (ej. 31 en febrero), se usa el último día del mes.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
