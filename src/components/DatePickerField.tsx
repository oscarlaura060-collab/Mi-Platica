import React, { useState } from 'react';
import { useTheme } from '@/theme';
import { format, parseISO } from '@/utils/date';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Elegir fecha',
  minToday,
  clearable = true,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  minToday?: boolean;
  clearable?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  const etiqueta = value
    ? format(parseISO(value), "d 'de' LLLL 'de' yyyy", { locale: es })
    : placeholder;

  const todayStr = new Date().toISOString().slice(0, 10);

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
          <Calendar className="w-4 h-4" style={{ color: t.primary }} />
          <span
            className="text-sm font-semibold truncate"
            style={{ color: value ? t.text : t.textFaint }}
          >
            {etiqueta}
          </span>
        </div>
        <span className="text-xs font-semibold" style={{ color: t.primary }}>
          {value ? 'cambiar' : 'elegir'}
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
                Seleccionar fecha
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

            <input
              type="date"
              value={value || ''}
              min={minToday ? todayStr : undefined}
              onChange={(e) => {
                onChange(e.target.value || null);
                setOpen(false);
              }}
              className="w-full p-2.5 rounded-xl border text-sm font-semibold mb-3 outline-none"
              style={{
                backgroundColor: t.card,
                borderColor: t.border,
                color: t.text,
              }}
            />

            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: t.border }}>
              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  setOpen(false);
                }}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{ backgroundColor: t.primarySoft, color: t.primary }}
              >
                Hoy
              </button>
              {clearable ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  style={{ backgroundColor: t.cardAlt, color: t.textMuted }}
                >
                  Sin fecha
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const t = useTheme();
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: t.textFaint }}>
          Desde
        </span>
        <DatePickerField
          value={from}
          clearable={false}
          onChange={(d) => d && onChange(d, to < d ? d : to)}
        />
      </div>
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: t.textFaint }}>
          Hasta
        </span>
        <DatePickerField
          value={to}
          clearable={false}
          onChange={(d) => d && onChange(from > d ? d : from, d)}
        />
      </div>
    </div>
  );
}
