/**
 * RESPUESTAS DEL COACH
 *
 * No hay IA ni red: son respuestas deterministas calculadas sobre el
 * snapshot financiero. Eso tiene tres ventajas sobre un chatbot:
 *   - responde al instante, sin conexion
 *   - nunca inventa una cifra
 *   - el usuario puede auditar la regla que la produjo
 */
import { money } from '@/utils/money';
import { monthsToPayoff, prioritize } from '@/domain/debt/amortization';
import {
  futureValue,
  monthlyToEffectiveAnnualBp,
  netAnnualRateBp,
} from '@/domain/invest/projection';
import type { CoachContext } from './types';

export type QuestionId =
  | 'how_am_i'
  | 'can_i_spend'
  | 'where_money_goes'
  | 'what_to_cut'
  | 'when_debt_free'
  | 'save_or_pay'
  | 'fixed_status'
  | 'emergency';

export interface Question {
  id: QuestionId;
  label: string;
  /** Pregunta que necesita un monto escrito por el usuario. */
  needsAmount?: boolean;
}

export const QUESTIONS: Question[] = [
  { id: 'how_am_i', label: '¿Como voy este mes?' },
  { id: 'can_i_spend', label: '¿Puedo gastar...?', needsAmount: true },
  { id: 'save_or_pay', label: '¿Ahorro o pago deuda?', needsAmount: true },
  { id: 'fixed_status', label: '¿Que me falta pagar?' },
  { id: 'what_to_cut', label: '¿Que puedo recortar?' },
  { id: 'when_debt_free', label: '¿Cuando salgo de deudas?' },
  { id: 'where_money_goes', label: '¿En que se me va la plata?' },
  { id: 'emergency', label: '¿Como voy con el colchon?' },
];

export interface Answer {
  text: string;
  tone: 'ok' | 'warn' | 'danger' | 'info';
  /** Cifras destacadas que acompañan la respuesta. */
  figures?: { label: string; value: string }[];
}

const pctStr = (bp: number) => (bp / 100).toFixed(1) + '%';

export function answer(
  ctx: CoachContext,
  id: QuestionId,
  amount = 0,
  extra?: { topCategory?: { name: string; total: number } | null },
): Answer {
  switch (id) {
    // ----------------------------------------------------------------
    case 'how_am_i': {
      const libre = ctx.availableReal;
      if (libre < 0) {
        return {
          tone: 'danger',
          text:
            `Vas corto. Tienes ${money(ctx.totalBalance)}, pero debes ` +
            `${money(ctx.fixedPendingTotal)} en gastos fijos y ` +
            `${money(ctx.committedTotal)} en cuotas. Te faltan ` +
            `${money(Math.abs(libre))} para llegar al fin de mes sin endeudarte.`,
          figures: [
            { label: 'Saldo', value: money(ctx.totalBalance) },
            { label: 'Comprometido', value: money(ctx.fixedPendingTotal + ctx.committedTotal) },
            { label: 'Faltante', value: money(Math.abs(libre)) },
          ],
        };
      }
      const dias = ctx.avgDailyExpense > 0 ? Math.floor(libre / ctx.avgDailyExpense) : null;
      return {
        tone: libre > ctx.emergencyBuffer ? 'ok' : 'warn',
        text:
          `Despues de cubrir gastos fijos y cuotas te quedan ${money(libre)} ` +
          `libres` +
          (dias !== null
            ? `. A tu ritmo de ${money(ctx.avgDailyExpense)} por dia, te alcanzan para ${dias} dias.`
            : '.'),
        figures: [
          { label: 'Libre de verdad', value: money(libre) },
          { label: 'Gasto hoy', value: money(ctx.spentToday) },
          { label: 'Promedio diario', value: money(ctx.avgDailyExpense) },
        ],
      };
    }

    // ----------------------------------------------------------------
    case 'can_i_spend': {
      if (amount <= 0) {
        return { tone: 'info', text: 'Escribe cuanto quieres gastar y te digo.' };
      }
      const despues = ctx.availableReal - amount;
      if (despues < 0) {
        const falta = Math.abs(despues);
        const proximo = ctx.fixedPending[0] ?? ctx.commitments[0];
        return {
          tone: 'danger',
          text:
            `No. Si gastas ${money(amount)} te quedarian faltando ${money(falta)} ` +
            `para lo que ya tienes comprometido` +
            (proximo ? ` (lo mas cercano: ${proximo.name}).` : '.') +
            ` Guardalo.`,
          figures: [
            { label: 'Libre ahora', value: money(ctx.availableReal) },
            { label: 'Quieres gastar', value: money(amount) },
            { label: 'Te faltaria', value: money(falta) },
          ],
        };
      }
      const quedaBuffer = ctx.totalBalance - amount >= ctx.emergencyBuffer;
      return {
        tone: quedaBuffer ? 'ok' : 'warn',
        text:
          `Si puedes. Te quedarian ${money(despues)} libres` +
          (quedaBuffer
            ? ' y tu colchon sigue intacto.'
            : `, pero tocarias tu colchon de ${money(ctx.emergencyBuffer)}.`),
        figures: [
          { label: 'Libre ahora', value: money(ctx.availableReal) },
          { label: 'Despues del gasto', value: money(despues) },
        ],
      };
    }

    // ----------------------------------------------------------------
    case 'save_or_pay': {
      const cara = ctx.debts
        .filter((d) => d.status === 'active' && d.outstanding > 0)
        .reduce<(typeof ctx.debts)[number] | null>(
          (best, d) => (!best || d.monthly_rate_bp > best.monthly_rate_bp ? d : best),
          null,
        );
      const mejor = [...ctx.investments].sort((a, b) => b.netAnnualBp - a.netAnnualBp)[0];

      if (!cara && !mejor) {
        return {
          tone: 'info',
          text:
            'Aun no registras deudas ni vehiculos de ahorro, asi que no hay ' +
            'nada que comparar. Registra al menos uno y te doy el numero exacto.',
        };
      }
      if (!cara) {
        return {
          tone: 'ok',
          text:
            `No tienes deudas activas: todo lo que tengas de sobra puede ir a ` +
            `ahorro` +
            (mejor ? ` (${mejor.name}, ${pctStr(mejor.netAnnualBp)} neto anual).` : '.'),
        };
      }
      const deudaEA = monthlyToEffectiveAnnualBp(cara.monthly_rate_bp);
      const invEA = mejor?.netAnnualBp ?? 0;
      const ganaDeuda = deudaEA > invEA;
      const base = amount > 0 ? amount : ctx.availableReal;

      return {
        tone: ganaDeuda ? 'warn' : 'ok',
        text: ganaDeuda
          ? `Paga deuda. ${cara.name} te cuesta ${pctStr(deudaEA)} efectivo anual y ` +
            `tu mejor ahorro rinde ${pctStr(invEA)} neto. Abonar es ganar esa tasa ` +
            `sin riesgo ni impuestos` +
            (base > 0
              ? `: sobre ${money(base)} son ${money(
                  Math.round((base * (deudaEA - invEA)) / 10_000),
                )} de diferencia en un año.`
              : '.')
          : `Ahorra. Tu inversion rinde ${pctStr(invEA)} neto y la deuda mas cara ` +
            `cuesta ${pctStr(deudaEA)}: aqui si conviene invertir.`,
        figures: [
          { label: 'Deuda mas cara', value: pctStr(deudaEA) },
          { label: 'Mejor ahorro', value: pctStr(invEA) },
        ],
      };
    }

    // ----------------------------------------------------------------
    case 'fixed_status': {
      if (!ctx.fixedPending.length) {
        return {
          tone: 'ok',
          text:
            ctx.fixedMonthlyTotal > 0
              ? 'Ya pagaste todos tus gastos fijos de este mes. Bien ahi.'
              : 'No tienes gastos fijos registrados. Registralos y sabre cuanta plata tienes de verdad.',
        };
      }
      const lista = ctx.fixedPending
        .slice(0, 5)
        .map((f) => `${f.name} (${money(f.amount)}, dia ${f.dueDay})`)
        .join(', ');
      const alcanza = ctx.totalBalance >= ctx.fixedPendingTotal;
      return {
        tone: alcanza ? 'warn' : 'danger',
        text:
          `Te faltan ${money(ctx.fixedPendingTotal)} en ${ctx.fixedPending.length} ` +
          `gasto(s): ${lista}. ` +
          (alcanza
            ? 'Con tu saldo actual alcanzas.'
            : `Con ${money(ctx.totalBalance)} no alcanzas: te faltan ${money(
                ctx.fixedPendingTotal - ctx.totalBalance,
              )}.`),
        figures: [
          { label: 'Pendiente', value: money(ctx.fixedPendingTotal) },
          { label: 'Saldo', value: money(ctx.totalBalance) },
        ],
      };
    }

    // ----------------------------------------------------------------
    case 'what_to_cut': {
      if (!ctx.trimmable.length) {
        return {
          tone: 'info',
          text:
            'Todos tus gastos fijos estan marcados como indispensables. Si ' +
            'alguno no lo es (suscripciones, gimnasio), desmarcalo y te dire ' +
            'cuanto liberas al recortarlo.',
        };
      }
      const total = ctx.trimmable.reduce((a, f) => a + f.amount, 0);
      const top = ctx.trimmable[0];
      return {
        tone: 'warn',
        text:
          `Tienes ${money(total)} al mes en gastos recortables. El mas grande es ` +
          `${top.name} con ${money(top.amount)}: cortarlo te libera ` +
          `${money(top.amount * 12)} al año.`,
        figures: ctx.trimmable.slice(0, 4).map((f) => ({
          label: f.name,
          value: money(f.amount),
        })),
      };
    }

    // ----------------------------------------------------------------
    case 'when_debt_free': {
      const activas = ctx.debts.filter((d) => d.status === 'active' && d.outstanding > 0);
      if (!activas.length) {
        return { tone: 'ok', text: 'No tienes deudas activas registradas. Libre.' };
      }
      let maxMeses = 0;
      let cualNombre = '';
      for (const d of activas) {
        const m = monthsToPayoff(d.outstanding, d.monthly_rate_bp, d.installment_amount ?? 0);
        if (m !== null && m > maxMeses) {
          maxMeses = m;
          cualNombre = d.name;
        }
      }
      if (!maxMeses) {
        return {
          tone: 'danger',
          text:
            'Con las cuotas actuales alguna deuda no se termina de pagar nunca: ' +
            'la cuota no alcanza a cubrir el interes. Sube la cuota o renegocia.',
        };
      }
      const orden = prioritize(activas, 'avalanche')[0];
      const total = activas.reduce((a, d) => a + d.outstanding, 0);
      return {
        tone: maxMeses > 36 ? 'warn' : 'info',
        text:
          `Si sigues con las cuotas actuales, sales en ${maxMeses} meses ` +
          `(la ultima en caer seria ${cualNombre}). Debes ${money(total)} en total. ` +
          `Para acortarlo, cada peso extra deberia ir a ${orden.name}.`,
        figures: [
          { label: 'Deuda total', value: money(total) },
          { label: 'Meses', value: String(maxMeses) },
        ],
      };
    }

    // ----------------------------------------------------------------
    case 'where_money_goes': {
      const top = extra?.topCategory;
      if (!top) {
        return {
          tone: 'info',
          text: 'Aun no hay gastos suficientes este mes para ver un patron.',
        };
      }
      return {
        tone: 'info',
        text:
          `Este mes lo que mas te pesa es ${top.name} con ${money(top.total)}. ` +
          `Tu gasto promedio diario es ${money(ctx.avgDailyExpense)}. Mira el ` +
          `detalle completo en la pestaña Analisis.`,
        figures: [{ label: top.name, value: money(top.total) }],
      };
    }

    // ----------------------------------------------------------------
    case 'emergency': {
      const meta = ctx.emergencyBuffer;
      if (meta <= 0) {
        return {
          tone: 'info',
          text:
            'No has fijado un colchon de emergencia. Ponlo en Ajustes: lo ' +
            'normal es entre 3 y 6 meses de tus gastos fijos, o sea entre ' +
            `${money(ctx.fixedMonthlyTotal * 3)} y ${money(ctx.fixedMonthlyTotal * 6)}.`,
        };
      }
      const liquido = ctx.totalBalance;
      if (liquido >= meta) {
        return {
          tone: 'ok',
          text: `Colchon completo: tienes ${money(liquido)} sobre una meta de ${money(meta)}.`,
          figures: [{ label: 'Colchon', value: money(liquido) }],
        };
      }
      const falta = meta - liquido;
      const mensual = Math.max(Math.round(falta / 6), 1);
      return {
        tone: 'warn',
        text:
          `Te faltan ${money(falta)} para tu colchon de ${money(meta)}. ` +
          `Ahorrando ${money(mensual)} al mes lo completas en 6 meses` +
          (ctx.investments.length
            ? `; puesto en ${ctx.investments[0].name} llegarias a ` +
              `${money(futureValue(liquido, mensual, ctx.investments[0].netAnnualBp, 6))}.`
            : '.'),
        figures: [
          { label: 'Tienes', value: money(liquido) },
          { label: 'Meta', value: money(meta) },
        ],
      };
    }
  }
}

export { netAnnualRateBp };
