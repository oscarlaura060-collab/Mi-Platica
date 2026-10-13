# Propuesta Piloto: Inicio y Deudas (Ola Financiera v4)

Este documento detalla la implementación del piloto visual de **Mi Platica**, abarcando la pantalla principal (**Inicio**) y una pantalla financiera compleja (**Deudas**), diseñadas bajo el concepto **"Ola Financiera"** y alineadas con los lineamientos de Stitch v4, el PRD y WCAG 2.2 AA.

---

## 1. Fundamentos del Sistema de Diseño Aplicados

### Tokens Semánticos y Superficies Tonales
Se expandió la jerarquía de superficies en `src/theme/tokens.ts` e `src/theme/index.tsx` para evitar contrastes forzados o colores chillones:
- **Fondo base:** `#071A2A` (Navy profundo).
- **Superficies elevadas (Stitch v4):** 
  - `surfaceContainerLowest`: `#000F1E`
  - `surfaceContainerLow`: `#0A1D2D` (tarjetas héroe y contenedores principales)
  - `surfaceContainer`: `#0F2131`
  - `surfaceContainerHigh`: `#1A2B3C`
  - `surfaceContainerHighest`: `#253647`
- **Textos de alto contraste:** `#F4FAFC` (principal, >12:1 sobre navy) y `#9EB5C5` (secundario, >5.2:1 sobre navy, superando el estándar WCAG AA de 4.5:1).
- **Accentos funcionales:**
  - `turquoise`: `#14C4D4` (saldo disponible y acciones de ingreso).
  - `yellow`: `#FFD447` (Coach reflexivo y abonos a deuda).
  - `coral`: `#FF6F61` (gastos y compromisos próximos).
- **Tipografía y Escala:** Escala Manrope con soporte de display numérico (`hero`: 46dp, `displayCurrencyMobile`: 30dp).

---

## 2. Pantalla Piloto 1: Inicio (`HomeScreen`)

### Cumplimiento de las 4 Reglas

| Regla | Implementación en Inicio |
| :--- | :--- |
| **1. Una cifra principal y un siguiente paso** | **Cifra Héroe:** *Saldo disponible hoy* con tipografía de 36dp y badge de estado semántico ("Al día").<br>**Siguiente paso:** Píldoras de acción rápida con área táctil accesible de 48dp: `+ Ingreso` (Turquesa) y `- Gasto` (Coral suave). |
| **2. Mostrar lo necesario, ampliar a petición** | Debajo del saldo se muestra una síntesis compacta de compromisos del mes (`$X pendientes`), sin abrumar con la lista completa. Las cuentas en el carrusel usan tarjetas de superficie tonal elevada con insignias discretas por entidad, en lugar de bloques de color estridentes. |
| **3. Cero culpa y autonomía** | La tarjeta del **Coach Mi Platica** formula reflexiones amigables y de acompañamiento caribeño sobre el ritmo de gasto diario, invitando a ver el plan sin juzgar ni usar tonos de alarma o culpa. |
| **4. Consistencia accesible y honesta** | Formato de moneda en pesos colombianos (`COP`), nombres claros de entidades bancarias locales (Nequi, Bancolombia, Daviplata), soporte para lectores de pantalla TalkBack y respeto de la preferencia del sistema `reduceMotion`. |

### Archivos intervenidos en Inicio:
- `src/theme/tokens.ts`
- `src/theme/index.tsx`
- `src/components/ui.tsx`
- `src/features/home/components/HomeHeader.tsx`
- `src/features/home/components/BalanceSummary.tsx`
- `src/features/home/components/CoachAdviceCard.tsx`
- `src/features/home/components/AccountsCarousel.tsx`
- `src/features/home/HomeScreen.tsx`

---

## 3. Pantalla Piloto 2: Deudas (`DebtsScreen`)

### Cumplimiento de las 4 Reglas

| Regla | Implementación en Deudas |
| :--- | :--- |
| **1. Una cifra principal y un siguiente paso** | **Cifra Héroe:** *Total pendiente por pagar* en tarjeta elevada `surfaceContainerLow` con badge indicador del número de deudas activas.<br>**Métricas clave emparejadas:** Proyección honesta *"Libre en N meses"* y cuota mensual total.<br>**Siguiente paso:** Píldoras de acción principales accesibles (`+ Agregar deuda` y `⚡ Registrar abono` dirigida prioritariamente a la cuota que vence primero). |
| **2. Mostrar lo necesario, ampliar a petición** | Selector de estrategia de amortización (Avalancha vs. Bola de nieve) mediante interruptor táctil ergonómico. Si hay un vencimiento urgente en los próximos 15 días, se destaca con una pastilla de atención sin bloquear el resto de la pantalla. |
| **3. Cero culpa y autonomía** | La sección de estrategia incluye el consejo: *"Sin culpas: ¡Tú tienes la autonomía para liquidar como te dé más tranquilidad!"*. Se explica la diferencia financiera entre ambas opciones sin juzgar las deudas del usuario. |
| **4. Consistencia accesible y honesta** | El cálculo de "Libre en N meses" utiliza el motor de amortización real (`monthsToPayoff`), sin falsas simplificaciones lineales. Si una tasa no permite amortizar con la cuota actual, el sistema lo indica con honestidad ("—") en vez de ocultar el riesgo. |

### Archivos intervenidos en Deudas:
- `src/features/debts/DebtsScreen.tsx`

---

## 4. Verificación Técnica y de Accesibilidad

1. **Compilación y Tipado:** `npm run typecheck` completado con código de salida **0** (sin errores).
2. **Reglas Financieras y Base de Datos:** `node scripts/verify-all.mjs` completado con éxito al 100% (todas las 12 migraciones, vistas de saldos de tarjeta, cuotas quincenales y amortizaciones verificadas).
3. **WCAG 2.2 AA & Android Guidelines:**
   - Botones de acción rápida y cabecera cuentan con `minHeight: 48` y áreas `hitSlop` de al menos 48 × 48 dp.
   - Contraste superior a 4.5:1 en textos estándar y 3:1 en componentes gráficos.
   - Respeto del flag `reduceMotion` para usuarios con sensibilidad visual.
   - Atributos `accessibilityRole`, `accessibilityLabel` y `accessibilityHint` integrados.

---

## 5. Próximos Pasos (Siguientes Grupos de Pantallas)

Una vez aprobada esta dirección visual, continuar con los grupos ordenados de pantallas:
1. **Grupo A: Transacciones y Registro Rápido:** `QuickAddModal`, `AllocateIncomeScreen` (distribución de quincena del PRD), `MovementFormScreen`.
2. **Grupo B: Ahorro y Metas:** `SavingsScreen`, `GoalDetailScreen`, `GoalFormScreen`.
3. **Grupo C: Presupuesto y Compromisos Fijos:** `FixedExpensesScreen`, `FixedIncomesScreen`.
4. **Grupo D: Dashboard, Coach y Ajustes:** `CoachScreen`, `SettingsScreen`, `ExportScreen`.
