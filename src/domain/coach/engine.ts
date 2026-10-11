/**
 * COACH FINANCIERO LOCAL — motor de reglas deterministas.
 *
 * Sin IA, sin red: son reglas puras sobre el snapshot financiero. Esto hace
 * que el consejo sea (a) instantaneo, (b) explicable y (c) auditable por el
 * usuario desde Ajustes.
 *
 * Diseno: funciones PURAS. El contexto se arma fuera (buildContext) y aqui
 * solo se decide. Asi se puede testear sin base de datos.
 */
import { money } from '@/utils/money';
import { prioritize } from '@/domain/debt/amortization';
import { futureValue } from '@/domain/invest/projection';
import { nextDueDate, daysUntil, format } from '@/utils/date';
import { es } from 'date-fns/locale';
import type {
  AllocationPlan,
  AllocationSlice,
  CoachAlert,
  CoachContext,
  CoachVerdict,
  ExpenseIntent,
  IncomeIntent,
  Severity,
} from './types';

const worst = (a: Severity, b: Severity): Severity => {
  const rank = { info: 0, warn: 1, block: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
};

function ruleOn(ctx: CoachContext, code: string) {
  const r = ctx.rules[code];
  return r?.enabled ? r : null;
}

// ---------------------------------------------------------------------------
// EVALUACION DE UN GASTO (se llama ANTES de guardar)
// ---------------------------------------------------------------------------
export function evaluateExpense(
  ctx: CoachContext,
  intent: ExpenseIntent,
): CoachVerdict {
  const alerts: CoachAlert[] = [];
  const account = ctx.accounts.find((a) => a.id === intent.accountId);
  const accountBalance = account?.balance ?? 0;
  const isEssential = intent.category?.is_essential === 1;

  // R1 — Fondos insuficientes en la cuenta elegida.
  const r1 = ruleOn(ctx, 'INSUFFICIENT_FUNDS');
  if (r1 && account && account.type !== 'credit_card' && intent.amount > accountBalance) {
    alerts.push({
      code: 'INSUFFICIENT_FUNDS',
      severity: r1.severity,
      title: 'No te alcanza en esa cuenta',
      message:
        `En ${account.name} tienes ${money(accountBalance)} y quieres gastar ` +
        `${money(intent.amount)}. Te faltan ${money(intent.amount - accountBalance)}. ` +
        `Cambia de cuenta o baja el monto.`,
      action: { kind: 'reduce', amount: accountBalance, label: 'Usar el maximo disponible' },
    });
  }

  // R1.5 — El gasto se come los gastos fijos del mes que aun no pagas.
  // Esta regla es la que mas plata salva: la gente mira el saldo y olvida
  // que el arriendo todavia no ha salido.
  const rFixed = ruleOn(ctx, 'FIXED_EXPENSES_AT_RISK');
  if (rFixed && ctx.fixedPendingTotal > 0) {
    const despues = ctx.totalBalance - intent.amount - ctx.fixedPendingTotal;
    if (despues < 0) {
      const proximo = ctx.fixedPending[0];
      const faltante = Math.abs(despues);
      alerts.push({
        code: 'FIXED_EXPENSES_AT_RISK',
        severity: isEssential ? 'warn' : rFixed.severity,
        title: isEssential
          ? 'Ojo: te quedas corto para los gastos fijos'
          : 'Esa plata ya tiene dueño',
        message:
          `Este mes te faltan por pagar ${money(ctx.fixedPendingTotal)} en gastos ` +
          `fijos` +
          (proximo ? ` (el proximo: ${proximo.name}, dia ${proximo.dueDay})` : '') +
          `. Si gastas ${money(intent.amount)} te quedarian faltando ` +
          `${money(faltante)} para cubrirlos.`,
        action: { kind: 'save', amount: intent.amount, label: 'Mejor no gastarlo' },
      });
    }
  }

  // R2 — El gasto compromete cuotas proximas (el corazon del modo consejero).
  const r2 = ruleOn(ctx, 'COMMITMENTS_AT_RISK');
  const yaAvisoFijos = alerts.some((a) => a.code === 'FIXED_EXPENSES_AT_RISK');
  if (r2 && ctx.committedTotal > 0 && !yaAvisoFijos) {
    const libreDespues = ctx.totalBalance - intent.amount - ctx.committedTotal;
    if (libreDespues < 0) {
      const next = ctx.commitments[0];
      const faltante = Math.abs(libreDespues);
      alerts.push({
        code: 'COMMITMENTS_AT_RISK',
        severity: isEssential ? 'warn' : r2.severity,
        title: isEssential
          ? 'Cuidado: quedas corto para tus cuotas'
          : 'Mejor no gastes en esto',
        message:
          `Tienes ${money(ctx.committedTotal)} comprometidos en cuotas de los ` +
          `proximos ${r2.params.horizonDays ?? 15} dias` +
          (next ? ` (la mas cercana: ${next.name} en ${next.daysLeft} dias)` : '') +
          `. Si gastas ${money(intent.amount)} te quedarian faltando ` +
          `${money(faltante)}. Guardalo para tu cuota pendiente.`,
        // debtId negativo = es una tarjeta, no una fila de `debts`: no se
        // puede abrir la pantalla de abono, asi que se sugiere guardar.
        action:
          next && next.debtId > 0
            ? {
                kind: 'pay_debt',
                debtId: next.debtId,
                amount: Math.min(intent.amount, next.amount),
                label: `Abonar a ${next.name}`,
              }
            : { kind: 'save', amount: intent.amount, label: 'Guardarlo' },
      });
    }
  }

  // R3 — Rompe el colchon de emergencia.
  const r3 = ruleOn(ctx, 'BUFFER_BREACH');
  if (r3 && ctx.emergencyBuffer > 0) {
    const after = ctx.totalBalance - intent.amount;
    if (after < ctx.emergencyBuffer && ctx.totalBalance >= ctx.emergencyBuffer) {
      alerts.push({
        code: 'BUFFER_BREACH',
        severity: isEssential ? 'info' : r3.severity,
        title: 'Vas a tocar tu colchon',
        message:
          `Tu colchon de emergencia es ${money(ctx.emergencyBuffer)}. Despues de ` +
          `este gasto quedarias en ${money(after)}.`,
        action: { kind: 'none' },
      });
    }
  }

  // R4 — Presupuesto de la categoria excedido.
  const r4 = ruleOn(ctx, 'BUDGET_EXCEEDED');
  const budget = intent.category?.monthly_budget ?? null;
  if (r4 && budget && budget > 0) {
    const spent = intent.categorySpentThisMonth ?? 0;
    if (spent + intent.amount > budget) {
      const exceso = spent + intent.amount - budget;
      alerts.push({
        code: 'BUDGET_EXCEEDED',
        severity: r4.severity,
        title: `Pasas el tope de ${intent.category!.name}`,
        message:
          `Presupuesto del mes: ${money(budget)}. Ya llevas ${money(spent)} y esto ` +
          `lo deja en ${money(spent + intent.amount)} (${money(exceso)} de mas).`,
        action: {
          kind: 'reduce',
          amount: Math.max(budget - spent, 0),
          label: 'Ajustar al tope',
        },
      });
    }
  }

  // R5 — Pico de gasto no esencial frente al promedio.
  const r5 = ruleOn(ctx, 'NON_ESSENTIAL_SPIKE');
  if (r5 && !isEssential && ctx.avgDailyExpense > 0) {
    const mult = r5.params.multiplier ?? 1.8;
    const min = r5.params.minAmount ?? 0;
    const hoyConEste = ctx.spentToday + intent.amount;
    if (intent.amount >= min && hoyConEste > ctx.avgDailyExpense * mult) {
      alerts.push({
        code: 'NON_ESSENTIAL_SPIKE',
        severity: r5.severity,
        title: 'Hoy vas muy por encima de tu promedio',
        message:
          `Tu promedio diario es ${money(ctx.avgDailyExpense)} y hoy ya llevarias ` +
          `${money(hoyConEste)}. No es un gasto esencial: ?puede esperar 24 horas?`,
        action: { kind: 'save', amount: intent.amount, label: 'Posponerlo' },
      });
    }
  }

  // R6 — Hay cuotas vencidas sin pagar.
  const r6 = ruleOn(ctx, 'DEBT_OVERDUE');
  if (r6 && ctx.overdueDebtIds.length && !isEssential) {
    const d = ctx.debts.find((x) => x.id === ctx.overdueDebtIds[0]);
    if (d) {
      alerts.push({
        code: 'DEBT_OVERDUE',
        severity: r6.severity,
        title: 'Tienes una cuota vencida',
        message:
          `${d.name} vencio el dia ${d.due_day} y aun no registras el pago de este ` +
          `mes. Cada dia de mora cuesta mas que este gasto.`,
        action: {
          kind: 'pay_debt',
          debtId: d.id,
          amount: Math.min(intent.amount, d.outstanding),
          label: `Pagar ${d.name}`,
        },
      });
    }
  }

  // R7 — Compra grande relativa al saldo (solo informa, no bloquea).
  const r7 = ruleOn(ctx, 'BIG_TICKET');
  if (r7 && ctx.totalBalance > 0) {
    const share = (intent.amount / ctx.totalBalance) * 100;
    const limit = r7.params.pctOfBalance ?? 25;
    if (share >= limit) {
      alerts.push({
        code: 'BIG_TICKET',
        severity: r7.severity,
        title: 'Es una tajada grande de tu plata',
        message: `Este gasto representa el ${share.toFixed(0)}% de tu saldo total.`,
        action: { kind: 'none' },
      });
    }
  }

  if (!alerts.length) return { level: 'ok', alerts: [] };
  const level = alerts.reduce<Severity>((acc, a) => worst(acc, a.severity), 'info');
  return { level: level === 'info' ? 'warn' : level, alerts: sortAlerts(alerts) };
}

function sortAlerts(alerts: CoachAlert[]) {
  const rank = { block: 0, warn: 1, info: 2 } as const;
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ---------------------------------------------------------------------------
// DISTRIBUCION DE UN INGRESO
// ---------------------------------------------------------------------------
/**
 * Prioridad del reparto cuando entra plata:
 *   1. Gastos fijos del mes que aun no se pagan (arriendo, servicios).
 *   2. Cuotas de deuda que vencen en el horizonte corto.
 *   3. Del excedente: % a deudas segun estrategia, % a ahorro/inversion
 *      y el resto libre.
 *
 * El orden importa: de nada sirve abonar a una deuda si el arriendo se
 * queda sin pagar y toca sacarlo de una tarjeta al 2,5% mensual.
 */
export function allocateIncome(
  ctx: CoachContext,
  intent: IncomeIntent,
  split: { debt: number; save: number; free: number },
  strategy: 'avalanche' | 'snowball',
): AllocationPlan {
  const slices: AllocationSlice[] = [];
  let remaining = intent.amount;

  // 1. Gastos fijos pendientes del mes, si el saldo actual no los cubre.
  const fixedUncovered = Math.max(
    ctx.fixedPendingTotal - Math.max(ctx.totalBalance, 0),
    0,
  );
  if (fixedUncovered > 0) {
    let reserve = Math.min(fixedUncovered, remaining);
    for (const f of ctx.fixedPending) {
      if (reserve <= 0 || remaining <= 0) break;
      const take = Math.min(f.amount, reserve, remaining);
      if (take <= 0) continue;
      slices.push({
        kind: 'fixed',
        label: f.name,
        amount: take,
        reason: `Gasto fijo del mes, vence el dia ${f.dueDay}. Se separa antes que nada.`,
      });
      remaining -= take;
      reserve -= take;
    }
  }

  // 2. Cuotas de deuda proximas.
  const uncovered = Math.max(
    ctx.committedTotal - Math.max(ctx.totalBalance - ctx.fixedPendingTotal, 0),
    0,
  );
  if (uncovered > 0) {
    let reserve = Math.min(uncovered, remaining);
    for (const c of ctx.commitments) {
      if (reserve <= 0 || remaining <= 0) break;
      const take = Math.min(c.amount, reserve, remaining);
      if (take <= 0) continue;
      slices.push({
        kind: 'commitment',
        // Solo las deudas reales se pueden abonar automaticamente; las
        // tarjetas llegan con id negativo y quedan como aviso.
        debtId: c.debtId > 0 ? c.debtId : undefined,
        label: `Cuota ${c.name}`,
        amount: take,
        reason: `Vence en ${c.daysLeft} dia(s). Esto se separa primero.`,
      });
      remaining -= take;
      reserve -= take;
    }
  }

  // 2. Excedente.
  const surplus = remaining;
  const activeDebts = prioritize(
    ctx.debts.filter((d) => d.status === 'active' && d.outstanding > 0),
    strategy,
  );

  if (surplus > 0) {
    const pctDebt = activeDebts.length ? split.debt : 0;
    const pctSave = activeDebts.length ? split.save : split.save + split.debt;

    let toDebt = Math.round((surplus * pctDebt) / 100);
    const toSave = Math.round((surplus * pctSave) / 100);
    let toFree = surplus - toDebt - toSave;

    // Reparto a deudas: la prioritaria se lleva lo suyo hasta saldarse y el
    // sobrante baja a la siguiente (efecto bola de nieve real).
    for (const d of activeDebts) {
      if (toDebt <= 0) break;
      const take = Math.min(toDebt, d.outstanding);
      slices.push({
        kind: 'debt',
        debtId: d.id,
        label: `Abono a ${d.name}`,
        amount: take,
        reason:
          strategy === 'avalanche'
            ? `Tasa ${(d.monthly_rate_bp / 100).toFixed(2)}% mensual: es la que mas cuesta.`
            : `Saldo ${money(d.outstanding)}: la mas facil de cerrar.`,
      });
      toDebt -= take;
    }
    if (toDebt > 0) toFree += toDebt; // ya no hay deuda que cubrir

    if (toSave > 0) {
      // Si ya tiene vehiculos de ahorro, el consejo deja de ser generico:
      // dice EN CUAL ponerlo y por que ese y no otro.
      const needsBuffer = ctx.totalBalance < ctx.emergencyBuffer;
      const candidates = [...ctx.investments].sort(
        (a, b) => b.netAnnualBp - a.netAnnualBp,
      );
      // Sin colchon, manda la liquidez por encima de la rentabilidad.
      const target = needsBuffer
        ? (candidates.find((i) => i.liquidity === 'immediate') ?? candidates[0])
        : candidates[0];

      slices.push({
        kind: target ? 'invest' : 'save',
        investmentId: target?.id,
        label: target ? `Invertir en ${target.name}` : 'Ahorro / colchon',
        amount: toSave,
        reason: target
          ? needsBuffer
            ? `Rinde ${(target.netAnnualBp / 100).toFixed(1)}% neto anual y puedes ` +
              `sacarlo cuando quieras: sirve de colchon.`
            : `Es tu vehiculo de mejor rendimiento: ${(
                target.netAnnualBp / 100
              ).toFixed(1)}% neto anual.`
          : needsBuffer
            ? `Tu colchon esta por debajo de ${money(ctx.emergencyBuffer)}.`
            : 'Registra un vehiculo de ahorro para que esta plata trabaje.',
      });
    }
    if (toFree > 0) {
      slices.push({
        kind: 'free',
        label: 'Libre para gastar',
        amount: toFree,
        reason: 'Ya cubriste cuotas y ahorro.',
      });
    }
  }

  const debtTotal = slices
    .filter((s) => s.kind === 'debt' || s.kind === 'commitment')
    .reduce((a, s) => a + s.amount, 0);
  const fixedTotal = slices
    .filter((s) => s.kind === 'fixed')
    .reduce((a, s) => a + s.amount, 0);

  // --- Que pasa con la plata que va a inversion --------------------------
  const investSlice = slices.find((s) => s.kind === 'invest' || s.kind === 'save');
  let investmentOutlook: AllocationPlan['investmentOutlook'] = null;

  if (investSlice && investSlice.amount > 0) {
    const target = ctx.investments.find((i) => i.id === investSlice.investmentId);
    // Sin vehiculo registrado se usa una referencia conservadora (9% E.A.,
    // un CDT corriente en Colombia) solo para ilustrar el costo de no hacerlo.
    const rateBp = target?.netAnnualBp ?? 900;
    investmentOutlook = {
      amount: investSlice.amount,
      targetName: target?.name ?? null,
      netAnnualBp: rateBp,
      inOneYear: futureValue(investSlice.amount, 0, rateBp, 12),
      inFiveYears: futureValue(investSlice.amount, 0, rateBp, 60),
      inTenYears: futureValue(investSlice.amount, 0, rateBp, 120),
      monthlyInTenYears: futureValue(0, investSlice.amount, rateBp, 120),
    };
  }

  let headline: string;
  if (fixedTotal > 0) {
    headline =
      `De ${money(intent.amount)}, aparta ${money(fixedTotal)} para tus gastos ` +
      `fijos antes de cualquier otra cosa.`;
  } else if (debtTotal > 0) {
    headline = `De ${money(intent.amount)}, destina ${money(debtTotal)} a tus deudas.`;
  } else if (investmentOutlook) {
    headline =
      `De ${money(intent.amount)}, ${money(investmentOutlook.amount)} pueden ` +
      `ponerse a trabajar desde hoy.`;
  } else {
    headline = `Asi queda repartido tu ingreso de ${money(intent.amount)}.`;
  }

  return { total: intent.amount, slices, headline, investmentOutlook };
}

// ---------------------------------------------------------------------------
// TARJETA DE CONSEJO DEL DIA (pantalla principal)
// ---------------------------------------------------------------------------
export function dailyAdvice(ctx: CoachContext): CoachAlert | null {
  // Tarjeta a punto de vencer: es lo mas caro si se pasa de fecha.
  const tarjeta = ctx.commitments.find((c) => c.debtId < 0 && c.daysLeft <= 3);
  if (tarjeta) {
    return {
      code: 'CARD_DUE_SOON',
      severity: ctx.totalBalance < tarjeta.amount ? 'block' : 'warn',
      title:
        tarjeta.daysLeft === 0
          ? `${tarjeta.name}: hoy vence el pago`
          : `${tarjeta.name}: ${tarjeta.daysLeft} dia(s) para pagar`,
      message:
        `Debes cubrir ${money(tarjeta.amount)}. ` +
        (ctx.totalBalance < tarjeta.amount
          ? `Te faltan ${money(tarjeta.amount - ctx.totalBalance)}.`
          : 'Pasarte de fecha activa intereses de mora sobre todo el saldo.'),
      action: { kind: 'none' },
    };
  }

  if (ctx.overdueDebtIds.length) {
    const d = ctx.debts.find((x) => x.id === ctx.overdueDebtIds[0]);
    if (d) {
      return {
        code: 'DEBT_OVERDUE',
        severity: 'block',
        title: `${d.name} esta vencida`,
        message: `Registra o programa el pago hoy mismo. Saldo: ${money(d.outstanding)}.`,
        action: {
          kind: 'pay_debt',
          debtId: d.id,
          amount: d.installment_amount ?? 0,
          label: 'Abonar ahora',
        },
      };
    }
  }

  // Gasto fijo a punto de vencer y sin pagar.
  const hoy = new Date().getDate();
  const fijoUrgente = ctx.fixedPending.find((f) => f.dueDay - hoy <= 3);
  if (fijoUrgente) {
    const dias = fijoUrgente.dueDay - hoy;
    return {
      code: 'FIXED_DUE_SOON',
      severity: ctx.totalBalance < fijoUrgente.amount ? 'block' : 'warn',
      title:
        dias < 0
          ? `${fijoUrgente.name} esta atrasado`
          : dias === 0
            ? `${fijoUrgente.name} vence hoy`
            : `${fijoUrgente.name} vence en ${dias} dia(s)`,
      message:
        `Son ${money(fijoUrgente.amount)}. ` +
        (ctx.totalBalance < fijoUrgente.amount
          ? `Solo tienes ${money(ctx.totalBalance)}: te faltan ${money(
              fijoUrgente.amount - ctx.totalBalance,
            )}.`
          : `Ya los tienes. Registralo apenas lo pagues.`),
      action: { kind: 'none' },
    };
  }

  // Lo libre de verdad esta en rojo.
  if (ctx.availableReal < 0 && ctx.fixedMonthlyTotal > 0) {
    return {
      code: 'NEGATIVE_AVAILABLE',
      severity: 'block',
      title: 'Tu plata libre esta en rojo',
      message:
        `Tienes ${money(ctx.totalBalance)}, pero debes ${money(
          ctx.fixedPendingTotal,
        )} en gastos fijos y ${money(ctx.committedTotal)} en cuotas. ` +
        `Te faltan ${money(Math.abs(ctx.availableReal))} para llegar al fin de mes.`,
      action: { kind: 'none' },
    };
  }

  const next = ctx.commitments[0];
  if (next && next.daysLeft <= 5) {
    const falta = Math.max(next.amount - ctx.totalBalance, 0);
    return {
      code: 'COMMITMENT_SOON',
      severity: falta > 0 ? 'warn' : 'info',
      title: `${next.name}: ${next.daysLeft === 0 ? 'vence hoy' : `faltan ${next.daysLeft} dias`}`,
      message:
        falta > 0
          ? `Necesitas ${money(next.amount)} y te faltan ${money(falta)}.`
          : `Ya tienes cubierta la cuota de ${money(next.amount)}. Separala hoy.`,
      action: {
        kind: 'pay_debt',
        debtId: next.debtId,
        amount: next.amount,
        label: 'Abonar',
      },
    };
  }

  if (ctx.totalBalance < ctx.emergencyBuffer) {
    const falta = ctx.emergencyBuffer - ctx.totalBalance;
    return {
      code: 'BUFFER_LOW',
      severity: 'warn',
      title: `Te faltan ${money(falta)} para tu colchon`,
      message:
        `Tu meta es ${money(ctx.emergencyBuffer)} y hoy tienes ${money(ctx.totalBalance)}. ` +
        `Lo que no gastes esta semana te acerca.`,
      action: { kind: 'none' },
    };
  }

  // ---------------------------------------------------------------
  // CONSEJO CONCRETO CON LA PLATA LIBRE
  //
  // Esta es la forma util del consejo: una cifra real, un destino y
  // una fecha que existe. "Vas bien" no le sirve a nadie.
  // ---------------------------------------------------------------
  const libre = ctx.availableReal;

  if (libre > 0) {
    // 1. Si hay una meta cerca, el destino mas motivador es esa meta.
    if (ctx.topGoal && ctx.topGoal.remaining > 0) {
      const aporta = Math.min(libre, ctx.topGoal.remaining);
      const quedaria = ctx.topGoal.remaining - aporta;
      return {
        code: 'FREE_TO_GOAL',
        severity: 'info',
        title: `Te quedan ${money(libre)} libres`,
        message:
          `Si no los necesitas, ${money(aporta)} en ${ctx.topGoal.name} te dejan ` +
          (quedaria > 0
            ? `a ${money(quedaria)} de cumplirla.`
            : `con la meta cumplida.`),
        action: { kind: 'save', amount: aporta, label: `Guardar en ${ctx.topGoal.name}` },
      };
    }

    // 2. Si no hay meta pero si un gasto fijo proximo, se sugiere
    //    reservarlos hasta esa fecha concreta.
    const proximoFijo = ctx.fixedPending[0];
    if (proximoFijo) {
      const fecha = nextDueDate(proximoFijo.dueDay);
      const dias = daysUntil(fecha);
      return {
        code: 'FREE_UNTIL_FIXED',
        severity: 'info',
        title: `Te quedan ${money(libre)} libres`,
        message:
          `Si no los necesitas, guardalos hasta el ${format(fecha, "d 'de' LLLL", {
            locale: es,
          })}` +
          (dias > 0 ? ` (en ${dias} dias)` : '') +
          ` para ${proximoFijo.name}: son ${money(proximoFijo.amount)}.`,
        action: { kind: 'none' },
      };
    }

    // 3. Si lo que viene es el proximo ingreso, se traduce a un ritmo
    //    diario, que es lo accionable.
    if (ctx.nextIncome && ctx.nextIncome.daysLeft > 0) {
      const porDia = Math.floor(libre / ctx.nextIncome.daysLeft);
      return {
        code: 'FREE_UNTIL_INCOME',
        severity: 'info',
        title: `Te quedan ${money(libre)} libres`,
        message:
          `Faltan ${ctx.nextIncome.daysLeft} dias para ${ctx.nextIncome.name}: ` +
          `puedes gastar ${money(porDia)} al dia y llegas tranquilo.`,
        action: { kind: 'none' },
      };
    }
  }

  if (ctx.spentToday === 0) {
    return {
      code: 'LOG_TODAY',
      severity: 'info',
      title: 'Sin gastos registrados hoy',
      message:
        ctx.avgDailyExpense > 0
          ? `Tu promedio diario es ${money(ctx.avgDailyExpense)}. Si gastaste algo, ` +
            `registralo en dos toques.`
          : 'Si gastaste algo, registralo en dos toques.',
      action: { kind: 'none' },
    };
  }

  // Comparacion honesta contra el propio promedio.
  if (ctx.avgDailyExpense > 0 && ctx.spentToday > ctx.avgDailyExpense) {
    const exceso = ctx.spentToday - ctx.avgDailyExpense;
    return {
      code: 'ABOVE_AVERAGE',
      severity: 'info',
      title: `Hoy llevas ${money(ctx.spentToday)}`,
      message:
        `Son ${money(exceso)} mas que tu promedio de ${money(ctx.avgDailyExpense)}. ` +
        `No pasa nada si fue algo puntual; solo para que lo tengas presente.`,
      action: { kind: 'none' },
    };
  }

  return {
    code: 'ON_TRACK',
    severity: 'info',
    title: `Hoy llevas ${money(ctx.spentToday)}`,
    message:
      ctx.avgDailyExpense > 0
        ? `Por debajo de tu promedio de ${money(ctx.avgDailyExpense)}. Asi se construye.`
        : 'Vas registrando, que es lo que cuenta.',
    action: { kind: 'none' },
  };
}
