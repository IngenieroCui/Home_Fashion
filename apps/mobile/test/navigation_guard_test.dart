import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/app/app.dart';
import 'package:home_fashion_workshop/app/app_router.dart';
import 'package:home_fashion_workshop/app/bootstrap.dart';
import 'package:home_fashion_workshop/core/network/session_events.dart';
import 'package:home_fashion_workshop/features/auth/logic/session_cubit.dart';

import 'helpers/fakes.dart';

void main() {
  testWidgets('guard redirige una ruta protegida al login sin sesión',
      (tester) async {
    final repository = FakeAuthRepository();
    final events = SessionEvents();
    final cubit = SessionCubit(repository: repository, events: events);
    final dependencies = AppDependencies(
      sessionCubit: cubit,
      authRepository: repository,
      sessionEvents: events,
      workshopJobsRepository: FakeWorkshopJobsRepository(),
    );
    final appRouter = AppRouter(
      sessionCubit: cubit,
      workshopJobsRepository: dependencies.workshopJobsRepository,
    );

    await tester.pumpWidget(
      HomeFashionWorkshopApp(
        dependencies: dependencies,
        appRouter: appRouter,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Ingresar'), findsOneWidget);

    appRouter.router.go('/home');
    await tester.pumpAndSettle();

    expect(find.text('Ingresar'), findsOneWidget);
    expect(find.text('Home Fashion Talleres'), findsOneWidget);
  });
}
