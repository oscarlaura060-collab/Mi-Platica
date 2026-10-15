# Estándares del equipo — Mi Platica

> **Para Claude (líder/arquitecto), Codex (implementación) y Grok/Google (auditoría QA).**
> Este documento es la autoridad sobre *cómo* se construye y *qué* se exige. Rige por encima de
> preferencias individuales. Léelo antes de abrir una tarea; audítalo antes de cada merge.
>
> Definido por el dueño del producto. Última actualización: migración a Flutter.

---

## 0. Stack (decisión firme)

- **Flutter** para **Android e iOS** desde una sola base de código.
- **Gestión de estado: BLoC / Cubit.** Sin `setState` para lógica de dominio.
- **Capas:** `presentation` (widgets + Cubit) → `domain` (modelos, casos de uso) → `data`
  (repositorios sobre `sqflite`/`drift`).
- **Offline-first:** base de datos local es la fuente primaria; cero backend obligatorio.
- Las pruebas iniciales se ejecutan en **Android**.

> Migración deliberada desde la implementación React+Vite existente, que queda como **referencia
> de estructura y valores** (ya validada en producción), no como objetivo final.

---

## 1. Fidelidad y superación del diseño

- **Respetar estrictamente** la estructura, distribución y pantallas de Figma (archivo
  `Mi-Platica`). No reordenar nodos ni inventar jerarquías.
- **El código debe verse mejor que el Figma.** Acabado UI *premium*:
  - Elevaciones y **sombras suaves** (nunca sombras duras ni genéricas).
  - **Bordes limpios de 1px** y radios consistentes con los tokens.
  - **Microinteracciones** en todo elemento tocable: escala al presionar (0.95 botones / 0.99 filas),
    ripple e **respuesta háptica**.
  - **Transiciones fluidas** (fade/slide con curvas intencionales; sin saltos).
- Cada pantalla parte de su **spec técnico** en `docs/specs/`. Ejemplo de referencia completo:
  [`docs/specs/INICIO_DASHBOARD_FLUTTER_SPEC.md`](specs/INICIO_DASHBOARD_FLUTTER_SPEC.md).

## 2. Experiencia de carga — Skeletons, nunca spinners

- **Prohibido** cualquier cargador genérico: spinners, `CircularProgressIndicator`, barras indeterminadas.
- Cada vista implementa **Skeleton Loaders con Shimmer** cuya forma **coincide exactamente** con las
  tarjetas y componentes reales.
- **Sin layout shift:** el skeleton ocupa la **misma caja** (ancho, alto, radio) que el contenido real;
  la transición skeleton→datos es un *cross-fade* (~200ms) sin animar la altura.

## 3. Jerarquía visual y accesibilidad (WCAG 2.1 AA/AAA)

- Jerarquía financiera clara y constante: **saldo** (protagonista) → **ingresos/gastos** →
  **movimientos** → acciones secundarias.
- **Tokens de diseño centralizados** (`AppColors`, `AppTextStyles`, `AppRadius`, `AppShadows`).
  **Cero colores o medidas hardcodeados** en widgets.
- **Contraste:** texto normal ≥ **4.5:1**, texto grande ≥ 3:1; preferir AAA (≥7:1) donde se pueda.
  Amarillo/coral solo como fondo o ícono sobre superficies claras; para texto usar variantes accesibles.
- **Áreas de toque ≥ 48×48 dp.** Tamaños de texto escalables (respetar `textScaleFactor`).
- `Semantics` en íconos de acción y filas de lista; soporte de *reduced motion*
  (`MediaQuery.disableAnimations`).

## 4. Aportes proactivos (obligatorio proponer, no callar)

Si el Figma omite algo indispensable para una app financiera moderna, **agrégalo y decláralo** como
adición recomendada en el spec/PR. Mínimos esperados:

- **Estados vacíos** (sin cuentas, sin movimientos) con CTA clara.
- **Manejo de errores de red / offline** sin bloquear la app (es offline-first): chip discreto, no muro.
- **Formato de moneda** centralizado (COP, es-CO, enteros en centavos, **numerales tabulares**).
- **Tooltips** aclaratorios en conceptos (p. ej. cómo se calcula el "saldo disponible").
- **Validaciones** de entrada (montos, fechas) con mensajes sin culpa.

## 5. Orden y verificación (Definition of Done antes de cada merge)

Un PR solo se fusiona si cumple **todo** lo siguiente:

- [ ] **Modular:** un feature por carpeta; widgets reutilizables extraídos; sin duplicar tokens.
- [ ] **Fiel al spec** de la pantalla (`docs/specs/`) y al Figma; diferencias documentadas.
- [ ] **Skeletons** por vista, sin spinners, sin layout shift.
- [ ] **Accesibilidad** verificada: contrastes, áreas de toque ≥48dp, semántica.
- [ ] **Estados** cubiertos: Initial / Loading / Loaded / Error (y vacío/offline donde aplique).
- [ ] **Análisis y pruebas** en verde: `flutter analyze` sin warnings, `flutter test` pasando.
- [ ] **Auditoría QA** (Grok/Google) registrada antes del merge: seguridad, rendimiento, fidelidad.
- [ ] **Aprobación final** del líder (Claude) sobre la implementación + el reporte de QA.
- [ ] Commits limpios y descriptivos; nada de código muerto ni `print` de depuración.

---

## Flujo multi-IA (resumen)

1. **Claude (diseño/arquitectura):** lee el requerimiento y el Figma, redacta el spec en `docs/specs/`.
   Cierra con: *"🟢 Listo Óscar, especificación terminada. Pásaselo a Codex."*
2. **Codex (implementación):** toma el spec y entrega el código Flutter (`.dart`) modular.
   Cierra con: *"🟢 Listo Óscar, código generado. Haz commit/push en GitHub y pásaselo a Grok."*
3. **Grok / Google (auditoría):** revisa seguridad + fidelidad + rendimiento y emite el reporte QA.
   Cierra con: *"🟢 Listo Óscar, módulo aprobado. Haz el merge en GitHub y pásale la siguiente pantalla a Claude."*
4. **Claude (aprobación):** valida implementación + reporte y autoriza el merge a `main`.

---

## Plantilla de entrega Claude → Codex

Claude cierra **cada** spec con este bloque, ya rellenado, para copiar y pegar a Codex.
Reemplazar `{PANTALLA}`, `{SPEC_PATH}` y `{COMMIT}` según la pantalla.

> **Para Codex 💻 — Pantalla: {PANTALLA} (Mi Platica, Flutter)**
>
> Repo: `oscarlaura060-collab/Mi-Platica` · Rama: `claude/sharp-edison-xrhnsx`
>
> Eres el desarrollador Flutter. Lee primero, en este orden:
> 1. `{SPEC_PATH}` — la especificación completa (tokens, skeletons, estados, medidas exactas).
> 2. `docs/ESTANDARES_EQUIPO.md` — los estándares y el Definition of Done.
>
> Si ya hay un borrador en `/app_flutter` (commit `{COMMIT}`), **no empieces de cero**: tómalo como
> punto de partida, compílalo, verifícalo y complétalo.
>
> Tu tarea:
> 1. Validar que compila: `cd app_flutter && flutter create . && flutter pub get && flutter analyze && flutter test`
>    (corrige warnings con `dart fix --apply` y `dart format .`).
> 2. Aplicar los deltas/decisiones anotados al final del spec.
> 3. Completar stubs (capa de datos real `sqflite`/`drift`, router).
> 4. Respetar: BLoC/Cubit, skeletons con shimmer sin layout shift, tokens centralizados
>    (cero colores hardcodeados), accesibilidad (toque ≥48dp, `Semantics`, reduced-motion).
>
> Si faltan helpers, validadores o widgets compartidos, créalos. Al terminar, cierra con:
> **"🟢 Listo Óscar, código generado. Haz commit/push en GitHub y pásaselo a Grok."**

Si Codex no tiene acceso directo al repo, Claude entrega una variante con el contenido del spec
pegado dentro (autosuficiente).
