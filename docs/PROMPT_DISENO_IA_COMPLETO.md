# Prompt completo para diseñar Mi Platica con IA

Copia y pega el bloque siguiente en la IA que vaya a diseñar la aplicación. Adjunta también las referencias visuales disponibles en `outputs/referencias-completas/` si la herramienta acepta imágenes.

---

## PROMPT

Actúa como un equipo senior formado por **product designer de apps financieras, especialista UX/UI móvil, diseñador visual y arquitecto de información**. Tu tarea es **auditar y diseñar la experiencia completa de la aplicación existente**, llamada **Mi Platica** (el repositorio todavía se llama FinZen), y mostrar una propuesta visual coherente para todas sus pantallas y estados.

No empieces programando. Primero entiende el producto, revisa las referencias y presenta una propuesta visual navegable o mockups de alta fidelidad. Quiero ver cómo se sentiría y se vería la aplicación completa si la diseñaras tú, respetando lo que ya existe y completando visualmente lo que falta.

### 1. Producto y propósito

Mi Platica es una app móvil para Colombia que ayuda a entender y organizar la plata, registrar ingresos y gastos, pagar deudas, ahorrar y tomar mejores decisiones financieras. Debe responder con claridad:

1. ¿Cuánta plata tengo realmente disponible después de mis compromisos?
2. ¿En qué se me está yendo?
3. ¿Qué siguiente paso concreto puedo tomar?

La marca debe sentirse **cercana, joven, tranquila, caribeña, confiable y útil**, como una buena compañía que explica sin juzgar. Usa español colombiano natural: “plata”, “te queda”, “vas bien”, “ojo con este pago”. Evita el tono bancario frío, la culpa, la jerga técnica y las promesas de rentabilidad.

Es una app **privada y offline**: los datos financieros permanecen localmente en el dispositivo, en SQLite. No hay backend, inicio de sesión, sincronización en nube ni analítica. El producto usa moneda colombiana y formatos locales. No inventes saldos reales: cualquier cifra que aparezca en una propuesta debe llevar la etiqueta “dato de ejemplo” o ser claramente ficticia.

### 2. Revisa estas fuentes antes de proponer

Si tienes acceso al repositorio, inspecciona primero:

- `README.md`
- `docs/progress.md` y `docs/audit.md`
- `docs/design-bible.md` y `docs/navigation-map.md`
- `docs/REFERENCIAS_VISUALES_COMPLETAS_MI_PLATICA.md`
- `docs/MI_PLATICA_DISENO_INTEGRAL_V1.md`
- `docs/ANEXO_FLUJOS_COMPLETOS_MI_PLATICA.md`
- `docs/financial-rules.md` y `docs/product-principles.md`
- `docs/claude-handoff.md`
- `src/app/navigation/`, `src/theme/`, `src/components/`, `src/features/`, `src/store/`, `src/db/` y `src/domain/`
- Las láminas y el índice de `outputs/referencias-completas/`.

**Precedencia cuando encuentres contradicciones:** el código y el estado reciente de `docs/progress.md`/`docs/claude-handoff.md` describen lo implementado; `docs/REFERENCIAS_VISUALES_COMPLETAS_MI_PLATICA.md`, `docs/design-bible.md` y el anexo describen la dirección visual deseada. No asumas que una pantalla está terminada solo porque exista una ruta o un mockup. Señala cualquier discrepancia y resuélvela en la propuesta sin borrar funciones existentes.

La navegación que debe conservarse como columna vertebral es **Inicio, Deudas, Ahorro y Análisis**, más un botón central `+` para registrar. Algunos documentos antiguos aún muestran otras pestañas: no las restaures. Movimientos, Cuentas, Perfil, Coach, Notificaciones y Ajustes siguen existiendo como destinos secundarios.

### 3. Lo que ya hace el producto

Diseña alrededor de estas capacidades existentes; no las reemplaces por pantallas decorativas:

- **Inicio:** resumen del dinero/cuentas, movimientos recientes, acciones rápidas, información del Coach y avisos de ingresos fijos pendientes.
- **Registrar movimiento:** registrar ingresos, gastos y transferencias con teclado de dinero propio, cuenta, categoría, fecha y nota. El Coach evalúa los gastos antes de guardarlos. Los ingresos pueden organizarse después; se puede aplazar la distribución y el ingreso ya registrado no debe duplicarse.
- **Movimientos:** consultar, filtrar y editar transacciones; borrar de forma reversible/lógica según el flujo existente.
- **Cuentas:** administrar cuentas, seleccionar una principal, consultar detalle y movimientos asociados. Hay tarjetas de crédito con cupo, fechas y cuotas.
- **Deudas:** registrar y editar deudas, consultar detalle, registrar abonos, ver amortización y comparar avalancha (mayor tasa) con bola de nieve (menor saldo). Las tarjetas y sus pagos también cuentan en los compromisos.
- **Ahorro:** patrimonio neto, liquidez, colchón de emergencia, metas, aportes y planes. Hay opciones de plan y lógica de proyección. Existe un módulo de inversiones con vehículo, rentabilidad esperada, costos, liquidez y riesgo; presentarlo con prudencia y como proyección orientativa.
- **Análisis:** periodos y ciclos de pago, calendario/rango personalizado, ingresos, gastos, balance, comparación de periodos, categorías, días de gasto, patrones y gráficos.
- **Coach financiero:** reglas locales para saldo insuficiente, compromisos en riesgo, colchón, presupuestos, picos de gasto, deuda vencida y gastos grandes. Explica el motivo; no culpabiliza. El usuario conserva su decisión y puede confirmar de todas formas cuando el flujo lo permita.
- **Ingresos y gastos fijos:** gestión de compromisos, frecuencias y fechas. La app puede mostrar ingresos pendientes de confirmar; nunca registres un movimiento automáticamente solo porque llegó una fecha.
- **Notificaciones locales y movimientos detectados:** existen flujos y deep links. El usuario debe revisar, confirmar, editar o descartar un movimiento detectado; jamás registrarlo automáticamente.
- **Ajustes:** tema, configuración financiera, reglas del Coach, recordatorios y otras preferencias que estén disponibles en el código.

El dinero se calcula en enteros/centavos; los saldos se derivan de movimientos y las tasas usan enteros. El Coach se basa en reglas locales. La experiencia debe conservar consistencia con ese comportamiento.

### 4. Qué está diseñado, qué está implementado y qué falta

No afirmes que todo está terminado. Presenta un inventario con tres estados: **implementado**, **referencia/mockup disponible** y **pendiente o por validar**. Según el estado documentado más reciente, ten en cuenta:

- Hay una identidad visual, tokens, componentes base, pantallas funcionales y mockups de referencia, pero **el rediseño visual integral todavía no se ha aplicado ni revisado visualmente de punta a punta**. No confundas la interfaz existente con el nivel de acabado de los mockups.
- Hay referencias para Inicio, Deudas, Ahorro/plan, Análisis, Movimientos, Mis cuentas, Agregar cuenta, Configuración, Registro de ingreso, Registro de gasto, Coach de riesgo y Notificaciones.
- Están implementadas muchas capacidades financieras y pantallas secundarias (metas, inversiones, cuentas, deudas, análisis, compromisos, edición, Coach). Aun así, verifica cada una contra el código y el documento de progreso más reciente.
- El onboarding de bienvenida y configuración inicial de tres pasos está pendiente.
- Exportar/importar un respaldo cifrado está pendiente; no diseñes una función como si ya pudiera usarse. Sí puedes proponer su experiencia objetivo y marcarla “por implementar”.
- Falta cerrar la decisión/migración entre los colores de marca de la Biblia visual y los tokens actuales. La paleta de la Biblia es la dirección objetivo; indica que requiere consolidación.
- La iconografía coherente debe consolidarse; evita depender de glifos o emojis como iconos funcionales.
- Faltan rituales/microinteracciones de progreso y revisar la uniformidad de estados de carga, error, accesibilidad, contraste, objetivos táctiles y tamaños de pantalla.
- La detección de notificaciones bancarias, los permisos y ciertos recordatorios deben mostrarse como “por validar en dispositivo” cuando así lo indique el progreso. No prometas que una notificación del sistema funciona con la app cerrada si no está verificada.
- El estado de compilación, tipos y pruebas debe consultarse en el progreso reciente; no afirmes que la APK se validó visualmente en un teléfono si no ocurrió.

Si los documentos y el código no coinciden, anota exactamente qué difiere y basa la propuesta en el comportamiento confirmado más reciente. No ocultes pendientes con datos ficticios.

### 5. Dirección de diseño

Usa como base la identidad aprobada en la Biblia visual:

```text
Navy #071A2A           estructura, header y navegación
Navy suave #0D2A3D     superficies oscuras secundarias
Turquesa #14C4D4       acción principal, progreso e ingresos
Turquesa oscuro #0A8F9C contraste y estados presionados
Amarillo #FFD447        metas, ahorro y oportunidades
Coral #FF6F61           gastos, atención y destrucción
Off-white #F8F8F3       fondo claro
Blanco #FFFFFF          tarjetas y campos
Tinta #17222B           texto principal
Texto secundario #7D8990
Borde #E6E7E2
Turquesa pálido #E5FAFC · Amarillo pálido #FFF8D9 · Coral pálido #FFF0ED
```

La implementación actual puede tener valores ligeramente distintos. Para la propuesta, usa la paleta objetivo de arriba y registra como pendiente consolidar los tokens. No introduzcas colores arbitrarios.

- Fondo off-white en claro y paleta oscura coherente en oscuro.
- Encabezados navy cuando corresponda, tarjetas blancas limpias, radios de 16–24 px y sombras suaves.
- Tipografía de sistema, jerarquía marcada y montos grandes, legibles y en una sola línea.
- Iconos lineales consistentes (por ejemplo, Lucide); sin iconos como caracteres sueltos ni emojis en controles de navegación.
- Turquesa = acción positiva/ingreso; coral = gasto/riesgo; amarillo = ahorro/meta. El color nunca es la única forma de comunicar un estado.
- Botones cómodos y zonas táctiles de al menos 44 × 44 px; safe areas, buen contraste y soporte a texto ampliado/reduced motion.
- Evita exceso de tarjetas, gradientes decorativos, gráficos sin propósito, lenguaje de banco y pantallas saturadas.

### 6. Mapa de pantallas que debes diseñar

Diseña la experiencia de extremo a extremo, incluyendo las cuatro pestañas principales, las pantallas secundarias y sus flujos modales:

#### Navegación principal

1. **Inicio:** saludo/perfil, acceso a notificaciones, saldo realmente disponible después de compromisos, ocultar/mostrar saldo, cuenta principal/carrusel, ingreso/gasto/Coach, próxima recomendación, movimientos recientes, resumen del periodo y estados vacíos para iniciar.
2. **Deudas:** total pendiente, cuotas y vencimientos, avance/tiempo estimado, tarjetas de crédito, estrategia avalancha/bola de nieve y prioridad siguiente. Cada deuda abre detalle, amortización, historial y abono.
3. **Ahorro:** patrimonio neto (tienes menos debes), dinero líquido, colchón y cobertura, metas con monto actual/faltante/fecha/frecuencia, opciones de plan comparables, aportes, proyecciones e inversiones con liquidez/riesgo.
4. **Análisis:** selector de periodo y quincena real, ingresos/gastos/balance, comparativo, tendencias, categorías, top de gastos, días y hábitos, recomendaciones accionables.
5. **Acción central `+`:** hoja/modal para escoger ingreso, gasto o transferencia, con estado visual correcto por tipo.

#### Registro y movimientos

- Selector Ingreso/Gasto/Transferencia; importe grande; teclado numérico; categorías; cuenta(s); fecha/hora; nota; esencialidad cuando aplique.
- Evaluación previa del Coach para gastos y estados “puedes seguir”, “atención” o “mejor espera”, mostrando por qué y qué compromiso impacta.
- Ingreso guardado seguido de asignación opcional a compromisos/deuda/ahorro/disponible, con montos ajustables y posibilidad de posponer.
- Confirmación de éxito, saldo actualizado, error recuperable y evitar duplicados.
- Lista de Movimientos con totales, búsqueda, filtros, selector de fechas y grupos por día; detalle/edición, confirmación de borrado y deshacer cuando aplique.

#### Cuentas y crédito

- Mis cuentas: total, activas/archivadas, tipo, saldo, cuenta principal, agregar/editar/archivar.
- Agregar/editar cuenta: nombre, tipo, saldo inicial, icono/color, cuenta por defecto para nuevos movimientos y datos de entidad opcionales.
- Detalle de cuenta: saldo, ingresos/gastos del periodo, filtros y solo sus movimientos.
- Datos bancarios opcionales: nombre de entidad, tipo, últimos cuatro dígitos como máximo, ciudad/dirección/teléfono opcionales. Nunca pedir ni mostrar el número completo; mantener detalles fuera de Inicio y notificaciones.
- Tarjeta de crédito: cupo, utilizado/disponible, corte, vencimiento y cuotas sin exponer datos sensibles.

#### Deudas, ahorro e inversiones

- Formularios, detalles, editar, archivar si está soportado, abonos/pagos, calendario y amortización. Mostrar tasas y cálculos con etiquetas claras.
- En ahorro, comparación legible entre planes Equilibrada, Intermedia, Flexible y Fecha elegida: cuánto aportar, cada cuánto, por cuánto tiempo, fecha estimada e impacto en compromisos.
- Detalle de meta: objetivo, progreso, historial, aporte manual, editar, pausar/archivar si está soportado.
- Inversiones: tipo de vehículo, aportado, rentabilidad esperada, costos, liquidez, riesgo, aportes/retiros manuales y proyección prudente. Texto visible: “Proyección orientativa; no es asesoría financiera”. No permitir compras reales ni conexión bancaria.

#### Coach, compromisos y notificaciones

- Coach conversacional breve: contexto, explicación, impacto con cifras reales, siguiente acción y botones como “Cambiar”, “Ver plan”, “Confirmar de todas formas” y “Ahora no”. Estado de datos insuficientes sin inventar.
- Ingresos fijos: monto esperado, cuenta, frecuencia, fecha, activo/pausado, aviso y confirmación recibida sin duplicar.
- Gastos fijos: monto, prioridad, categoría, frecuencia, vencimiento, estado pendiente/pagado/pospuesto/pausado.
- Notificaciones: bandeja, estado leído/no leído, categorías, hora silenciosa y configuración; explicar permiso antes de pedirlo. Si el permiso está denegado, la app sigue útil.
- Detectados: origen/fecha/monto/cuenta sugerida, acciones confirmar/editar/descartar. El diseño debe dejar claro que el movimiento no se registra hasta que la persona lo confirme.

#### Perfil, Ajustes y primer uso

- Perfil desde Ajustes/header: nombre preferido, avatar/inicial local, objetivo principal, preferencias regionales y estado de configuración inicial.
- Ajustes agrupados, no una lista interminable: **Perfil; Apariencia y accesibilidad; Inicio; Coach y reglas; Recordatorios/notificaciones; Mi plata (cuentas, categorías, deudas, ingresos y gastos fijos); Datos y respaldo; Privacidad; Ayuda/versión; Zona de riesgo**.
- Cada ajuste debe enseñar valor actual, explicación, confirmación/feedback al guardar y error recuperable. Borrado/acciones destructivas separados y con resumen y confirmación fuerte.
- Onboarding pendiente: bienvenida y privacidad local; crear/elegir primera cuenta y saldo inicial o empezar en cero; prioridad (gastos, deuda, colchón o meta); permitir omitir y retomar sin bloquear el uso.
- Respaldo pendiente: exportación/importación cifrada. Diseña el flujo futuro claramente etiquetado como propuesta: resumen/previsualización, versión, conteos, validación, cancelar, recuperación segura ante error y no reemplazar datos silenciosamente.

### 7. Estados y casos que deben aparecer

No diseñes solo el estado ideal con datos abundantes. Para cada módulo define los estados aplicables y muestra mocks representativos:

- primera apertura sin datos/onboarding omitido;
- carga/esqueleto;
- vacío con acción para avanzar;
- datos normales y cifras largas;
- error recuperable y reintento;
- permiso de notificaciones concedido, denegado y aún no solicitado;
- saldo oculto;
- Coach sin datos suficientes, alerta y confirmación;
- éxito/guardado, fallo al guardar y deshacer;
- compromiso próximo, atrasado o pagado;
- modo oscuro, texto grande, pantalla estrecha (360 px) y safe areas;
- reduced motion y controles deshabilitados/seleccionados.

No es necesario dibujar cada combinación por duplicado: crea una **matriz de estados** y los mockups necesarios para demostrar que el sistema los cubre.

### 8. Qué entregar

Organiza tu respuesta en este orden:

1. **Resumen del producto** en lenguaje claro y mapa de navegación confirmado.
2. **Inventario funcional** en tabla: módulo/pantalla, qué hace hoy, qué diseño/referencia existe, estado real (implementado, parcial, pendiente, por validar) y propuesta de mejora visual.
3. **Discrepancias y supuestos** entre documentación, referencias y código. No resuelvas una contradicción silenciosamente.
4. **Dirección visual** con paleta, tipografía, iconografía, espaciado, componentes y ejemplos de uso.
5. **Flujos completos** de gasto con Coach, ingreso y asignación, transferencia, deuda/abono, creación de meta y movimiento detectado.
6. **Mockups de alta fidelidad de todas las pantallas principales** y de las secundarias importantes. Mantén el mismo diseño entre pantallas y muestra cómo se navega entre ellas. Si puedes generar un prototipo clicable, incluye las interacciones; si no, entrega láminas consistentes con anotaciones.
7. **Estados vacíos y de error** de Inicio, Movimientos, Deudas, Ahorro y Ajustes, más onboarding y respaldo como flujos pendientes identificados.
8. **Matriz de Ajustes** (grupo, opción, valor/estado, explicación, permiso/dato implicado y estado implementado/pendiente).
9. **Mapa de datos y privacidad**: qué datos se muestran, en qué pantalla, cuáles son locales, qué se oculta y qué nunca debe exponerse.
10. **Lista priorizada de brechas visuales**: qué ya está, qué falta diseñar, qué falta implementar y qué necesita probarse en dispositivo.

Para cada pantalla especifica: objetivo, jerarquía visual, elementos, CTA principal/secundario, navegación de entrada/salida, estados relevantes y componentes compartidos. Usa cifras ficticias marcadas como tales en los mockups.

### 9. Límites y criterios de calidad

- No cambies las cuatro pestañas principales ni elimines destinos secundarios.
- No des por hecha una capacidad incompleta ni conviertas una referencia en evidencia de implementación.
- No inventes reglas financieras, cuentas, tasas ni saldos.
- No agregues backend, login, tracking, analítica, conexión bancaria o compras reales.
- No muestres números completos de cuentas/tarjetas ni información privada en Inicio o notificaciones.
- No registres ingresos/gastos detectados automáticamente ni dupliques un ingreso confirmado.
- No uses color como única señal; incorpora texto, icono y etiquetas accesibles.
- No uses imágenes de mockup como si fueran la interfaz final: la propuesta debe poder construirse con componentes reales.
- Respeta navegación existente, flujos, SQLite local, reglas financieras y capacidad de decisión del usuario.
- Señala qué pantallas son rediseño de algo existente y cuáles son diseño nuevo para una función pendiente.
- Prioriza claridad y acciones útiles sobre densidad de información. Cada gráfico debe responder una pregunta concreta.

Empieza con el inventario y la dirección visual. Después presenta la propuesta de pantallas completa. **En esta entrega quiero ver el diseño y entender claramente qué ya existe y qué queda por hacer; todavía no cambies el código ni ejecutes la app.**

---

## Fin del prompt
