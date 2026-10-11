/**
 * MENSAJES DE RECORDATORIO DIARIO
 *
 * Reglas que NO se rompen, pasa lo que pase con los datos:
 *  - Nunca culpar, avergonzar ni usar tristeza o enojo para presionar.
 *    Nada de "te fallaste", "que decepcion", "vas mal".
 *  - Si no hubo avance, se invita a retomar; no se señala el fallo.
 *  - Solo se mencionan cifras que existen de verdad. Sin datos, el
 *    mensaje se queda en lo general en vez de inventar un numero.
 *  - El tono rota entre positivo, reflexivo y firme para que no suene
 *    siempre igual. "Firme" significa claro y directo, nunca duro.
 */
import { money } from '@/utils/money';

export type Tone = 'positivo' | 'reflexivo' | 'firme';

export interface MotivationContext {
  /** Nombre del usuario, si lo configuro. */
  name: string;
  /** Metas activas con su avance. */
  goals: { name: string; saved: number; target: number; remaining: number }[];
  /** Dias seguidos registrando movimientos. */
  streak: number;
  /** Gastos fijos del mes que aun no se pagan. */
  fixedPending: number;
  /** Plata libre despues de compromisos. */
  availableReal: number;
  /** Gasto promedio por dia de los ultimos 30 dias. */
  avgDaily: number;
  /** Si registro algo en los ultimos 3 dias. */
  loggedRecently: boolean;
  /** Aportes hechos a metas en los ultimos 30 dias. */
  recentContributions: number;
}

export interface MotivationMessage {
  title: string;
  body: string;
  tone: Tone;
}

const saludo = (name: string) => (name ? `${name}, ` : '');
const Mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Arma el repertorio de mensajes posibles para el estado actual.
 * Devuelve varios para poder rotar sin repetir.
 */
export function buildMessages(ctx: MotivationContext): MotivationMessage[] {
  const out: MotivationMessage[] = [];
  const n = saludo(ctx.name);

  // ---------------------------------------------------------------
  // CON METAS: lo mas motivador es ver el avance real.
  // ---------------------------------------------------------------
  const metaConAvance = ctx.goals.find((g) => g.saved > 0 && g.remaining > 0);
  const metaSinAvance = ctx.goals.find((g) => g.saved === 0);
  const metaCerca = ctx.goals.find(
    (g) => g.remaining > 0 && g.saved / g.target >= 0.7,
  );

  if (metaCerca) {
    const pct = Math.round((metaCerca.saved / metaCerca.target) * 100);
    out.push({
      tone: 'positivo',
      title: `${Mayus(n)}vas en el ${pct}% de ${metaCerca.name}`,
      body: `Te faltan ${money(metaCerca.remaining)}. Estas mas cerca de lo que crees.`,
    });
  }

  if (metaConAvance) {
    out.push({
      tone: 'positivo',
      title: `${money(metaConAvance.saved)} para ${metaConAvance.name}`,
      body: `Eso ya es tuyo. Cada aporte cuenta, por pequeño que sea.`,
    });
    out.push({
      tone: 'reflexivo',
      title: `¿Hoy puedes acercarte un poco a ${metaConAvance.name}?`,
      body: `Llevas ${money(metaConAvance.saved)}. No hace falta un monto grande para avanzar.`,
    });
  }

  if (metaSinAvance && ctx.recentContributions === 0) {
    // Sin avance: se invita, no se reclama.
    out.push({
      tone: 'reflexivo',
      title: `${metaSinAvance.name} te esta esperando`,
      body: `Empezar con poco tambien es empezar. ¿Que tal un primer aporte hoy?`,
    });
    out.push({
      tone: 'positivo',
      title: `${Mayus(n)}retomemos ${metaSinAvance.name}`,
      body: `La meta sigue ahi y el plan tambien. Hoy es buen dia para dar el primer paso.`,
    });
  }

  // ---------------------------------------------------------------
  // SIN METAS: invitar a crear una, sin presionar.
  // ---------------------------------------------------------------
  if (!ctx.goals.length) {
    out.push({
      tone: 'reflexivo',
      title: `${Mayus(n)}¿para que te gustaria ahorrar?`,
      body: `Un viaje, un fondo de emergencia, un gusto. Tener un para que hace facil el como.`,
    });
  }

  // ---------------------------------------------------------------
  // HABITO DE REGISTRO
  // ---------------------------------------------------------------
  if (ctx.streak >= 3) {
    out.push({
      tone: 'positivo',
      title: `${ctx.streak} dias seguidos registrando`,
      body: `Ese habito es el que de verdad mueve la aguja. Sigue asi.`,
    });
  }

  if (!ctx.loggedRecently) {
    out.push({
      tone: 'reflexivo',
      title: `${Mayus(n)}¿como van tus gastos?`,
      body: `Anotar lo del dia toma 10 segundos y te da claridad para el resto de la semana.`,
    });
  }

  // ---------------------------------------------------------------
  // COMPROMISOS DEL MES
  // ---------------------------------------------------------------
  if (ctx.fixedPending > 0) {
    out.push({
      tone: 'firme',
      title: `Te quedan ${money(ctx.fixedPending)} en gastos fijos`,
      body: `Reservalos antes de gastar en otra cosa y el resto del mes va tranquilo.`,
    });
  }

  if (ctx.availableReal > 0 && ctx.fixedPending === 0) {
    out.push({
      tone: 'positivo',
      title: `Tienes ${money(ctx.availableReal)} libres de verdad`,
      body: `Ya cubriste lo comprometido. Lo que decidas con esto es ganancia tuya.`,
    });
  }

  if (ctx.availableReal < 0) {
    out.push({
      tone: 'firme',
      title: `${Mayus(n)}revisemos el mes`,
      body: `Entre gastos fijos y cuotas vas ajustado. Mirar los numeros hoy evita sorpresas despues.`,
    });
  }

  // ---------------------------------------------------------------
  // GENERALES: siempre hay con que llenar la rotacion.
  // ---------------------------------------------------------------
  out.push(
    {
      tone: 'reflexivo',
      title: `${Mayus(n)}una pregunta rapida`,
      body: `De lo que vas a gastar hoy, ¿cuanto es porque lo necesitas y cuanto por costumbre?`,
    },
    {
      tone: 'positivo',
      title: `Pequeño y constante le gana a grande y de vez en cuando`,
      body: `Guardar poquito cada quincena rinde mas de lo que parece.`,
    },
    {
      tone: 'firme',
      title: `Lo que no se anota, no se ve`,
      body: `Dos toques y sabes exactamente en que se te va la plata.`,
    },
    {
      tone: 'reflexivo',
      title: `Tu plata, tus reglas`,
      body: ctx.avgDaily > 0
        ? `Tu promedio diario es ${money(ctx.avgDaily)}. ¿Te suena bien ese numero?`
        : `Decidir antes de gastar es mas facil que arreglar despues.`,
    },
    {
      tone: 'positivo',
      title: `${Mayus(n)}vas construyendo algo`,
      body: `Cada registro y cada aporte son ladrillos. No se ven de a uno, pero se notan.`,
    },
  );

  return out;
}

/**
 * Elige mensajes para los proximos dias rotando el tono y sin repetir
 * dos veces seguidas el mismo texto.
 */
export function pickSequence(
  pool: MotivationMessage[],
  days: number,
): MotivationMessage[] {
  if (!pool.length) return [];

  const orden: Tone[] = ['positivo', 'reflexivo', 'firme'];
  const out: MotivationMessage[] = [];
  const usados = new Set<string>();

  for (let i = 0; i < days; i++) {
    const tonoBuscado = orden[i % orden.length];
    // Primero del tono que toca y que no se haya usado.
    let elegido =
      pool.find((m) => m.tone === tonoBuscado && !usados.has(m.title)) ??
      pool.find((m) => !usados.has(m.title));

    // Si ya se usaron todos, se reinicia el ciclo.
    if (!elegido) {
      usados.clear();
      elegido =
        pool.find((m) => m.tone === tonoBuscado) ?? pool[i % pool.length];
    }

    usados.add(elegido.title);
    out.push(elegido);
  }

  return out;
}
