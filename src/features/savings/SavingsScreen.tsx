import React, { useCallback, useState, useEffect } from 'react';
import { useTheme, BRAND } from '@/theme';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Spacer,
  Txt,
} from '@/components/ui';
import { listGoals, type GoalProgress } from '@/db/repositories/goals';
import { listInvestments } from '@/db/repositories/investments';
import { useAppStore } from '@/store/useAppStore';
import { money, pct } from '@/utils/money';
import { Plus, PiggyBank, ShieldCheck, Target, ArrowRight } from 'lucide-react';
import type { InvestmentProgress } from '@/db/types';

export function SavingsScreen({
  onNavigate,
}: {
  onNavigate: (route: string, params?: Record<string, unknown>) => void;
}) {
  const t = useTheme();
  const { refresh, total, netWorth, availableReal } = useAppStore();

  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [invs, setInvs] = useState<InvestmentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [g, i] = await Promise.all([listGoals('all'), listInvestments()]);
      setGoals(g);
      setInvs(i);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    refresh();
  }, [load, refresh]);

  const activas = goals.filter((g) => g.status === 'active');
  const ahorrado = goals.reduce((a, g) => a + g.saved, 0);
  const objetivo = activas.reduce((a, g) => a + g.target_amount, 0);
  const invertido = invs.reduce((a, i) => a + i.balance, 0);

  return (
    <div className="w-full flex flex-col min-h-screen px-4 sm:px-6 py-6 pb-28 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="block text-[11px] font-extrabold uppercase tracking-wider" style={{ color: t.primary }}>
            TU FUTURO FINANCIERO
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: t.text }}>
            Ahorro y metas
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('goalForm')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all hover:opacity-90 active:scale-95 shadow-sm cursor-pointer"
          style={{ backgroundColor: t.primary, color: t.onPrimary }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva meta</span>
        </button>
      </div>

      {/* Tarjeta de Patrimonio y Ahorro */}
      <Card tone="primary" glass className="mb-5 p-5 sm:p-6">
        <span className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: t.textFaint }}>
          PATRIMONIO NETO
        </span>
        <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: t.text }}>
          {money(netWorth)}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t" style={{ borderColor: t.border }}>
          <div>
            <span className="text-xs font-semibold block" style={{ color: t.textFaint }}>
              Dinero líquido
            </span>
            <span className="text-lg font-bold block" style={{ color: t.text }}>
              {money(total)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold block" style={{ color: t.textFaint }}>
              En metas de ahorro
            </span>
            <span className="text-lg font-bold block" style={{ color: t.primary }}>
              {money(ahorrado)}
            </span>
          </div>
        </div>
      </Card>

      {/* Lista de Metas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: t.text }}>
            Metas activas ({activas.length})
          </h2>
          <span className="text-xs font-bold" style={{ color: t.textMuted }}>
            Total objetivo: {money(objetivo)}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: t.textMuted }}>Cargando metas...</div>
        ) : activas.length === 0 ? (
          <EmptyState
            title="Aún no tienes metas de ahorro"
            subtitle="Ponle nombre y fecha a lo que sueñas (ej. Fondo de emergencia, vacaciones, moto)."
            cta="Crear mi primera meta"
            onCta={() => onNavigate('goalForm')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activas.map((g) => {
              const porcentaje = pct(g.saved, g.target_amount);
              return (
                <div
                  key={g.id}
                  onClick={() => onNavigate('goalDetail', { goalId: g.id })}
                  className="rounded-2xl p-4 sm:p-5 border transition-all duration-150 cursor-pointer hover:scale-[1.01] active:scale-98 shadow-sm flex flex-col justify-between"
                  style={{
                    backgroundColor: t.card,
                    borderColor: t.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{g.emoji || '🎯'}</span>
                        <span className="text-base font-bold truncate" style={{ color: t.text }}>
                          {g.name}
                        </span>
                      </div>
                      <Badge label={`${Math.round(porcentaje)}%`} tone="ok" />
                    </div>

                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="text-xs block" style={{ color: t.textFaint }}>Ahorrado</span>
                        <span className="text-xl font-black" style={{ color: t.primary }}>
                          {money(g.saved)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs block" style={{ color: t.textFaint }}>Meta</span>
                        <span className="text-sm font-bold" style={{ color: t.textMuted }}>
                          {money(g.target_amount)}
                        </span>
                      </div>
                    </div>

                    <ProgressBar value={porcentaje} color={g.color || t.primary} />
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold" style={{ borderColor: t.border }}>
                    <span style={{ color: t.textFaint }}>
                      Faltan {money(g.remaining)}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: t.primary }}>
                      <span>Detalles</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Colchón de tranquilidad */}
      <Card tone="alt" className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: t.primarySoft, color: t.primary }}>
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: t.text }}>
              Fondo de tranquilidad
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
              Tener entre 1 y 3 meses de tus gastos fijos en reserva te protege ante cualquier imprevisto sin endeudarte.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
