import React, { CSSProperties } from 'react';
import { useTheme } from '@/theme';
import { centsToInput, formatThousands, parseMoneyInput } from '@/utils/money';

export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  size = 'md',
  autoFocus,
  prefix = true,
  helper,
  disabled,
  className = '',
  style,
}: {
  value: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  size?: 'md' | 'lg' | 'xl';
  autoFocus?: boolean;
  prefix?: boolean;
  helper?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useTheme();
  const [text, setText] = React.useState(() => centsToInput(value));

  React.useEffect(() => {
    if (parseMoneyInput(text) !== value) {
      setText(centsToInput(value));
    }
  }, [value, text]);

  const fontSizes = {
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl sm:text-4xl',
  }[size];

  function handle(next: string) {
    const formatted = formatThousands(next);
    setText(formatted);
    onChange(parseMoneyInput(formatted));
  }

  return (
    <div className={`w-full ${className}`} style={style}>
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-[#14C4D4]/40'
        }`}
        style={{
          backgroundColor: t.mode === 'dark' ? t.cardAlt : t.bgElevated,
          borderColor: t.border,
        }}
      >
        {prefix ? (
          <span
            className="font-bold select-none"
            style={{ color: t.textFaint }}
          >
            $
          </span>
        ) : null}
        <input
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          disabled={disabled}
          value={text}
          onChange={(e) => handle(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent font-bold outline-none tracking-tight w-full ${fontSizes}`}
          style={{ color: t.text }}
        />
      </div>
      {helper ? (
        <p className="mt-1.5 text-xs font-medium" style={{ color: t.textFaint }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
