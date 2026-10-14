import React, { useState } from 'react';
import { useTheme } from '@/theme';
import { Trash2 } from 'lucide-react';

export function SwipeRow({
  children,
  onDelete,
  onPress,
  deleteLabel = 'Eliminar',
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onPress?: () => void;
  deleteLabel?: string;
}) {
  const t = useTheme();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden group border transition-all" style={{ borderColor: t.border }}>
      <div
        onClick={onPress}
        className="w-full transition-all cursor-pointer"
        style={{ backgroundColor: t.card }}
      >
        {children}
      </div>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {showConfirm ? (
          <div className="flex items-center gap-1.5 p-1 rounded-xl shadow-lg border" style={{ backgroundColor: t.cardAlt, borderColor: t.danger }}>
            <span className="text-xs font-bold px-1" style={{ color: t.danger }}>¿Borrar?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowConfirm(false);
              }}
              className="px-2 py-1 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
              style={{ backgroundColor: t.danger }}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(false);
              }}
              className="px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
              style={{ backgroundColor: t.card, color: t.textMuted }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            title={deleteLabel}
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="p-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            style={{ backgroundColor: t.dangerSoft, color: t.danger }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
