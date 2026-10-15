import 'package:flutter/material.dart';

import 'app.dart';
import 'features/home/data/home_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Repositorio en memoria con datos del Figma. Reemplazar por la
  // implementación sobre sqflite/drift cuando la capa de BD esté lista.
  runApp(MiPlaticaApp(repository: InMemoryHomeRepository()));
}
