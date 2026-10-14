import { Alert } from 'react-native';

/**
 * SALIR DE UN FORMULARIO Y BORRAR UN REGISTRO
 *
 * Son dos cosas distintas y la app no las puede confundir:
 *
 *   Cancelar  tira a la basura lo que acabas de escribir.
 *   Eliminar  borra algo que ya estaba guardado.
 *
 * Por eso cada una tiene su propio texto y su propia pregunta. Cancelar
 * nunca guarda, y eliminar nunca se dispara por salir de la pantalla.
 */

/**
 * Sale del formulario. Si hay algo escrito sin guardar, pregunta antes.
 *
 * Si no se ha tocado nada, no pregunta: un aviso que siempre aparece se
 * vuelve un clic mas que nadie lee.
 */
export function confirmarSalida(opts: {
  haycambios: boolean;
  onSalir: () => void;
}) {
  if (!opts.haycambios) {
    opts.onSalir();
    return;
  }
  Alert.alert(
    '¿Descartar lo que escribiste?',
    'No se va a guardar nada de lo que llevas.',
    [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: opts.onSalir },
    ],
  );
}

/**
 * Pide confirmacion para borrar algo guardado.
 *
 * `detalle` tiene que decir QUE desaparece. En un gasto que se repite,
 * eso incluye aclarar que se borra toda la recurrencia y no solo el
 * pago de este mes: es la diferencia entre "ya pague el arriendo" y "ya
 * no vivo aqui".
 */
export function confirmarBorrado(opts: {
  titulo: string;
  detalle: string;
  onBorrar: () => void;
}) {
  Alert.alert(opts.titulo, opts.detalle, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: opts.onBorrar },
  ]);
}

/**
 * El texto de borrado de un gasto fijo.
 *
 * Un gasto quincenal tiene dos vencimientos al mes. Borrarlo quita los
 * dos y todos los meses que vengan, asi que se dice con numeros.
 */
export function detalleGastoFijo(input: {
  nombre: string;
  quincenal: boolean;
}): { titulo: string; detalle: string } {
  return {
    titulo: `¿Eliminar ${input.nombre}?`,
    detalle: input.quincenal
      ? 'Se elimina el gasto completo, con sus dos vencimientos al mes y los de ' +
        'los meses que vienen. Los pagos que ya registraste se quedan en tu historial.'
      : 'Se elimina el gasto y todos sus vencimientos futuros. Los pagos que ya ' +
        'registraste se quedan en tu historial.',
  };
}
