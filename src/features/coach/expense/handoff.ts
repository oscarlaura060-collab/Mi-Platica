/**
 * TRASPASO DE LA DECISION DEL COACH
 *
 * El coach de gastos NO guarda nada. El formulario de registro es el
 * unico que escribe en la base, porque ahi vive la logica de compras a
 * cuotas, tarjetas y categorias; duplicarla en dos pantallas seria pedir
 * que algun dia dejen de coincidir.
 *
 * Entonces el coach necesita devolverle la decision al formulario. No se
 * pasa como parametro de navegacion porque una funcion no es
 * serializable: React Navigation guarda los parametros para restaurar la
 * pantalla, y una funcion ahi rompe esa restauracion.
 *
 * Por eso vive aqui, fuera de la navegacion. Si la app se cierra y se
 * restaura, esto queda vacio y el coach simplemente se devuelve sin
 * hacer nada: nunca se registra un gasto que el usuario no confirmo.
 */
export type CoachDecision = 'confirm' | 'edit';

type Handler = (decision: CoachDecision, mood: string) => void;

let pendiente: Handler | null = null;

export function setPendingDecision(h: Handler) {
  pendiente = h;
}

/** Se consume una sola vez: evita que un doble toque registre dos gastos. */
export function takePendingDecision(): Handler | null {
  const h = pendiente;
  pendiente = null;
  return h;
}

export function clearPendingDecision() {
  pendiente = null;
}
