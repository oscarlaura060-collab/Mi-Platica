/**
 * FILTRAR, AGRUPAR Y RESUMIR MOVIMIENTOS
 *
 * Funciones puras, sin base de datos ni pantalla, para que el resumen se
 * pueda comprobar con numeros y no mirando la app.
 *
 * ------------------------------------------------------------------
 * LA REGLA DEL BALANCE
 * ------------------------------------------------------------------
 * En esta app "Gastos" es el consumo: comida, transporte, la cuenta de
 * internet. Un aporte a una meta y un abono a una deuda NO son gasto:
 * salen de la cuenta, si, pero uno pasa a ser ahorro tuyo y el otro baja
 * algo que debias. Mezclarlos con el gasto corriente haria creer que se
 * gasta mucho mas de lo real, y esa regla ya estaba en el resto de la
 * app (ver periodTotals).
 *
 * Pero el balance si tiene que descontarlos: la plata salio de la cuenta.
 * Entonces:
 *
 *     balance = ingresos − gastos − ahorro − deudas
 *
 * Esto quiere decir que los tres numeros grandes de la tarjeta NO se
 * restan entre si cuando hubo ahorro o abonos. Por eso, cuando los hay,
 * la tarjeta muestra una linea extra que explica a donde se fue esa
 * plata, en vez de dejar al usuario con una cuenta que no le cuadra.
 */
import type { TransactionRow } from '@/db/types';

export type MovementDirection = 'income' | 'expense' | 'saving' | 'debt';
export type MovementFilter = 'all' | 'income' | 'expense' | 'saving';

export interface MovementSummary {
  income: number;
  expenses: number;
  savings: number;
  debt: number;
  balance: number;
}

export interface MovementSection {
  /** Dia en formato YYYY-MM-DD. */
  key: string;
  data: TransactionRow[];
}

/** A que grupo pertenece un movimiento, segun su tipo. */
export function directionOf(tx: TransactionRow): MovementDirection {
  if (tx.type === 'income') return 'income';
  if (tx.type === 'goal_deposit') return 'saving';
  if (tx.type === 'debt_payment') return 'debt';
  return 'expense';
}

/**
 * La etiqueta que ve el usuario bajo el nombre: "Gasto fijo", "Ahorro"...
 * Un gasto ligado a un gasto fijo o a una cuota se nombra distinto
 * porque no es lo mismo decidir un domicilio que pagar el arriendo.
 */
export function typeLabel(tx: TransactionRow): string {
  switch (tx.type) {
    case 'income':
      return 'Ingreso';
    case 'goal_deposit':
      return 'Ahorro';
    case 'debt_payment':
      return 'Abono a deuda';
    case 'transfer':
      return 'Traslado';
    default:
      if (tx.fixed_expense_id) return 'Gasto fijo';
      if (tx.installment_plan_id) return 'Cuota';
      return 'Gasto';
  }
}

/**
 * Un traslado entre cuentas propias no es ingreso ni gasto: la plata
 * sigue siendo tuya. Se muestra en la lista pero no mueve el resumen.
 */
export function countsInSummary(tx: TransactionRow): boolean {
  return tx.type !== 'transfer';
}

export function filterMovements(
  movements: TransactionRow[],
  filter: MovementFilter,
): TransactionRow[] {
  if (filter === 'all') return [...movements];
  return movements.filter((m) => {
    const d = directionOf(m);
    if (filter === 'income') return d === 'income';
    if (filter === 'saving') return d === 'saving';
    // "Gastos" incluye los abonos a deuda: para quien filtra, ambos son
    // plata que se fue. El ahorro no, porque sigue siendo suyo.
    return d === 'expense' || d === 'debt';
  });
}

/** Agrupa por dia, del mas reciente al mas antiguo. No muta la entrada. */
export function groupMovementsByDate(
  movements: TransactionRow[],
): MovementSection[] {
  const porDia = new Map<string, TransactionRow[]>();

  for (const m of movements) {
    const lista = porDia.get(m.occurred_day);
    if (lista) lista.push(m);
    else porDia.set(m.occurred_day, [m]);
  }

  return [...porDia.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([key, data]) => ({
      key,
      // Dentro del dia, lo mas reciente primero.
      data: [...data].sort((a, b) =>
        a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0,
      ),
    }));
}

export function calculateMovementSummary(
  movements: TransactionRow[],
): MovementSummary {
  let income = 0;
  let expenses = 0;
  let savings = 0;
  let debt = 0;

  for (const m of movements) {
    if (!countsInSummary(m)) continue;
    switch (directionOf(m)) {
      case 'income':
        income += m.amount;
        break;
      case 'saving':
        savings += m.amount;
        break;
      case 'debt':
        debt += m.amount;
        break;
      default:
        expenses += m.amount;
    }
  }

  return {
    income,
    expenses,
    savings,
    debt,
    balance: income - expenses - savings - debt,
  };
}

/**
 * Lo que entro y salio de UNA cuenta.
 *
 * Se mira desde la cuenta, no desde el presupuesto, y por eso los
 * traslados si cuentan aqui: para el total de la app mover plata de
 * Nequi a Nu no cambia nada, pero para Nequi es plata que salio y para
 * Nu es plata que entro. Ignorarlos dejaria un saldo que no cuadra con
 * la suma de lo que la pantalla muestra.
 */
export function calculateAccountSummary(
  movements: TransactionRow[],
  accountId: number,
): { income: number; expenses: number } {
  let income = 0;
  let expenses = 0;

  for (const m of movements) {
    if (m.type === 'transfer') {
      if (m.to_account_id === accountId) income += m.amount;
      else if (m.account_id === accountId) expenses += m.amount;
      continue;
    }
    // Un movimiento que no es traslado solo afecta a su propia cuenta.
    if (m.account_id !== accountId) continue;
    if (directionOf(m) === 'income') income += m.amount;
    else expenses += m.amount;
  }

  return { income, expenses };
}

/**
 * La linea que explica el balance cuando los tres numeros grandes no se
 * restan a simple vista. Devuelve null si no hace falta.
 */
export function balanceNote(s: MovementSummary): string | null {
  const partes: string[] = [];
  if (s.savings > 0) partes.push('ahorro');
  if (s.debt > 0) partes.push('deudas');
  if (partes.length === 0) return null;
  return `El balance también descuenta lo que mandaste a ${partes.join(' y ')}.`;
}
