# Mi Platica — Referencias visuales completas

> Este documento corrige la simplificación anterior. La fuente visual principal vuelve a ser el conjunto de mockups originales de Mi Platica, no únicamente Inicio, Movimientos, Ahorro y Perfil.

## Columna vertebral

La navegación principal prevista en las referencias es:

| Pestaña | Propósito | Referencia |
|---|---|---|
| Inicio | Saldo disponible, acciones rápidas, cuentas, movimientos recientes y Coach | `01_inicio.png` |
| Deudas | Deuda total, estrategia, vencimientos, tarjetas y prioridad de pago | `02_deudas.png` |
| Ahorro | Metas, colchón, planes comparables y proyecciones | `03_ahorro_plan.png` |
| Análisis | Ingresos, gastos, balance, categorías y hábitos | `04_analisis.png` |

El botón central `+` queda reservado para registrar ingreso, gasto o transferencia. **Movimientos, Perfil, Cuentas y Configuración son destinos secundarios**, no deben desaparecer: se abren desde Inicio, el header, Perfil/Configuración o deep links.

## Inventario de referencias

| Archivo | Qué debe conservar Claude |
|---|---|
| `01_inicio.png` | Header oscuro, saldo disponible después de compromisos, botones Ingreso/Gasto/Coach, carrusel de cuentas, últimos movimientos, estado emocional y CTA de recomendaciones. |
| `02_deudas.png` | Deuda total, carga mensual, meses para quedar libre, Avalancha/Bola de nieve, próximos vencimientos, tarjeta de crédito y orden recomendado. |
| `03_ahorro_plan.png` | Meta con monto/faltante, frecuencia quincenal o mensual, planes Equilibrada/Intermedia/Flexible/Fecha elegida, recomendación y selección de plan. |
| `04_analisis.png` | Selector Semana/Quincena/Mes, ingresos/gastos/balance, barras comparativas, categorías, mayor gasto, hábitos y recomendaciones. |
| `05_movimientos.png` | Resumen de periodo, filtros Todos/Ingresos/Gastos, selector de fechas, movimientos por día, tipos de gasto fijo/ahorro y FAB. |
| `06_mis_cuentas.png` | Total en cuentas activas, lista de cuentas, editar, menú contextual, agregar, archivadas y acciones de cuenta. |
| `07_agregar_cuenta.png` | Nombre, tipo, saldo, icono, color, cuenta para nuevos movimientos y guardado. |
| `08_configuracion.png` | Perfil, Preferencias, Mi plata, Seguridad y datos, Ayuda, bloqueo, exportación, privacidad y cerrar sesión. |
| `09_registrar_ingreso.png` | Selector Gasto/Ingreso, monto grande, categorías rápidas, categoría, cuenta, fecha, nota y guardar ingreso. |
| `10_registrar_gasto.png` | Estado gasto coral, categorías rápidas, cuenta, fecha, nota y guardar gasto. Antes de guardar debe aparecer el Coach cuando corresponda. |
| `11_coach_riesgo.png` | Explicación del riesgo, compromisos próximos, diferencia faltante, recomendación humana, Cambiar gasto y Confirmar de todas formas. |
| `12_notificaciones.png` | Vencimientos, recomendación del Coach, gasto revisado, buenos hábitos, avance de ahorro y configurar notificaciones. |

## Reglas que no se pueden perder

- La pantalla **Deudas** es principal, no un módulo escondido.
- **Análisis** debe mostrar comportamiento financiero, no solo una cifra.
- **Configuración** debe conservar Preferencias, Mi plata, Seguridad y datos, Ayuda y Cerrar sesión.
- **Mis cuentas** debe permitir agregar, editar, archivar y consultar movimientos por cuenta.
- La selección de plan de ahorro debe mostrar alternativas comparables con aporte, duración, fecha y impacto sobre compromisos.
- El Coach debe explicar el porqué de una alerta y permitir cambiar o confirmar.
- Todos los montos deben proceder de SQLite/store; los valores de los mockups son solo ilustrativos.
- Mantener el tono cercano en español colombiano y la identidad navy/turquesa/amarillo/coral.
- No convertir los mockups en imágenes dentro de la app: son referencias para construir componentes reales.

## Orden de implementación recomendado

1. Fundaciones visuales y navegación principal: Inicio, Deudas, Ahorro, Análisis.
2. Flujos de registro: ingreso, gasto, Coach previo y asignación del ingreso.
3. Movimientos y detalle por cuenta.
4. Mis cuentas: lista, agregar, editar, archivar y detalle.
5. Deudas: lista, detalle, abono, crédito y estrategias.
6. Ahorro: metas, planes comparables, aportes e inversiones.
7. Análisis: periodo, métricas, categorías, hábitos y recomendaciones.
8. Notificaciones y deep links.
9. Configuración, preferencias, seguridad, datos, privacidad y ayuda.
10. Onboarding, estados vacíos, errores, accesibilidad, modo oscuro y pruebas.

## Uso del paquete

Claude debe leer este documento junto con `ANEXO_FLUJOS_COMPLETOS_MI_PLATICA.md`, `MI_PLATICA_DISENO_INTEGRAL_V1.md`, `design-bible.md`, `navigation-map.md` y `financial-rules.md`. El anexo agrega Editar movimiento, Ahorro e inversiones, Perfil, Ingresos fijos, datos de entidad bancaria, Ajustes, Coach y Notificaciones móviles. Las imágenes en `outputs/referencias-completas/` son la referencia visual de aprobación; no son código ni sustituyen la implementación.
