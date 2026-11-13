import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/data/pending_submission_store.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/domain/workshop_job.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/logic/workshop_job_detail_cubit.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/presentation/progress_report_sheet.dart';

import 'helpers/fakes.dart';

WorkshopJobDetail _job() => WorkshopJobDetail(
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

const _command = SubmitProgressCommand(
  type: ProgressReportType.progress,
  message: 'Respuesta perdida',
  progressPercent: 40,
);

Future<WorkshopJobDetailCubit> _cubit(
    FakeWorkshopJobsRepository repository, PendingSubmissionStore store) async {
  final cubit = WorkshopJobDetailCubit(
      repository: repository, jobId: 'job-1', pendingStore: store);
  await cubit.load();
  return cubit;
}

void main() {
  test('reutiliza el requestId tras perder la respuesta y reiniciar la app',
      () async {
    final store = MemoryPendingSubmissionStore();
    final repository = FakeWorkshopJobsRepository()
      ..job = _job()
      ..submitError = const NetworkException();
    final first = await _cubit(repository, store);
    expect(await first.submit(_command), isFalse);
    final firstId = repository.submittedCommand!.requestId;
    expect(firstId, matches(r'^[a-f0-9]{32}$'));
    expect((await store.read('job-1'))?.requestId, firstId);
    await first.close(); // Simulates closing the app.

    repository.submitError = null;
    final reopened = await _cubit(repository, store);
    expect(await reopened.submit(_command), isTrue);
    expect(repository.submittedCommand!.requestId, firstId);
    expect(await store.read('job-1'), isNull);
    await reopened.close();
  });

  test('un rechazo definitivo descarta el pendiente', () async {
    final store = MemoryPendingSubmissionStore();
    final repository = FakeWorkshopJobsRepository()
      ..job = _job()
      ..submitError = const WorkshopValidationException('Inválido');
    final cubit = await _cubit(repository, store);
    expect(await cubit.submit(_command), isFalse);
    expect(await store.read('job-1'), isNull);
    await cubit.close();
  });

  test('un contenido distinto usa un requestId nuevo', () async {
    final store = MemoryPendingSubmissionStore();
    final repository = FakeWorkshopJobsRepository()
      ..job = _job()
      ..submitError = const ApiException('Caído', statusCode: 503);
    final cubit = await _cubit(repository, store);
    await cubit.submit(_command);
    final firstId = repository.submittedCommand!.requestId;
    await cubit.submit(const SubmitProgressCommand(
        type: ProgressReportType.progress, message: 'Otro texto'));
    expect(repository.submittedCommand!.requestId, isNot(firstId));
    await cubit.close();
  });

  testWidgets('la hoja restaura el borrador pendiente con aviso',
      (tester) async {
    final store = MemoryPendingSubmissionStore();
    await store.write(
        'job-1',
        PendingSubmission(
          requestId: 'a' * 32,
          fingerprint: 'f',
          type: 'PROGRESS',
          message: 'Borrador pendiente',
          progressPercent: 30,
          imagePaths: const [],
          createdAt: DateTime.now(),
        ));
    final repository = FakeWorkshopJobsRepository()..job = _job();
    final cubit = await _cubit(repository, store);
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: BlocProvider.value(
                value: cubit,
                child: const ProgressReportSheet(
                    type: ProgressReportType.progress)))));
    await tester.pumpAndSettle();
    expect(find.text('Borrador pendiente'), findsOneWidget);
    expect(find.text('30'), findsOneWidget);
    expect(find.textContaining('envío sin confirmar'), findsOneWidget);
    await cubit.close();
  });
}
