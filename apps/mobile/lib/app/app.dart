import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../features/auth/logic/session_cubit.dart';
import 'app_router.dart';
import 'bootstrap.dart';

class HomeFashionWorkshopApp extends StatefulWidget {
  const HomeFashionWorkshopApp({
    required this.dependencies,
    this.appRouter,
    super.key,
  });

  final AppDependencies dependencies;
  final AppRouter? appRouter;

  @override
  State<HomeFashionWorkshopApp> createState() => _HomeFashionWorkshopAppState();
}

class _HomeFashionWorkshopAppState extends State<HomeFashionWorkshopApp> {
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _appRouter = widget.appRouter ??
        AppRouter(
          sessionCubit: widget.dependencies.sessionCubit,
          workshopJobsRepository: widget.dependencies.workshopJobsRepository,
        );
    widget.dependencies.sessionCubit.restore();
  }

  @override
  void dispose() {
    _appRouter.dispose();
    widget.dependencies.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider<SessionCubit>.value(
      value: widget.dependencies.sessionCubit,
      child: MaterialApp.router(
        title: 'Home Fashion Talleres',
        debugShowCheckedModeBanner: false,
        locale: const Locale('es', 'CO'),
        supportedLocales: const [Locale('es', 'CO')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: _theme(),
        routerConfig: _appRouter.router,
      ),
    );
  }

  ThemeData _theme() {
    const seed = Color(0xFF98462F);
    final scheme = ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.light,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFFAF8F4),
      appBarTheme: AppBarTheme(
        backgroundColor: const Color(0xFFFAF8F4),
        foregroundColor: scheme.onSurface,
        centerTitle: false,
        elevation: 0,
        titleTextStyle: TextStyle(
            color: scheme.onSurface, fontSize: 20, fontWeight: FontWeight.w600),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFC8BDAD))),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
