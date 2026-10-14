import React, { useCallback, useEffect } from 'react';
import { useTheme } from '@/theme';
import { Delete } from 'lucide-react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

export function Keypad({
  onChange,
  value,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const t = useTheme();

  const press = useCallback(
    (k: string) => {
      if (k === 'del') {
        return onChange(Math.floor(value / 10));
      }
      if (k === '000') {
        const next = value * 1000;
        return onChange(next > 99_999_999 ? value : next);
      }
      const next = value * 10 + Number(k);
      onChange(next > 99_999_999 ? value : next);
    },
    [value, onChange],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        press(e.key);
      } else if (e.key === 'Backspace') {
        press('del');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [press]);

  return (
    <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto w-full">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          onContextMenu={(e) => {
            if (k === 'del') {
              e.preventDefault();
              onChange(0);
            }
          }}
          className="h-14 sm:h-16 flex items-center justify-center rounded-xl text-xl font-bold transition-all duration-100 select-none cursor-pointer border active:scale-95 hover:opacity-90 shadow-sm"
          style={{
            backgroundColor: t.card,
            color: t.text,
            borderColor: t.border,
          }}
        >
          {k === 'del' ? <Delete className="w-6 h-6" /> : k}
        </button>
      ))}
    </div>
  );
}
