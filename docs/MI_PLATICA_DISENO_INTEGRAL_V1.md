# Mi Platica — Diseño integral v1.1

> **Estado:** propuesta visual y funcional para aprobación. No modifica la app ni la ejecuta.
>
> **Objetivo:** que Claude pueda implementar toda la experiencia sin perder el rumbo, respetando la lógica local/offline ya existente en FinZen.

## 1. Norte del producto

Mi Platica es una app juvenil colombiana para **entender, registrar y mejorar la salud financiera** sin sentirse como un banco. La experiencia debe responder siempre tres preguntas:

1. ¿Cuánta plata tengo realmente?
2. ¿En qué se me está yendo?
3. ¿Cuál es el siguiente paso más útil?

La app conserva el modelo offline y privado de FinZen: SQLite local, dinero en centavos, saldos derivados, notificaciones locales y coach basado en reglas puras.

## 2. Identidad visual aprobada

### Paleta

| Token | Valor | Uso |
|---|---:|---|
| `navy` | `#071A2A` | header, navegación y fondos de alto contraste |
| `navySoft` | `#0D2A3D` | tarjetas oscuras y estados secundarios |
| `turquoise` | `#14C4D4` | acción principal, ingresos, progreso y selección |
| `turquoiseDark` | `#0A8F9C` | pressed, foco y contraste |
| `yellow` | `#FFD447` | ahorro, metas y acentos de progreso |
| `coral` | `#FF6F61` | gastos, alertas y acciones destructivas |
| `offWhite` | `#F8F8F3` | superficie principal clara |
| `white` | `#FFFFFF` | tarjetas y campos |
| `ink` | `#17222B` | texto principal |
| `mutedDark` | `#7D8990` | metadatos |
| `borderLight` | `#E6E7E2` | divisores y bordes |
| `paleTurquoise` | `#E5FAFC` | fondos suaves de ingresos |
| `paleYellow` | `#FFF8D9` | fondos suaves de ahorro |
| `paleCoral` | `#FFF0ED` | fondos suaves de gastos/alertas |

### Reglas de composición

- Fondo general `offWhite` en modo claro; respetar modo oscuro ya existente.
- Header navy con esquinas inferiores suaves cuando la pantalla lo permita.
- Radios de 16–24 px; controles táctiles mínimos de 44 × 44 px.
- Sombras ligeras, nunca tarjetas flotantes pesadas.
- Iconografía lineal consistente con `lucide-react-native`.
- Turquesa para acciones positivas; coral para gastos y destrucción; amarillo para ahorro.
- Nunca usar color como única señal: acompañar con texto, signo o icono.
- Tipografía del sistema, jerarquía clara, números grandes y legibles.
- Lenguaje colombiano, cercano y directo: “plata”, “te queda”, “vas bien”, “ojo”.

## 3. Arquitectura de información

> **Corrección de alcance:** las referencias originales de Descargas son la fuente visual de aprobación. La navegación principal vuelve a ser **Inicio, Deudas, Ahorro y Análisis**. Movimientos, Perfil, Mis cuentas, Configuración, Coach y Notificaciones siguen siendo módulos completos de acceso secundario.

### Navegación principal

1. **Inicio** — saldo disponible, acciones rápidas, cuentas y próxima mejor acción.
2. **Deudas** — deuda total, estrategias, vencimientos, tarjetas y plan de pago.
3. **Ahorro** — metas, colchón, planes comparables, inversiones y proyecciones.
4. **Análisis** — ingresos, gastos, balance, categorías, hábitos y recomendaciones.
5. **Botón central +** — registrar ingreso, gasto o transferencia.

### Rutas secundarias

- Mis cuentas → agregar, editar, detalle y movimientos por cuenta.
- Deudas → crear, detalle, registrar abono y amortización.
- Ahorro → crear meta, detalle, aportes y plan del coach.
- Inversiones → crear, detalle y proyección.
- Gastos/ingresos fijos → lista, formulario y recordatorios.
- Coach → conversación y recomendaciones accionables.
- Notificaciones → pendientes detectados y confirmación manual.
- Movimientos → libro completo, filtros, búsqueda y edición desde Inicio/acciones secundarias.
- Perfil → cuentas, fijos, coach, notificaciones y ajustes.
- Ajustes → tema, reglas del coach, respaldo, privacidad y datos.

## 4. Pantallas y comportamiento esperado

### 4.1 Inicio

**Jerarquía:** saludo breve → saldo real disponible → acción recomendada → resumen del mes → actividad reciente.

- Header navy con “Hola, [nombre]” y acceso a notificaciones.
- Tarjeta principal: “Tu plata disponible” con total, cuenta destacada y desglose de gastos fijos/cuotas próximas.
- Tarjeta del coach: una sola recomendación concreta, no un párrafo largo. CTA: “Ver plan”.
- Tres métricas: gastado este mes, ahorro acumulado, racha de registro.
- Actividad reciente agrupada por día.
- Estado vacío: explicar el primer paso y llevar a “Registrar ingreso”.

### 4.2 Registrar ingreso/gasto/transferencia

Se abre desde el botón central como hoja modal.

- Selector superior: Ingreso / Gasto / Transferencia.
- Teclado numérico grande y total siempre visible.
- Cuenta, categoría, fecha, nota y opción “esencial”.
- Antes de guardar, ejecutar el coach.
- Bloqueo o advertencia explicada con lenguaje simple; permitir “Guardar de todos modos” y registrar `coach_override`.
- Éxito: confirmación corta, saldo actualizado y CTA opcional “Ver plan”.

### 4.3 Movimientos

- Header “Movimientos”, mes seleccionable y búsqueda.
- Chips: Todos, Ingresos, Gastos, Transferencias.
- Lista agrupada por día con signo, icono, categoría, cuenta y hora.
- Totales del periodo arriba.
- Tap en movimiento → editar o borrar lógicamente; siempre ofrecer Deshacer.
- Estado vacío con CTA para registrar el primer movimiento.

### 4.4 Mis cuentas

- Tarjetas por cuenta con nombre, tipo, saldo y estado.
- Acción principal “Agregar cuenta”.
- Menú por tarjeta: editar, marcar como principal, archivar.
- No mostrar logos bancarios grandes; el logo es opcional y pequeño.
- Detalle de cuenta: saldo, ingresos/gastos del periodo, filtros y solo sus movimientos.

### 4.5 Ahorro

- Patrimonio neto: tienes − debes.
- Estado del colchón de emergencia con progreso visual.
- Metas: progreso, monto faltante, fecha y aporte sugerido.
- Proyección a 1/5/10/20 años: separar aportes propios e interés compuesto.
- CTA “Crear meta” y CTA contextual “Ver plan del coach”.
- Inversión y CDT deben mostrar liquidez y riesgo; un CDT no cuenta como colchón.

### 4.6 Deudas

- Resumen de deuda total, cuota próxima y días para vencer.
- Tarjetas por deuda: saldo, tasa E.A., cuota, progreso.
- Detalle con amortización, pagos, abono extra y comparación avalancha/bola de nieve.
- Acción principal: “Registrar abono”.
- Alertas de cuota vencida o compromiso en riesgo.

### 4.7 Perfil

Secciones agrupadas para que no parezca una lista infinita:

- **Mi dinero:** cuentas, tarjetas, deudas.
- **Mi plan:** gastos fijos, ingresos fijos, metas, inversiones.
- **Mi acompañamiento:** Coach, notificaciones.
- **Preferencias:** apariencia, reglas, respaldo y privacidad.

### 4.8 Coach

- Conversación breve, cálida y accionable.
- Cada respuesta: explicación corta → impacto → siguiente acción.
- Nunca inventar datos; usar snapshot real del store.
- Para ingresos: separar cuotas próximas, colchón, deuda, ahorro y libre.
- Para gastos: distinguir esencial/no esencial y mostrar qué regla se activó.
- CTA siempre específico: “Registrar aporte”, “Ver deuda”, “Ajustar regla”.

### 4.9 Notificaciones y detección

- Bandeja de pendientes detectados desde notificaciones locales.
- Nunca registrar automáticamente; el usuario confirma o descarta.
- Mostrar origen, fecha, monto y cuenta propuesta.
- Acciones: Confirmar, Editar, Ignorar.

### 4.10 Ajustes

- Tema: sistema/claro/oscuro.
- Reglas del coach con parámetros comprensibles.
- Respaldo/exportación e importación cifrada cuando esté implementada.
- Privacidad: todo local, sin cuenta ni analítica.
- Zona destructiva separada: borrar datos con confirmación clara.

### 4.11 Onboarding y primera configuración

El primer arranque no debe dejar al usuario frente a un panel vacío. Usar un flujo de tres pasos, siempre omisible y retomable:

1. **Bienvenida:** explicar que la información vive en el dispositivo y preguntar cómo quiere llamar a la app al usuario.
2. **Punto de partida:** crear o confirmar la primera cuenta y saldo inicial; permitir empezar en cero.
3. **Prioridad:** elegir entre ordenar gastos, pagar deudas, crear colchón o alcanzar una meta.

Al terminar, mostrar un resumen de lo configurado y llevar a Inicio. Si el usuario omite un paso, el panel debe mostrar una tarjeta de “Completa tu configuración” sin bloquear el uso.

### 4.12 Ajustes completos

La pantalla Ajustes se organiza en grupos, no en una lista plana:

| Grupo | Opciones y comportamiento |
|---|---|
| Apariencia | Sistema, claro u oscuro; reducir movimiento; tamaño de texto respetando accesibilidad. |
| Inicio | Elegir cuenta principal, ocultar saldo, ordenar tarjetas y activar/desactivar resumen mensual. |
| Coach | Activar reglas, colchón objetivo, días de compromisos, umbral de gasto grande, estrategia avalancha/bola de nieve y split de ingresos. Cada regla incluye explicación y valor actual. |
| Recordatorios | Cuotas, metas, gastos fijos, cierre del mes y frecuencia. Cada permiso se solicita solo al activar una función. |
| Datos y respaldo | Exportar respaldo cifrado, importar respaldo, última fecha de respaldo, validación antes de reemplazar datos y opción de cancelar. |
| Privacidad | “Todo queda en este dispositivo”, sin cuenta, sin analítica; mostrar qué permisos locales usa la app y para qué. |
| Ayuda | Guía de conceptos, contacto/feedback local y versión de la app. |
| Zona de riesgo | Archivar todos los datos, borrar todos los datos y restaurar ajustes. Siempre separar visualmente y exigir confirmación explícita. |

Los cambios deben guardarse con confirmación breve y permitir deshacer cuando sea reversible. Los cambios destructivos requieren resumen del impacto, escritura de una frase de confirmación y no deben ejecutarse desde un toque accidental.

### 4.13 Respaldo, restauración y ciclo de vida

- Exportar un archivo versionado, cifrado y validado antes de compartirlo.
- Importar primero a una vista de previsualización: fecha del respaldo, cantidad de cuentas, movimientos, metas y deudas.
- Ofrecer “fusionar” o “reemplazar” solo si el modelo actual lo soporta; por defecto no sobrescribir datos sin confirmación.
- Si el archivo está corrupto, incompleto o es de una versión incompatible, conservar los datos actuales y explicar el problema.
- Registrar migraciones de esquema y mostrar una pantalla de actualización solo cuando sea necesario.

### 4.14 Permisos, errores y seguridad de experiencia

- Notificaciones: explicar el beneficio antes del permiso del sistema y permitir continuar sin ellas.
- Archivos: pedir acceso únicamente al exportar o importar.
- Ninguna pantalla debe fingir sincronización en la nube.
- Errores: explicar qué pasó, qué se conservó y cuál es la acción de recuperación.
- Nunca mostrar stack traces, rutas internas ni datos sensibles en mensajes de usuario.
- Ocultar saldos con un control visible; el estado oculto no puede depender solo del color.

### 4.15 Accesibilidad y contenido

- Etiquetas accesibles para todos los iconos y controles.
- Orden de foco lógico y textos escalables.
- Contraste suficiente en navy, turquesa y coral.
- No depender de emojis para acciones financieras.
- Fechas, moneda y números con formato colombiano consistente.
- Mensajes de error y confirmación en lenguaje corto, respetuoso y no culpabilizante.

## 5. Estados obligatorios

Cada pantalla debe diseñarse para: carga, vacío, datos reales, error recuperable, offline, guardado exitoso, archivado, borrado lógico y modo oscuro. No crear pantallas que solo funcionen con datos de ejemplo.

## 6. Componentes reutilizables

`ScreenHeader`, `BalanceCard`, `MetricCard`, `CoachCard`, `MoneyInput`, `SegmentedChips`, `AccountCard`, `MovementRow`, `DateGroup`, `ProgressBar`, `BottomBar`, `PrimaryButton`, `SecondaryButton`, `ConfirmSheet`, `EmptyState`, `ErrorState`, `Skeleton`, `SectionHeader`, `SettingsGroup`, `SettingsRow`, `PermissionExplainer`, `BackupSummary`, `DangerZone`, `OnboardingStep`, `PrivacyNotice`, `ToastUndo`.

## 7. Checklist de aceptación de producto

| Área | Debe quedar validado |
|---|---|
| Rutas | Todas las rutas existentes tienen destino visual coherente y no quedan pantallas huérfanas. |
| Finanzas | Los saldos, cuotas, patrimonio, metas y proyecciones salen del store/repositorios reales. |
| Registro | Ingreso, gasto, transferencia y abono pasan por validación y coach antes de guardarse. |
| Ajustes | Cada preferencia tiene estado, explicación, persistencia y feedback de guardado. |
| Datos | Exportar/importar valida versión y no destruye datos ante error. |
| Privacidad | No se agrega backend, login, tracking ni analytics. |
| Accesibilidad | Safe areas, foco, labels, contraste y tamaños táctiles están cubiertos. |
| Estados | Carga, vacío, error, offline, éxito, deshacer, archivado y destrucción están diseñados. |
| Visual | Todas las pantallas usan los mismos tokens, radios, iconos, headers y tono. |

## 8. No negociables para Claude

- No reemplazar UI por imágenes.
- No borrar la lógica existente ni la base de datos.
- No introducir backend, login ni analítica.
- Reutilizar rutas, store, repositorios y tokens actuales.
- Mantener saldos en centavos y borrado lógico.
- Mantener accesibilidad, safe areas y controles táctiles.
- Implementar por fases y entregar diff/resumen antes de cambios masivos.
- No ejecutar la app ni compilar durante esta fase de diseño; eso ocurrirá solo después de aprobar el mockup.

## 9. Orden recomendado de implementación

1. Consolidar tokens y componentes visuales.
2. Ajustar navegación inferior y headers.
3. Inicio y botón central.
4. Movimientos y registro.
5. Cuentas y detalle por cuenta.
6. Ahorro, metas e inversiones.
7. Deudas y pagos.
8. Coach y notificaciones.
9. Onboarding y Perfil.
10. Ajustes, permisos, privacidad y respaldo/restauración.
11. Estados vacíos, modo oscuro, accesibilidad y pruebas.

## 10. Criterio de aprobación visual

La app debe sentirse como una sola experiencia: caribeña, joven, confiable y útil. Si una pantalla parece de otra aplicación, usa otro lenguaje visual o agrega información sin una acción clara, debe corregirse antes de implementarla.
