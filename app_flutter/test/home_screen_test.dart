import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mi_platica/app.dart';
import 'package:mi_platica/features/home/data/home_repository.dart';

void main() {
  testWidgets('muestra skeleton y luego el saldo del Figma', (tester) async {
    await tester.pumpWidget(
      MiPlaticaApp(
        repository: InMemoryHomeRepository(
          latency: const Duration(milliseconds: 50),
        ),
      ),
    );

    // Durante la carga, el header ya está; el saldo aún no.
    expect(find.text('Últimos movimientos'), findsOneWidget);
    expect(find.text(r'$200.000'), findsNothing);

    // Tras resolver, aparece el saldo y los movimientos.
    await tester.pump(const Duration(milliseconds: 60));
    await tester.pumpAndSettle();

    expect(find.text(r'$200.000'), findsOneWidget);
    expect(find.text('Supermercado Éxito'), findsOneWidget);
  });

  testWidgets('estado offline muestra reintentar', (tester) async {
    await tester.pumpWidget(
      MiPlaticaApp(
        repository: InMemoryHomeRepository(
          latency: const Duration(milliseconds: 20),
          failOnLoad: true,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 30));
    await tester.pumpAndSettle();

    expect(find.text('Sin conexión'), findsOneWidget);
    expect(find.text('Intentar de nuevo'), findsOneWidget);
  });
}
