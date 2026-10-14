import React from 'react';
import { Bell, Moon, Settings, Sun } from 'lucide-react';
import { BRAND } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Txt } from '@/components/ui';

export function HomeHeader({
  greeting,
  name,
  hasAlerts,
  onNotifications,
  onSettings,
  onToggleTheme,
  isDark,
}: {
  greeting: string;
  name: string;
  hasAlerts: boolean;
  onNotifications: () => void;
  onSettings: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
}) {
  const t = useTheme();

  return (
    <div className="flex items-center gap-3 w-full py-2">
      {/* Brand logo mark */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#14C4D4] to-[#FFD447] flex items-center justify-center font-extrabold text-[#071A2A] text-lg shadow-md shrink-0 select-none">
        MP
      </div>

      <div className="flex-1 min-w-0">
        <span
          className="block text-[11px] font-extrabold uppercase tracking-wider leading-tight"
          style={{ color: BRAND.mutedLight }}
        >
          {greeting}
        </span>
        <h1
          className="text-xl sm:text-2xl font-black tracking-tight truncate leading-tight"
          style={{ color: BRAND.onSurface }}
        >
          {name}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onToggleTheme ? (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-5 h-5" style={{ color: BRAND.yellow }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: BRAND.onSurface }} />
            )}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onNotifications}
          aria-label="Notificaciones"
          className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
        >
          <Bell className="w-5 h-5" style={{ color: BRAND.onSurface }} />
          {hasAlerts ? (
            <span
              className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-[#071A2A]"
              style={{ backgroundColor: BRAND.coral }}
            />
          ) : null}
        </button>

        <button
          type="button"
          onClick={onSettings}
          aria-label="Ajustes"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
        >
          <Settings className="w-5 h-5" style={{ color: BRAND.onSurface }} />
        </button>
      </div>
    </div>
  );
}
