import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:home_fashion_workshop/core/network/session_events.dart';
import 'package:home_fashion_workshop/features/auth/logic/session_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/presentation/workshop_jobs_page.dart';

import 'helpers/fakes.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/domain/workshop_job.dart';

void main() {
  testWidgets('trabajos a 390px admite texto del sistema a 1.5',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeWorkshopJobsRepository()
      ..page = WorkshopJobsPage(items: [
        WorkshopJobSummary(
            id: 'job-scale',
            code: 'HF-TAL-2026-00001',
            status: WorkshopJobStatus.readyForReview,
            orderCode: 'HF-PED-2026-00001',
            productName: 'Sofá Verona de tres puestos',
            quantity: 1,
            assignedAt: DateTime(2026))
      ], page: 1, limit: 12, total: 1, totalPages: 1);
    final events = SessionEvents();
    final session =
        SessionCubit(repository: FakeAuthRepository(), events: events);
    addTearDown(session.close);
    addTearDown(events.close);
    await tester.pumpWidget(BlocProvider.value(
        value: session,
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(1.5)),
              child: child!),
          home: WorkshopJobsPageView(repository: repository),
        )));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Mis trabajos'), findsOneWidget);
  });

  testWidgets('limpiar búsqueda cancela el debounce pendiente', (tester) async {
    final repository = FakeWorkshopJobsRepository();
    final events = SessionEvents();
    final session =
        SessionCubit(repository: FakeAuthRepository(), events: events);
    addTearDown(session.close);
    addTearDown(events.close);
    await tester.pumpWidget(
      BlocProvider.value(
          value: session,
          child:
              MaterialApp(home: WorkshopJobsPageView(repository: repository))),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'sofá');
    await tester.pump();
    await tester.tap(find.byTooltip('Limpiar búsqueda'));
    await tester.pump(const Duration(milliseconds: 600));

    expect(repository.listCalls, 2);
    expect(repository.listQueries, ['', '']);
  });
}
