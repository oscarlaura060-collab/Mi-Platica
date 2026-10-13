# Mi Platica — Guía y Contexto del Proyecto para Antigravity

Bienvenido a **Mi Platica**, una aplicación móvil de finanzas personales diseñada para el contexto colombiano (pesos COP, ciclos quincenales y mensuales, cuentas como Nequi, Bancolombia, Daviplata).

---

## 🏛️ Principios de Arquitectura Obligatorios
- **100% Local y Offline:** Base de datos SQLite local (12 migraciones), cero servidores externos, cero backend, permiso de internet bloqueado.
- **Sin cuentas ni nube:** No implementar autenticación de Supabase ni Firebase. La privacidad y funcionamiento offline son primordiales.
- **Derivación contable real:** Nunca denormalizar saldos. Todo saldo se deriva de transacciones (`v_account_balances`, `v_credit_cards`, etc.).
- **Verificación:** Ejecutar `npm run typecheck` y `node scripts/verify-all.mjs` antes de cualquier confirmación de cambios.

---

## 🎨 Identidad Visual: "Ola Financiera" (Stitch v4)
- **Concepto:** Ritmo sereno, curvas orgánicas, calidez caribeña sobria y confianza. No clichés de playa, palmeras ni billetes animados.
- **Paleta base:**
  - Fondo oscuro: `#071A2A` (`BRAND.navy`)
  - Fondo claro: `#F8F8F3` (`BRAND.offWhite`)
  - Superficies tonales (Stitch v4): `#0A1D2D` (`BRAND.surfaceContainerLow`), `#0F2131`, `#1A2B3C`, `#253647`
  - Turquesa: `#14C4D4` (`BRAND.turquoise`)
  - Amarillo Coach: `#FFD447` (`BRAND.yellow`)
  - Coral gastos/alertas: `#FF6F61` (`BRAND.coral`)
- **Tokens centralizados:** Todo color o dimensión DEBE venir de `src/theme/tokens.ts` o `useTheme()`. Nunca escribir colores hexadecimales o medidas aisladas en componentes.
- **Accesibilidad WCAG 2.2 AA:** Contraste mínimo de 4.5:1 para texto normal, áreas táctiles $\ge 48 \times 48\,\text{dp}$, labels para lectores TalkBack, respeto a `reduceMotion`.

---

## ⚖️ Las 4 Reglas Obligatorias de Diseño
1. **Una cifra principal y un siguiente paso:** Cada pantalla debe tener una métrica protagonista y una acción principal clara e inmediata.
2. **Mostrar lo necesario, ampliar a petición:** Evitar saturar la pantalla. Detalles técnicos y cálculos van en secciones secundarias o desplegables intencionales.
3. **Cero culpa y autonomía:** El Coach caribeño aconseja y reflexiona sin juzgar ni regañar. La persona siempre decide (ej. "Registrar de todas formas").
4. **Consistencia accesible y honesta:** Explicar las cifras con claridad y nunca inventar saldos, rendimientos ni datos faltantes.

---

## 📍 Estado Actual del Trabajo
1. **Tokens y UI Base:** Configurados en `src/theme/tokens.ts`, `src/theme/index.tsx`, `src/components/ui.tsx`.
2. **Piloto Completado:**
   - **Inicio (`HomeScreen`):** Saldo héroe disponible ($36\,\text{dp}$), píldoras de acción rápida accesibles (`+ Ingreso`, `- Gasto`), carrusel tonal y tarjeta reflexiva del Coach.
   - **Deudas (`DebtsScreen`):** Total pendiente héroe, cuota mensual, proyección honesta *"Libre en N meses"*, selector de estrategia (Avalancha vs Bola de Nieve) con consejo sin culpas.
   - Detalle en: `docs/PILOTO_DISENO_INICIO_DEUDAS.md`.
3. **Siguiente Grupo de Pantallas:**
   - **Grupo A (Transacciones y Registro):** `src/features/transactions/QuickAddModal.tsx`, `src/features/coach/income/AllocateIncomeScreen.tsx`, `src/features/movements/MovementFormScreen.tsx`.
   - **Grupo B (Ahorro y Metas):** `src/features/savings/SavingsScreen.tsx`, `GoalDetailScreen.tsx`, `GoalFormScreen.tsx`.
   - **Grupo C (Compromisos Fijos):** `src/features/fixed/FixedExpensesScreen.tsx`, `FixedIncomesScreen.tsx`.
   - **Grupo D (Dashboard y Coach):** `src/features/coach/CoachScreen.tsx`, `src/features/settings/SettingsScreen.tsx`.
