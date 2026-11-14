import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../features/auth/logic/session_cubit.dart';
import 'app_router.dart';
import 'bootstrap.dart';
import 'home_fashion_theme.dart';

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
          pendingSubmissionStore: widget.dependencies.pendingSubmissionStore,
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
        theme: buildHomeFashionTheme(Brightness.light),
        darkTheme: buildHomeFashionTheme(Brightness.dark),
        themeMode: ThemeMode.system,
        routerConfig: _appRouter.router,
      ),
    );
  }
}
