/**
 * EL PLAN DE UN INGRESO, EN TRES BOLSAS
 *
 * El coach ya sabe armar destinos concretos y ejecutables (este arriendo,
 * esta tarjeta, esta deuda) en `destinations.ts`. Eso es preciso pero
 * largo: nadie quiere leer catorce filas cuando le acaba de caer el
 * sueldo.
 *
 * Aqui esos destinos se agrupan en tres bolsas que si caben en la cabeza:
 *
 *   Compromisos  lo que ya debes: gastos fijos, tarjetas, deudas
 *   Ahorro       metas e inversiones
 *   Disponible   lo que queda para vivir
 *
 * Los porcentajes NO son fijos. Salen de dividir cada bolsa entre el
 * ingreso, asi que son un reflejo de la situacion real de la persona y no
 * una regla copiada de un libro. Si alguien debe el 90% de su sueldo, la
 * app lo dice; no finge un 60/20/20.
 *
 * Nada de esto mueve plata en un banco. Aplicar el plan registra los
 * pagos y aportes DENTRO de la app, que es lo unico que la app puede
 * hacer con honestidad.
 */
import type { Destination, DestinationPlan } from './destinations';

export type BucketKey = 'commitments' | 'savings' | 'available';

export type IncomeCoachStep =
  | 'recommendation'
  | 'selection'
  | 'accounts'
  | 'review'
  | 'applied';

/** A donde puede ir una bolsa. */
export type DestinationType = 'commitments' | 'savings-goal' | 'account' | 'unassigned';

export interface BucketItem {
  /** La clave del destino concreto en `destinations.ts`. */
  key: string;
  label: string;
  amount: number;
}

export interface Bucket {
  key: BucketKey;
  title: string;
  description: string;
  /** Monto propuesto para esta bolsa. */
  amount: number;
  /** Porcentaje del ingreso, redondeado para mostrar. */
  percentage: number;
  /** ¿El usuario la incluyo en este ingreso? */
  selected: boolean;
  /** Los destinos reales que hay detras. Vacio = no hay nada que pagar. */
  items: BucketItem[];
  destinationType: DestinationType;
  /** Id del destino elegido: id de meta, de cuenta, o null. */
  destinationId: number | null;
  destinationName: string | null;
}

export interface IncomePlan {
  income: number;
  buckets: Bucket[];
  /** Lo que queda sin asignar: bolsas desmarcadas. Nunca se esconde. */
  unassigned: number;
  /** Lo que si se va a aplicar. */
  applied: number;
}

export const BUCKET_TITLE: Record<BucketKey, string> = {
  commitments: 'Compromisos',
  savings: 'Ahorro',
  available: 'Disponible',
};

const BUCKET_DESC: Record<BucketKey, string> = {
  commitments: 'Vivienda, servicios, transporte, mercado, etc.',
  savings: 'Tu futuro tambien cuenta.',
  available: 'Para tus gustos, planes y lo que se presente.',
};

/** Que bolsa le corresponde a cada tipo de destino concreto. */
function bucketOf(d: Destination): BucketKey {
  if (d.kind === 'invest' || d.kind === 'goal') return 'savings';
  return 'commitments';
}

/**
 * Reparte un entero en porcentajes que suman exactamente 100.
 *
 * Redondear cada parte por separado da 33+33+33=99 o 34+34+34=102. Aqui
 * se reparte el sobrante por el metodo del resto mayor, para que la suma
 * cuadre siempre y el usuario no vea un total raro.
 */
export function wholePercentages(amounts: number[], total: number): number[] {
  if (total <= 0) return amounts.map(() => 0);

  const exactos = amounts.map((a) => (a * 100) / total);
  const base = exactos.map(Math.floor);
  let resto = 100 - base.reduce((a, b) => a + b, 0);

  // Los que mas perdieron al redondear hacia abajo reciben el sobrante.
  const orden = exactos
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of orden) {
    if (resto <= 0) break;
    base[i] += 1;
    resto -= 1;
  }
  return base;
}

/**
 * Arma las tres bolsas a partir del plan de destinos concretos.
 *
 * `plan.destinations[].suggested` ya trae el reparto que calculo el
 * coach con las reglas de siempre (primero lo fijo, luego tarjetas,
 * luego deudas, luego ahorro). Aqui solo se agrupa: no se vuelve a
 * decidir nada, para que la app no diga dos cosas distintas.
 */
export function buildIncomePlan(input: {
  income: number;
  plan: DestinationPlan;
  /** Cuenta donde cayo el ingreso: es el destino por defecto de "Disponible". */
  sourceAccountId: number;
  sourceAccountName: string;
  /** Meta de ahorro preferida, si hay. */
  preferredGoal?: { id: number; name: string } | null;
}): IncomePlan {
  const { income, plan, sourceAccountId, sourceAccountName } = input;

  const porBolsa: Record<BucketKey, BucketItem[]> = {
    commitments: [],
    savings: [],
    available: [],
  };

  for (const d of plan.destinations) {
    if (d.suggested <= 0) continue;
    porBolsa[bucketOf(d)].push({
      key: d.key,
      label: d.label,
      amount: d.suggested,
    });
  }

  const sum = (items: BucketItem[]) => items.reduce((a, b) => a + b.amount, 0);
  const compromisos = sum(porBolsa.commitments);
  const ahorro = sum(porBolsa.savings);

  // Lo que no se comprometio queda disponible. Nunca negativo: si los
  // destinos sumaran mas que el ingreso seria un error de calculo aguas
  // arriba, y aqui preferimos mostrar cero antes que un numero absurdo.
  const disponible = Math.max(income - compromisos - ahorro, 0);

  const montos = [compromisos, ahorro, disponible];
  const pcts = wholePercentages(montos, income);

  // La meta de ahorro elegida: la que venga sugerida, o el primer destino
  // de ahorro que sea una meta.
  const metaSugerida =
    input.preferredGoal ??
    (() => {
      const d = plan.destinations.find((x) => x.kind === 'goal' && x.suggested > 0);
      return d ? { id: d.refId, name: d.label } : null;
    })();

  const buckets: Bucket[] = [
    {
      key: 'commitments',
      title: BUCKET_TITLE.commitments,
      description: BUCKET_DESC.commitments,
      amount: compromisos,
      percentage: pcts[0],
      selected: compromisos > 0,
      items: porBolsa.commitments,
      destinationType: 'commitments',
      destinationId: null,
      destinationName:
        porBolsa.commitments.length === 1
          ? porBolsa.commitments[0].label
          : porBolsa.commitments.length > 1
            ? `${porBolsa.commitments.length} compromisos`
            : null,
    },
    {
      key: 'savings',
      title: BUCKET_TITLE.savings,
      description: BUCKET_DESC.savings,
      amount: ahorro,
      percentage: pcts[1],
      selected: ahorro > 0,
      items: porBolsa.savings,
      destinationType: metaSugerida ? 'savings-goal' : 'unassigned',
      destinationId: metaSugerida?.id ?? null,
      destinationName: metaSugerida?.name ?? null,
    },
    {
      key: 'available',
      title: BUCKET_TITLE.available,
      description: BUCKET_DESC.available,
      amount: disponible,
      percentage: pcts[2],
      // Disponible se marca solo si hay algo. No tiene accion propia:
      // la plata ya esta en la cuenta donde cayo el ingreso.
      selected: disponible > 0,
      items: [],
      destinationType: 'account',
      destinationId: sourceAccountId,
      destinationName: sourceAccountName,
    },
  ];

  return withTotals({ income, buckets, unassigned: 0, applied: 0 });
}

/** Recalcula lo aplicado y lo que queda para despues. */
export function withTotals(plan: IncomePlan): IncomePlan {
  const applied = plan.buckets
    .filter((b) => b.selected)
    .reduce((a, b) => a + b.amount, 0);
  return { ...plan, applied, unassigned: Math.max(plan.income - applied, 0) };
}

export function toggleBucket(plan: IncomePlan, key: BucketKey): IncomePlan {
  return withTotals({
    ...plan,
    buckets: plan.buckets.map((b) =>
      b.key === key ? { ...b, selected: !b.selected } : b,
    ),
  });
}

/** Desmarca todo: "dejar disponible para despues". */
export function leaveAllForLater(plan: IncomePlan): IncomePlan {
  return withTotals({
    ...plan,
    buckets: plan.buckets.map((b) => ({ ...b, selected: false })),
  });
}

export function setDestination(
  plan: IncomePlan,
  key: BucketKey,
  dest: { type: DestinationType; id: number | null; name: string | null },
): IncomePlan {
  return withTotals({
    ...plan,
    buckets: plan.buckets.map((b) =>
      b.key === key
        ? {
            ...b,
            destinationType: dest.type,
            destinationId: dest.id,
            destinationName: dest.name,
          }
        : b,
    ),
  });
}

export interface Problem {
  bucket: BucketKey | null;
  message: string;
}

/**
 * Que impide aplicar el plan. Devuelve la lista completa, no el primer
 * problema: es mas util ver todo lo que hay que arreglar de una vez.
 */
export function validate(
  plan: IncomePlan,
  sourceBalance: number | null,
): Problem[] {
  const problemas: Problem[] = [];

  const elegidas = plan.buckets.filter((b) => b.selected && b.amount > 0);
  if (elegidas.length === 0) {
    problemas.push({
      bucket: null,
      message: 'Selecciona al menos una categoria para continuar.',
    });
  }

  for (const b of elegidas) {
    // "Disponible" se queda donde esta: no necesita destino elegido.
    if (b.key === 'available') continue;
    if (b.destinationType === 'unassigned' || b.destinationId === null) {
      if (b.key === 'savings') {
        problemas.push({
          bucket: 'savings',
          message: 'Elige a que meta va este ahorro.',
        });
      }
    }
    if (b.key === 'commitments' && b.items.length === 0) {
      problemas.push({
        bucket: 'commitments',
        message: 'No tienes compromisos registrados para cubrir con este ingreso.',
      });
    }
  }

  if (plan.applied > plan.income) {
    problemas.push({
      bucket: null,
      message: 'Estas repartiendo mas de lo que entro.',
    });
  }

  // El ingreso ya esta en la cuenta, asi que el saldo deberia alcanzar.
  // Si no alcanza es que la persona ya gasto parte: hay que avisarlo
  // ANTES de aplicar, no despues de que falle un pago a la mitad.
  const salida = plan.buckets
    .filter((b) => b.selected && b.key !== 'available')
    .reduce((a, b) => a + b.amount, 0);

  if (sourceBalance !== null && salida > sourceBalance) {
    problemas.push({
      bucket: null,
      message: 'Esta cuenta no tiene saldo suficiente. Elige otra cuenta o ajusta los montos.',
    });
  }

  return problemas;
}
