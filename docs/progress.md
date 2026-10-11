# Progreso — Mi Platica

App v2.5.0 (versionCode 11) · actualizado el 11 de octubre de 2026

> El estado refleja **solo lo implementado y verificado**. "Verificado"
> significa comprobado por cálculo o por `adb`; **ninguna pantalla se ha
> revisado visualmente todavía.**

## Correcciones funcionales en curso — 11 de octubre de 2026

Se añadieron cambios puntuales de ingresos fijos confirmados por la persona,
distribución posponible, cuenta principal predeterminada, edición y pagos
validados de deudas, pagos de tarjetas incluidos en compromisos y frecuencia
configurable de mensajes motivacionales (1, 2 o 4 horas, en franja diurna). El detalle
para continuar sin duplicar trabajo está en [`claude-handoff.md`](claude-handoff.md).

`node tests/functional-fixes.mjs` pasa con las verificaciones nuevas de frecuencia.
El último `npm run typecheck` falla por tipos de navegación en `RootNavigator.tsx`
(`Movements`, `Profile`) y `HomeScreen.tsx` (`Movements`). Los scripts generales,
de resumen de deudas y coach de ingresos pasaron antes del cambio motivacional.
No se compiló ni instaló la APK, y no se validó visualmente ni en el
teléfono durante esta continuación. El recordatorio de ingreso funciona dentro
de la app; no se ha comprobado envío de notificación del sistema con la app
cerrada.

---

## Estado por área

| Área | Estado | Observaciones |
|---|---|---|
| Fundaciones visuales | ⚠️ Parcial | Tema con dos paletas y tokens centralizados. **Falta migrar a la paleta del prompt maestro.** Sin librería de íconos. Faltan `Skeleton` y `ErrorState`. |
| Navegación | ✅ Funcional | 4 pestañas correctas + 21 rutas. Deep links verificados. Sin rediseño visual. |
| Datos y estado financiero | ✅ Completo | 19 tablas, 7 vistas, 11 migraciones. Store de zustand. 167 comprobaciones pasan. |
| Inicio | ⚠️ Funcional | Saludo, cuenta principal, gráficos, metas, coach, movimientos. **Sin diseño aprobado aplicado.** |
| Ingresos | ✅ Funcional | Registro + reparto con destinos editables. Ingresos fijos con frecuencia semanal/quincenal/mensual. |
| Gastos | ✅ Funcional | Registro con teclado propio. Gastos fijos quincenales y mensuales con fechas. |
| Deudas | ✅ Funcional | Amortización, abonos, avalancha/bola de nieve, tarjetas con corte y cuotas. |
| Ahorro | ✅ Funcional | Metas con propósito, cuatro opciones de plan, aportes, quincenal vs mensual. |
| Análisis | ✅ Funcional | Rangos, ciclos de quincena, calendario, 6 gráficos. |
| Coach | ✅ Funcional | 8 reglas, pantalla de preguntas, mensajes con cifra y fecha reales. |
| Notificaciones | ⚠️ Parcial | Avisos de cuota, gasto fijo, registro diario y motivacionales. **La detección bancaria no se ha probado con una notificación real.** |
| Animaciones | ⚠️ Mínimo | `FadeIn`, barras animadas, swipe, micro-pulsación. Respetan reduced motion. **Faltan los tres rituales de progreso.** |
| Accesibilidad | ⚠️ Parcial | Reduced motion respetado. **Falta auditar contraste, áreas táctiles y labels.** |
| Responsive | ❓ Sin verificar | Reglas aplicadas en el código. **Sin probar en ningún tamaño real.** |

---

## Lo que falta, por prioridad

### Bloqueantes del rediseño

1. **Recorrer la app y anotar lo roto.** Nadie la ha visto. Es la etapa 0.
2. **Decidir la paleta.** La implementada no coincide con la del prompt
   (ver `design-bible.md`). `navy` cambia bastante.
3. **Elegir librería de íconos.** Hoy son glifos de texto.

### Funcional pendiente

4. Los tres rituales de progreso (pago cubierto, sueldo recibido, meta
   avanzada).
5. `Skeleton` y `ErrorState` reutilizables.
6. Probar la detección bancaria con una notificación real.
7. Sincronizar la versión de `package.json` con `app.json`.

### Deuda técnica menor

8. Tabla `goals` sin uso (reemplazada por `savings_goals`).
9. La carpeta se llama `FinZen` y el paquete es `com.finzen.app`.
   **Cambiar el paquete haría perder los datos del usuario**; no se
   recomienda.

---

## Documentación

| Archivo | Estado |
|---|---|
| `docs/audit.md` | ✅ |
| `docs/design-bible.md` | ✅ (con la discrepancia de paleta señalada) |
| `docs/product-principles.md` | ✅ |
| `docs/navigation-map.md` | ✅ |
| `docs/financial-rules.md` | ✅ |
| `docs/progress.md` | ✅ este archivo |
| `docs/claude-handoff.md` | ✅ alcance, archivos, verificaciones y limitaciones |
| `docs/data-model.md` | ⬜ pendiente |
| `docs/motion-system.md` | ⬜ pendiente (tras decidir los rituales) |
| `docs/decisions.md` | ⬜ pendiente |

---

## Historial de versiones

| Versión | Qué trajo |
|---|---|
| 1.0.0 | Base: cuentas, movimientos, deudas, coach, análisis |
| 1.1.0 | Gastos fijos, edición de movimientos, deslizar para eliminar |
| 1.2.0 | Tarjetas de crédito con corte, límite de pago y compras a cuotas |
| 1.3.1 | Ingreso seleccionable, coach como pestaña, detección bancaria |
| 2.0.0 | **Mi Platica**: logo, paleta, bug de tarjeta corregido, metas, cuenta principal |
| 2.1.0 | Gastos fijos quincenales |
| 2.2.0 | Análisis con calendario y ciclos de pago |
| 2.3.0 | Notificaciones accionables, cuenta principal, plan de ingreso |
| 2.4.0 | Recordatorios diarios motivacionales |
| 2.5.0 | Mensajes del coach concretos, formato de miles completo, metas con 4 planes |
| 2.6.0 | Inicio v3: tokens de marca, iconos lucide, barra inferior con botón central, Movimientos y Perfil |
| 2.7.0 | Ahorro sin bloqueos: ingresos fijos ponderados por frecuencia, fin del doble conteo, aportes desde $2.000 |
| 2.8.0 | Coach de ingresos en 5 pasos: recomendación, selección, cuentas, revisión, aplicado |

---

## Cómo probar

```bash
cd C:\dev\FinZen; node scripts/verify-all.mjs
```

```bash
& "C:\dev\FinZen\build-apk.ps1"
```

El código fuente vive en el Escritorio; `C:\dev\FinZen` es la copia que
compila (fuera de OneDrive, que hacía el build inviable).

---

## Inicio v3 (versión 2.6.0)

Implementado según `prompt_claude_mi_platica_inicio_v3.md` y el mockup
adjunto.

### Lo que se verificó en el teléfono

Captura real del dispositivo (1080x2400 a 440dpi = **392x873 dp**), abierto
por deep link `miplatica://home`:

- Encabezado con el símbolo de la marca, saludo y nombre, campana con punto
  de aviso y ajustes.
- Saldo "Después de compromisos" en coral cuando es negativo.
- Las tres pastillas (Ingreso, Gasto, Coach) con su icono y sin cortar texto.
- Carrusel de cuentas: la siguiente tarjeta asoma por el borde.
- Panel hueso de "Últimos movimientos" con su estado vacío y su botón.
- Barra inferior: Inicio · Movimientos · Ahorro · Perfil, con el botón
  central flotante y el subrayado del ítem activo.

### Lo que NO se pudo verificar en pantalla

El teléfono es MIUI y tiene apagado "Depuración USB (ajustes de seguridad)",
así que adb no puede inyectar toques (SecurityException: INJECT_EVENTS) ni
cambiar la densidad (WRITE_SECURE_SETTINGS). En concreto:

- **360x800 dp no se probó en pantalla.** Se revisó por cálculo sobre el
  código y apareció un fallo real: con los umbrales anteriores, a 360dp cada
  pastilla mide 100px y el contenido (icono 20 + separación 6 + "Ingreso"
  ~58 + relleno 16) sumaba exactamente 100, así que la etiqueta se habría
  cortado. Se subieron los umbrales de QuickActions a 112/104 para que a
  360dp el icono desaparezca y el texto quepa entero. A 392dp (el teléfono)
  la pastilla mide 110.7px, sigue por encima de 104 y el icono se mantiene:
  por eso la captura ya tomada sigue siendo válida.
- Navegar entre pestañas tocando la barra. Las rutas sí se comprobaron por
  deep link.

### Contradicción pendiente de decisión

El prompt maestro define las pestañas como **Inicio · Deudas · Ahorro ·
Análisis**. El mockup y el prompt v3 las definen como **Inicio · Movimientos
· Ahorro · Perfil** ("Ítems exactos"). Se implementó la del mockup, que es
el documento más reciente, y **Deudas y Análisis no se eliminaron**: siguen
siendo rutas del stack y se llega a ellas desde Perfil, con su resumen a la
vista. Falta confirmar cuál manda.
