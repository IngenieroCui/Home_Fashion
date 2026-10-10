import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/domain/workshop_job.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/logic/workshop_job_detail_cubit.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/presentation/progress_report_sheet.dart';

import 'helpers/fakes.dart';

void main() {
  testWidgets('PROGRESS valida mensaje y porcentaje sin borrar datos',
      (tester) async {
    final repository = FakeWorkshopJobsRepository();
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider.value(
            value: cubit,
            child: const ProgressReportSheet(
              type: ProgressReportType.progress,
            ),
          ),
        ),
      ),
    );

    await tester.enterText(find.byType(TextFormField).at(0), 'Avance real');
    await tester.enterText(find.byType(TextFormField).at(1), '100');
    final submit = find.text('Enviar reporte');
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pump();

    expect(find.text('El porcentaje debe estar entre 1 y 99.'), findsOneWidget);
    expect(find.text('0 / 5 fotografías'), findsOneWidget);
    expect(find.text('Agregar fotografía'), findsOneWidget);
    expect(find.text('Avance real'), findsOneWidget);
    expect(repository.submitCalls, 0);
    await cubit.close();
  });

  testWidgets('PROGRESS permite enviar sin porcentaje', (tester) async {
    final repository = FakeWorkshopJobsRepository()
      ..job = WorkshopJobDetail(
        id: 'job-1',
        code: 'HF-TAL-001',
        status: WorkshopJobStatus.inProgress,
        orderId: 'order-1',
        orderCode: 'HF-PED-001',
        productName: 'Sofá',
        quantity: 1,
        orderItemStatus: 'IN_PRODUCTION',
        assignedAt: DateTime(2026),
        progressReports: const [],
      );
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );
    await cubit.load();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider.value(
            value: cubit,
            child: const ProgressReportSheet(
              type: ProgressReportType.progress,
            ),
          ),
        ),
      ),
    );

    await tester.enterText(
        find.byType(TextFormField).first, 'Avance sin cifra');
    final submit = find.text('Enviar reporte');
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();

    expect(repository.submitCalls, 1);
    expect(repository.submittedCommand?.progressPercent, isNull);
    expect(repository.submittedCommand?.toJson(), {
      'type': 'PROGRESS',
      'message': 'Avance sin cifra',
    });
    await cubit.close();
  });
}
