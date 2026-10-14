import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CalendarClock,
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Settings as SettingsIcon,
  Snowflake,
  SunMedium,
  TrendingUp,
} from 'lucide-react';
import { BRAND } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import { listDebts, upcomingCommitments } from '@/db/repositories/debts';
import { cardDates, listCreditCards } from '@/db/repositories/creditCards';
import { setSetting } from '@/db/repositories/settings';
import {
  STRATEGY_HELP,
  buildDebtOverview,
  plazoTexto,
  priorityText,
  type DebtOverview,
  type DebtStrategy,
  type UpcomingPayment,
} from '@/domain/debt/overview';

export function DebtsScreen({
  onNavigate,
}: {
  onNavigate: (route: string, params?: Record<string, unknown>) => void;
}) {
  const t = useTheme();
  const { settings, detectedPending } = useAppStore();

  const [data, setData] = useState<DebtOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [estrategia, setEstrategia] = useState<DebtStrategy>(
    (settings.debt_strategy as DebtStrategy) ?? 'avalanche',
  );

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [debts, cards, commitments] = await Promise.all([
        listDebts('active'),
        listCreditCards(),
        upcomingCommitments(45),
      ]);

      const cardDueDays: Record<number, number | null> = {};
      for (const c of cards) {
        const d = cardDates(c);
        cardDueDays[c.id] = d.daysToPayment ?? null;
      }

      setData(
        buildDebtOverview({
          debts,
          cards,
          commitments: commitments.map((c) => ({
            debtId: c.debt.id,
            name: c.debt.name,
            amount: c.amount,
            daysLeft: c.daysLeft,
          })),
          cardDueDays,
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstrategia = async (nueva: DebtStrategy) => {
    setEstrategia(nueva);
    await setSetting('debt_strategy', nueva);
  };

  const libreTexto =
    data?.monthsToFreedom === null
      ? 'Ajusta cuotas para proyectar'
      : data?.monthsToFreedom === 0
        ? '¡Estás libre de deudas!'
        : `Libre en ${data?.monthsToFreedom} meses`;

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* 1. Header en Navy */}
      <div className="px-4 sm:px-6 pt-4 pb-2" style={{ backgroundColor: BRAND.navy }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-wider" style={{ color: BRAND.mutedLight }}>
              TUS COMPROMISOS
            </span>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: BRAND.white }}>
              Deudas y tarjetas
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('debtForm')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90 active:scale-95 shadow-sm cursor-pointer"
              style={{ backgroundColor: BRAND.yellow, color: BRAND.navy }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva deuda</span>
            </button>
          </div>
        </div>

        {/* 2. Hero: Deuda Total y Proyección */}
        <div
          className="rounded-3xl p-5 sm:p-6 border shadow-xl relative overflow-hidden mb-5"
          style={{
            backgroundColor: BRAND.surfaceContainerLow,
            borderColor: BRAND.borderDark,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black tracking-wider uppercase" style={{ color: BRAND.coral }}>
              DEUDA TOTAL PENDIENTE
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: 'rgba(255, 111, 97, 0.12)',
                borderColor: 'rgba(255, 111, 97, 0.25)',
                color: BRAND.coral,
              }}
            >
              {data?.isEmpty ? 'Sin deudas' : 'Activa'}
            </span>
          </div>

          {loading ? (
            <Skeleton width="70%" height={44} radius={10} onDark />
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap my-1">
              <span className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: BRAND.white }}>
                {money(data?.total ?? 0)}
              </span>
              <span className="text-sm font-extrabold" style={{ color: BRAND.mutedLight }}>
                COP
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: BRAND.borderDark }}>
            <div>
              <span className="block text-[11px] font-bold uppercase" style={{ color: BRAND.mutedLight }}>
                Cuota mensual total
              </span>
              <span className="text-base font-bold" style={{ color: BRAND.white }}>
                {money(data?.monthlyCharge ?? 0)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase" style={{ color: BRAND.turquoise }}>
                Proyección honesta
              </span>
              <span className="text-base font-bold" style={{ color: BRAND.turquoise }}>
                {libreTexto}
              </span>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => onNavigate('debtPay')}
              className="flex-1 py-3 rounded-full font-black text-sm transition-all duration-150 cursor-pointer shadow-md active:scale-95 text-center"
              style={{
                backgroundColor: BRAND.turquoise,
                color: BRAND.navy,
              }}
            >
              Abonar a deuda
            </button>
          </div>
        </div>

        {/* 3. Selector de Estrategia */}
        <div
          className="rounded-2xl p-4 border mb-5"
          style={{
            backgroundColor: BRAND.surfaceContainerLow,
            borderColor: BRAND.borderDark,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: BRAND.yellow }}>
              ESTRATEGIA DE PAGO
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <button
              type="button"
              onClick={() => cambiarEstrategia('avalanche')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                estrategia === 'avalanche' ? 'bg-[#FFD447] text-[#071A2A] shadow-sm' : 'text-[#9EB5C5] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Avalancha</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarEstrategia('snowball')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                estrategia === 'snowball' ? 'bg-[#FFD447] text-[#071A2A] shadow-sm' : 'text-[#9EB5C5] hover:text-white'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Bola de Nieve</span>
            </button>
          </div>

          <p className="text-xs mt-2.5 leading-relaxed" style={{ color: BRAND.mutedLight }}>
            {STRATEGY_HELP[estrategia]}
          </p>
        </div>
      </div>

      {/* 4. Panel claro: Lista de deudas, tarjetas y vencimientos */}
      <div
        className="rounded-t-[34px] p-5 sm:p-6 shadow-2xl flex-1"
        style={{
          backgroundColor: BRAND.offWhite,
          color: BRAND.ink,
        }}
      >
        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tight mb-1" style={{ color: BRAND.ink }}>
            Próximos vencimientos
          </h2>
          <p className="text-xs font-medium" style={{ color: BRAND.mutedDark }}>
            {data ? priorityText(data) : 'Calculando orden...'}
          </p>
        </div>

        {data?.upcoming && data.upcoming.length > 0 ? (
          <div className="divide-y divide-gray-200/70 mb-6">
            {data.upcoming.map((u) => {
              const Icon = u.kind === 'credit-card' ? CreditCard : Landmark;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    if (u.kind === 'credit-card') onNavigate('creditCard', { accountId: u.refId });
                    else onNavigate('debtDetail', { debtId: u.refId });
                  }}
                  className="flex items-center gap-3 py-3.5 px-2 rounded-xl transition-all hover:bg-black/5 active:scale-[0.99] cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: BRAND.paleCoral, color: BRAND.coral }}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate" style={{ color: BRAND.ink }}>
                      {u.name}
                    </span>
                    <span className="block text-xs font-semibold" style={{ color: BRAND.coral }}>
                      Vence {plazoTexto(u.dueInDays)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="block text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
                      {money(u.amount)}
                    </span>
                    <span className="block text-[10px] uppercase font-bold" style={{ color: BRAND.mutedDark }}>
                      Cuota
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border rounded-2xl mb-6 bg-white/50">
            <p className="text-sm font-bold" style={{ color: BRAND.ink }}>
              No tienes cuotas próximas pendientes
            </p>
            <p className="text-xs mt-1" style={{ color: BRAND.mutedDark }}>
              Tus pagos están al día. ¡Gran trabajo!
            </p>
          </div>
        )}

        {/* Tarjetas de crédito resumen */}
        {data?.cards && data.cards.length > 0 ? (
          <div>
            <h3 className="text-base font-black tracking-tight mb-3" style={{ color: BRAND.ink }}>
              Tarjetas de crédito
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.cards.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('creditCard', { accountId: c.id })}
                  className="p-4 rounded-2xl border bg-white shadow-xs cursor-pointer hover:border-gray-400 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm" style={{ color: BRAND.ink }}>{c.name}</span>
                    <span className="text-xs font-black" style={{ color: BRAND.coral }}>{money(c.amountOwed)}</span>
                  </div>
                  <div className="text-xs flex justify-between" style={{ color: BRAND.mutedDark }}>
                    <span>Cupo libre: {money(c.availableCredit)}</span>
                    {c.usagePercent !== null ? <span>{c.usagePercent}% usado</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
