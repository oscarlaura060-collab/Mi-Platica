# Mi Platica — Anexo de flujos completos v1.2

Este anexo amplía el paquete visual existente. Todo debe conservar la misma dirección aprobada: header navy, superficies off-white, tarjetas amplias, turquesa para acciones positivas, coral para gasto/riesgo, amarillo para metas/Coach, iconografía lineal y controles táctiles cómodos.

## 1. Editar movimiento

### Entrada

Desde **Movimientos**, **Detalle de cuenta** o **Últimos movimientos** en Inicio, tocar una fila abre una hoja modal `Editar movimiento`.

### Campos

- Tipo: Gasto, Ingreso o Transferencia.
- Monto con `MoneyInput` y formato colombiano en vivo.
- Categoría editable.
- Cuenta de origen y cuenta de destino si es transferencia.
- Fecha y hora opcional.
- Nota.
- Indicador de gasto fijo, ahorro o cuota si aplica.
- Para tarjetas: cuotas, cuota actual y fecha de corte/vencimiento sin mostrar información sensible.

### Acciones

- Guardar cambios.
- Cancelar sin perder datos.
- Eliminar con confirmación y borrado lógico.
- Deshacer después de guardar o eliminar cuando sea reversible.

### Reglas

- Editar un ingreso actualiza los saldos derivados y puede reabrir la asignación del ingreso.
- Editar un gasto vuelve a evaluar el Coach si cambia monto, categoría, cuenta o fecha.
- Una transferencia modifica ambas cuentas en una transacción coherente.
- No se puede editar directamente el saldo calculado de una cuenta.

## 2. Ahorro e inversiones

### Ahorro principal

Debe incluir:

- Patrimonio neto y dinero líquido.
- Colchón de seguridad: actual, objetivo y meses cubiertos.
- Metas con progreso, aportes, fecha y plan seleccionado.
- Acción `Nueva meta`.
- Recomendación del Coach basada en compromisos reales.

### Detalle de meta

- Monto objetivo, monto actual y faltante.
- Fecha objetivo opcional.
- Frecuencia quincenal o mensual.
- Plan Equilibrada, Intermedia, Flexible o Fecha elegida.
- Simulación de aporte, duración, fecha de finalización e impacto sobre compromisos.
- Aporte manual, editar meta, pausar y archivar.

### Inversiones

Módulo separado dentro de Ahorro, sin prometer rentabilidad:

- Inversión, tipo de vehículo, monto aportado, liquidez y nivel de riesgo.
- Fecha de inicio y objetivo asociado.
- Estado: activa, pausada o cerrada.
- Aportes y retiros registrados manualmente.
- Nota clara: `Las proyecciones son orientativas y no constituyen asesoría financiera.`
- No conectar bancos ni ejecutar compras reales.

## 3. Perfil

Pantalla secundaria accesible desde Ajustes y el avatar/header:

- Nombre visible y nombre preferido.
- Avatar con inicial o imagen local si existe.
- Frase/subtítulo de la cuenta personal.
- Preferencia de moneda y formato regional.
- Objetivo principal: ordenar gastos, pagar deudas, crear colchón o alcanzar una meta.
- Estado de onboarding y botón `Completar configuración`.
- Resumen de privacidad: datos locales, sin cuenta ni analítica.
- Editar perfil, guardar, cancelar y estado de error.

No pedir datos personales innecesarios. No crear login nuevo.

## 4. Ingresos fijos y compromisos

### Ingresos fijos

Desde Ajustes → Mi plata → Ingresos fijos:

- Nombre: salario, honorarios, arriendo recibido u otro.
- Monto esperado.
- Cuenta destino.
- Frecuencia: semanal, quincenal, mensual o personalizada.
- Día/fecha de recepción.
- Fecha de inicio y fin opcional.
- Estado activo/pausado.
- Aviso de ingreso vencido dentro de la app.
- Acción `Confirmar ingreso recibido` que registra el movimiento sin duplicarlo.
- Acción `Organizar ingreso` que abre asignación a gastos fijos, deuda, ahorro y disponible.

### Gastos fijos relacionados

Conservar también:

- Nombre, monto, cuenta, frecuencia y vencimiento.
- Prioridad y categoría.
- Próximo vencimiento.
- Estado pendiente, pagado, pospuesto o pausado.

Nunca registrar automáticamente un movimiento financiero solo por detectar que llegó la fecha: el usuario confirma.

## 5. Datos bancarios y dirección de entidad

En **Mis cuentas → Editar cuenta → Datos de la entidad** permitir, siempre de forma opcional:

- Nombre de banco, billetera o entidad.
- Tipo de cuenta.
- Últimos cuatro dígitos opcionales, nunca número completo.
- Dirección de la entidad o sucursal, si el usuario desea conservarla.
- Ciudad y teléfono opcionales.
- Nota privada local.

La dirección no debe ser obligatoria para crear la cuenta ni aparecer en Inicio. Mostrarla únicamente en Detalle de cuenta/Editar cuenta. Protegerla con el mismo control de privacidad y no exportarla sin confirmación.

## 6. Ajustes completos

Grupos visuales:

1. Perfil.
2. Preferencias: tema, periodo principal, tamaño de texto y reducir movimiento.
3. Notificaciones: vencimientos, Coach, ingresos fijos, metas, hábitos y hora silenciosa.
4. Mi plata: Mis cuentas, Categorías, Deudas, Estrategias de deuda, Ingresos fijos y Gastos fijos.
5. Seguridad y datos: bloqueo de app, ocultar saldos, exportar, importar y privacidad.
6. Ayuda: conceptos, comentarios, versión y diagnóstico local.
7. Zona de riesgo: archivar o borrar datos con confirmación explícita.

Cada cambio debe mostrar valor actual, explicación, persistencia, feedback y error recuperable.

## 7. Coach completo

El Coach aparece en tres contextos:

- **Antes de guardar un gasto:** evalúa compromisos y margen disponible.
- **Después de un ingreso:** sugiere organizarlo sin obligar una distribución.
- **En Ahorro/Deudas/Análisis:** transforma datos en una siguiente acción.

Estados:

- `Bien`: puedes continuar.
- `Atención`: puede afectar una meta o compromiso.
- `Mejor espera`: puede dejar faltante para un vencimiento.
- `Datos insuficientes`: pide fechas, tasas o montos sin inventar.

Acciones: `Cambiar`, `Ajustar`, `Ver plan`, `Confirmar de todas formas`, `Ahora no`.

El tono debe ser humano, directo y no culpabilizante. El usuario siempre conserva la decisión.

## 8. Notificaciones del celular

### Permiso

No pedir permiso al primer arranque. Explicar el beneficio cuando el usuario activa recordatorios y ofrecer continuar sin ellos.

### Canales y categorías

- Próximo vencimiento.
- Ingreso fijo pendiente de confirmar.
- Recomendación del Coach.
- Meta de ahorro.
- Hábito positivo.
- Movimiento detectado, si esa capacidad existe.

### Comportamiento

- Cada notificación tiene título, resumen, fecha, monto no sensible y ruta `miplatica://...`.
- Tocar abre el destino correcto: `DebtDetail`, `FixedIncomes`, `Coach`, `GoalDetail`, `Detected` o `Dashboard`.
- Marcar como leída dentro de la app.
- Configurar por categoría, hora silenciosa y frecuencia.
- Nunca incluir números completos de cuenta, tarjetas, dirección bancaria ni datos sensibles en la notificación del sistema.
- La app debe funcionar aunque el permiso sea denegado.

## 9. Estados transversales

Todos los módulos deben diseñarse en normal, cargando, vacío, error recuperable, sin permiso, offline, guardando, guardado exitoso, archivado, borrado lógico, modo oscuro, texto grande y reduced motion.

## 10. Orden actualizado para Claude

1. Auditar código y rutas sin ejecutar la app.
2. Consolidar tokens y shell: Inicio, Deudas, Ahorro, Análisis.
3. Implementar Registro y Coach previo.
4. Completar Movimientos y Editar movimiento.
5. Completar Mis cuentas, Agregar/Editar cuenta y Detalle de cuenta.
6. Completar Deudas, abonos, tarjetas y estrategia.
7. Completar Ahorro, metas, planes e inversiones.
8. Completar Análisis y recomendaciones.
9. Completar Perfil, Ingresos fijos y Gastos fijos.
10. Completar Configuración, datos bancarios y privacidad.
11. Completar Notificaciones del celular y deep links.
12. Revisar estados, accesibilidad, modo oscuro y pruebas.

No lanzar Expo ni compilar hasta que el diseño de cada fase haya sido aprobado.
