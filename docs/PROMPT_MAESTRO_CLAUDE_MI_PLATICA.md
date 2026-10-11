# Prompt maestro para Claude — Mi Platica v1.1

Actúa como **senior product designer, UX writer y senior React Native/Expo engineer**. Vas a evolucionar la app existente FinZen hacia la experiencia completa de **Mi Platica**, una app móvil colombiana, juvenil, privada y offline para salud financiera.

## Regla principal

No pierdas el rumbo. Antes de modificar código, lee `README.md`, `App.tsx`, `src/app/navigation`, `src/theme`, `src/components`, `src/features`, `src/store`, `src/db` y `src/domain`. Usa el documento `docs/MI_PLATICA_DISENO_INTEGRAL_V1.md` como contrato visual y funcional.

No lances Expo, no abras emuladores y no compiles durante la fase de diseño. Primero entrega un plan de archivos, un inventario de componentes y una propuesta de cambios. Solo implementa cuando el usuario apruebe el mockup y la fase correspondiente.

## Objetivo de producto

Construir una experiencia coherente con estas pestañas:

- Inicio
- Movimientos
- Ahorro
- Perfil
- Botón central para registrar ingreso, gasto o transferencia

Con rutas secundarias para cuentas, deudas, metas, inversiones, gastos fijos, ingresos fijos, coach, notificaciones y ajustes.

## Dirección visual obligatoria

Usa estos tokens, o conserva los equivalentes existentes si ya están definidos:

```ts
const BRAND = {
  navy: '#071A2A',
  navySoft: '#0D2A3D',
  turquoise: '#14C4D4',
  turquoiseDark: '#0A8F9C',
  yellow: '#FFD447',
  coral: '#FF6F61',
  offWhite: '#F8F8F3',
  white: '#FFFFFF',
  ink: '#17222B',
  mutedDark: '#7D8990',
  borderLight: '#E6E7E2',
  paleTurquoise: '#E5FAFC',
  paleYellow: '#FFF8D9',
  paleCoral: '#FFF0ED',
};
```

Reglas: header navy, superficies off-white, tarjetas blancas, radios 16–24 px, iconos lineales, sombras ligeras, controles de 44 px mínimo, tipografía de sistema, lenguaje cercano colombiano. Turquesa = positivo/ingreso/acción principal; coral = gasto/alerta/destrucción; amarillo = ahorro/meta. Nunca uses color como única señal.

## Pantallas a diseñar e implementar

1. **Inicio:** saludo, saldo disponible después de compromisos, acciones rápidas de ingreso/gasto/Coach, carrusel de cuentas, movimientos recientes y recomendación del Coach.
2. **Registrar movimiento:** hoja modal con ingreso/gasto/transferencia, teclado numérico, cuenta, categoría, fecha, nota y revisión del coach antes de guardar.
3. **Movimientos:** filtros por tipo, periodo, búsqueda, lista agrupada por día, edición, borrado lógico y Deshacer.
4. **Mis cuentas:** tarjetas con saldo, tipo, cuenta principal, agregar, editar y archivar.
5. **Detalle de cuenta:** saldo, métricas del periodo, filtros y únicamente los movimientos de esa cuenta.
6. **Ahorro:** patrimonio neto, colchón, metas, aportes, planes comparables, proyecciones e inversiones con liquidez/riesgo.
7. **Deudas:** saldo, tasa, cuotas, vencimientos, tarjetas de crédito, amortización, abonos y estrategia avalancha/bola de nieve.
8. **Análisis:** periodo semana/quincena/mes, ingresos, gastos, balance, categorías, hábitos y recomendaciones.
9. **Perfil y Mis cuentas:** cuentas activas/archivadas, agregar, editar, detalle y movimientos por cuenta.
10. **Coach:** conversación breve, explicación, impacto, cambio de decisión y siguiente acción concreta.
11. **Notificaciones:** vencimientos, recomendaciones, gastos revisados, hábitos, ahorro y configuración.
12. **Ajustes completos:** apariencia, inicio, reglas del Coach, recordatorios, permisos, privacidad, datos, ayuda y zona destructiva separada.
13. **Onboarding:** bienvenida, primera cuenta/saldo, prioridad, omisión y reanudación.
14. **Respaldo/restauración:** exportación cifrada, previsualización, validación de versión, fusión/reemplazo seguro y recuperación ante error.
15. **Editar movimiento:** hoja modal para editar tipo, monto, categoría, cuenta, fecha, nota, cuotas y borrar con confirmación/borrado lógico.
16. **Ingresos fijos y compromisos:** crear, editar, pausar, confirmar ingreso recibido y organizarlo sin duplicar movimientos.
17. **Perfil:** nombre, avatar local, objetivo principal, preferencias regionales y estado del onboarding.
18. **Datos de entidad bancaria:** banco/billetera, tipo, últimos cuatro dígitos opcionales, dirección/ciudad opcional y privacidad; nunca números completos.
19. **Inversiones:** vehículo, monto aportado, liquidez, riesgo, aportes manuales y proyecciones orientativas sin ejecutar compras.
20. **Notificaciones móviles:** permisos contextuales, canales, hora silenciosa, deep links, lectura y funcionamiento cuando el permiso sea denegado.
21. **Estados globales:** carga, vacío, offline, error recuperable, éxito, deshacer, archivado, borrado lógico, modo oscuro y accesibilidad.

Todas las pantallas deben contemplar carga, vacío, error recuperable, offline, éxito, modo oscuro y accesibilidad.

## Restricciones técnicas

- Mantén Expo/React Native, React Navigation, Zustand, SQLite y las dependencias actuales.
- No añadas backend, login ni analítica.
- No sustituyas componentes por capturas o imágenes.
- No borres migraciones, repositorios, reglas del coach ni lógica de saldos.
- Mantén dinero en centavos, saldos derivados y `deleted_at`.
- Reutiliza `BottomBar`, `useAppStore`, repositorios y tokens cuando sea posible.
- No inventes datos financieros; usa los datos del store y deja fixtures solo para preview/test.
- No solicites permisos al arrancar sin contexto: explica primero el beneficio y pide cada permiso justo cuando se usa.
- No ejecutes acciones destructivas con un toque: muestra impacto, confirmación explícita y posibilidad de cancelar.
- No presentes la importación como “sincronización”: todo sigue siendo local al dispositivo.
- No registres automáticamente ingresos fijos, gastos fijos o movimientos detectados sin confirmación del usuario.
- No muestres datos bancarios completos ni información sensible en notificaciones, Inicio o tarjetas.
- Lee también `docs/ANEXO_FLUJOS_COMPLETOS_MI_PLATICA.md` antes de proponer cambios.

## Forma de trabajo obligatoria

### Fase 0 — auditoría

Entrega primero:

1. Resumen de la arquitectura actual.
2. Mapa de rutas existente vs. mapa objetivo.
3. Componentes reutilizables detectados.
4. Gaps visuales y funcionales.
5. Lista exacta de archivos que modificarías.
6. Riesgos y decisiones que requieren aprobación.

No escribas código aún.

### Fase 1 — sistema visual

Consolida tokens, tipografía, espaciado, radios, estados, headers, tarjetas, botones, chips, campos, listas, empty states y componentes de coach. Evita duplicar estilos.

### Fase 2 — navegación y shell

Ajusta headers, safe areas, la barra inferior de cuatro pestañas y el botón central de registro. No cambies la semántica de las rutas sin justificarlo.

### Fase 3 — flujos de alto uso

Implementa Inicio, Movimientos, Registrar movimiento, Mis cuentas y Detalle de cuenta.

### Fase 4 — planificación financiera

Implementa Ahorro, metas, planes comparables, inversiones, Deudas, tarjetas, pagos, gastos fijos e ingresos fijos. Deudas y Ahorro son pestañas principales, no pantallas escondidas.

### Fase 5 — análisis y módulos secundarios

Implementa Análisis con semana/quincena/mes, comparativas de ingresos/gastos, categorías, hábitos y recomendaciones. Completa Movimientos, Mis cuentas, detalle de cuenta, Notificaciones y Perfil sin moverlos a una pestaña principal nueva.

### Fase 6 — acompañamiento y configuración

Implementa Coach, Notificaciones, Perfil, Onboarding y Ajustes completos. Agrupa Ajustes en Apariencia, Inicio, Coach, Recordatorios, Datos y respaldo, Privacidad, Ayuda y Zona de riesgo. Cada fila debe mostrar valor actual, explicación, persistencia y feedback de guardado.

### Fase 7 — datos, permisos y recuperación

Implementa los estados de permiso de notificaciones/archivos, exportación cifrada, previsualización de importación, validación de versión, error seguro y recuperación sin pérdida de datos.

### Fase 8 — calidad

Revisa estados vacíos, onboarding omitido, modo oscuro, accesibilidad, errores, permisos denegados, confirmaciones, borrado lógico, restauración, rendimiento y coherencia visual. Después pide autorización explícita para ejecutar typecheck, pruebas, Expo o compilación.

## Formato de respuesta por fase

Antes de editar, responde con:

- Qué entendiste.
- Qué no vas a cambiar.
- Archivos a modificar.
- Componentes nuevos.
- Flujo de usuario.
- Riesgos.
- Criterios de aceptación.

Después de editar, responde con:

- Archivos modificados.
- Qué comportamiento quedó implementado.
- Qué estados fueron cubiertos.
- Qué falta.
- Qué comando podría ejecutar el usuario en una fase posterior.

Empieza ahora solo con la **Fase 0 — auditoría y propuesta**, sin lanzar la app ni compilarla. Incluye explícitamente una matriz de Ajustes y un mapa de datos/privacidad antes de escribir código.
