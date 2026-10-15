# Mi Platica — app Flutter (migración)

Primera pantalla migrada: **Inicio / Dashboard v4**. Sigue el spec
[`../docs/specs/INICIO_DASHBOARD_FLUTTER_SPEC.md`](../docs/specs/INICIO_DASHBOARD_FLUTTER_SPEC.md)
y los estándares del equipo ([`../docs/ESTANDARES_EQUIPO.md`](../docs/ESTANDARES_EQUIPO.md)).

## Cómo ejecutarlo (en tu máquina, con Flutter instalado)

Este repo versiona solo `lib/`, `test/` y `pubspec.yaml`. Las carpetas de
plataforma (`android/`, `ios/`) se generan localmente:

```bash
cd app_flutter
flutter create .          # genera android/ e ios/ sin tocar lib/ ni pubspec
flutter pub get
flutter analyze           # debe salir en verde (0 warnings)
flutter test              # 2 pruebas de la pantalla de Inicio
flutter run               # pruebas iniciales en Android
```

## Estructura

```
lib/
  core/
    theme/      app_colors · app_text_styles · app_dimens · app_theme
    utils/      money.dart  (COP, enteros en centavos, numerales tabulares)
    widgets/    pressable_scale.dart (escala+ripple+háptico) · skeleton.dart (shimmer)
  features/home/
    domain/     home_models.dart   (AccountBalance, TransactionRow, HomeData, enums)
    data/       home_repository.dart (contrato + InMemory con datos del Figma)
    cubit/      home_cubit.dart · home_state.dart  (Initial/Loading/Loaded/Error)
    view/       home_screen.dart
      widgets/  home_header · balance_summary_card · accounts_carousel ·
                coach_advice_card · recent_activity_sheet · coach_mood_card ·
                app_bottom_bar
  app.dart · main.dart
```

## Estado de la migración

- **Hecho:** design system (tokens), Cubit con 4 estados, 6 componentes de la
  pantalla, skeletons con shimmer sin layout shift, microinteracciones,
  estados vacío/error/offline, pull-to-refresh, accesibilidad (toque ≥48dp,
  `Semantics`, reduced-motion), moneda COP centralizada.
- **Pendiente (siguiente):** capa de datos real sobre `sqflite`/`drift`
  (hoy `InMemoryHomeRepository` sirve los datos del Figma), router de navegación
  (hoy `onNavigate` es un hook no-op), y las dudas abiertas del spec
  (fuente de marca definitiva, límite del carrusel, textos de tooltips).

> La fuente recomendada es **Hanken Grotesk** vía `google_fonts` (se descarga en
> tiempo de ejecución). Para fijarla offline, añadir el `.ttf` a `assets/` y
> declararlo en `pubspec.yaml`.
