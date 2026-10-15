import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/theme/app_theme.dart';
import 'features/home/cubit/home_cubit.dart';
import 'features/home/data/home_repository.dart';
import 'features/home/view/home_screen.dart';

class MiPlaticaApp extends StatelessWidget {
  const MiPlaticaApp({super.key, required this.repository});

  final HomeRepository repository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mi Platica',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.dark,
      home: BlocProvider(
        create: (_) => HomeCubit(repository)..load(),
        child: HomeScreen(
          onNavigate: (route, [params]) {
            // El router real se conecta aquí. Por ahora, no-op seguro.
            debugPrint('navigate → $route ${params ?? ''}');
          },
        ),
      ),
    );
  }
}
