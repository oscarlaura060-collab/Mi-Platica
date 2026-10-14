import React, { useState } from 'react';
import { useTheme } from '@/theme';
import { Clock } from 'lucide-react';

export function formatHour(hour: number, minute = 0): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const sufijo = hour < 12 ? 'a. m.' : 'p. m.';
  return `${h12}:${String(minute).padStart(2, '0')} ${sufijo}`;
}

export function TimePickerField({
  hour,
  minute,
  onChange,
  label,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  label?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

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
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4" style={{ color: t.primary }} />
          <div>
            {label ? (
              <span className="block text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: t.textFaint }}>
                {label}
              </span>
            ) : null}
            <div className="text-base font-bold" style={{ color: t.text }}>
              {formatHour(hour, minute)}
            </div>
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
                {label ?? 'Seleccionar hora'}
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

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <span className="block text-xs font-bold text-center mb-1" style={{ color: t.textFaint }}>
                  HORA
                </span>
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1">
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                    const sel = h === hour;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => onChange(h, minute)}
                        className="py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                        style={{
                          backgroundColor: sel ? t.primary : 'transparent',
                          color: sel ? t.onPrimary : t.text,
                        }}
                      >
                        {formatHour(h, 0)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-center mb-1" style={{ color: t.textFaint }}>
                  MINUTOS
                </span>
                <div className="flex flex-col gap-1">
                  {[0, 15, 30, 45].map((m) => {
                    const sel = m === minute;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onChange(hour, m)}
                        className="py-2 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                        style={{
                          backgroundColor: sel ? t.primary : 'transparent',
                          color: sel ? t.onPrimary : t.text,
                        }}
                      >
                        :{String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-xl text-sm font-bold text-center cursor-pointer transition-all"
              style={{
                backgroundColor: t.primary,
                color: t.onPrimary,
              }}
            >
              Listo
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
