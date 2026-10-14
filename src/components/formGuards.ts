export function confirmarSalida(opts: {
  haycambios: boolean;
  onSalir: () => void;
}) {
  if (!opts.haycambios) {
    opts.onSalir();
    return;
  }
  if (window.confirm('¿Descartar lo que escribiste? No se va a guardar nada de lo que llevas.')) {
    opts.onSalir();
  }
}

export function confirmarBorrado(opts: {
  titulo: string;
  detalle: string;
  onBorrar: () => void;
}) {
  if (window.confirm(`${opts.titulo}\n\n${opts.detalle}`)) {
    opts.onBorrar();
  }
}

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
