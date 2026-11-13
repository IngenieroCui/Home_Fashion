import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/data/workshop_jobs_repository.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/domain/workshop_job.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/logic/workshop_job_detail_cubit.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/logic/workshop_jobs_cubit.dart';

import 'helpers/fakes.dart';

void main() {
  test('listado vacío finaliza correctamente', () async {
    final repository = FakeWorkshopJobsRepository();
    final cubit = WorkshopJobsCubit(repository: repository);

    await cubit.load();

    expect(cubit.state.status, WorkshopJobsLoadStatus.success);
    expect(cubit.state.items, isEmpty);
    await cubit.close();
  });

  test('summary global se conserva al filtrar, buscar y cambiar página',
      () async {
    const summary = WorkshopJobsSummary(
        assigned: 7, inProgress: 12, readyForReview: 3, completed: 20);
    final repository = FakeWorkshopJobsRepository()
      ..page = const WorkshopJobsPage(
          items: [],
          page: 1,
          limit: 12,
          total: 24,
          totalPages: 2,
          summary: summary);
    final cubit = WorkshopJobsCubit(repository: repository);
    await cubit.load();
    await cubit.setFilter(WorkshopJobStatus.inProgress);
    expect(cubit.state.summary, same(summary));
    await cubit.search('sofá');
    expect(cubit.state.summary, same(summary));
    repository.page = const WorkshopJobsPage(
        items: [],
        page: 2,
        limit: 12,
        total: 24,
        totalPages: 2,
        summary: summary);
    await cubit.loadMore();
    expect(cubit.state.page, 2);
    expect(cubit.state.summary, same(summary));
    await cubit.close();
  });

  test('error de listado conserva retry posible', () async {
    final repository = FakeWorkshopJobsRepository()
      ..listError = const NetworkException();
    final cubit = WorkshopJobsCubit(repository: repository);

    await cubit.load();
    expect(cubit.state.status, WorkshopJobsLoadStatus.failure);

    repository.listError = null;
    await cubit.load();
    expect(cubit.state.status, WorkshopJobsLoadStatus.success);
    expect(repository.listCalls, 2);
    await cubit.close();
  });

  test('load more tardío no mezcla resultados con una búsqueda nueva',
      () async {
    final repository = _DelayedListRepository();
    final cubit = WorkshopJobsCubit(repository: repository);
    await cubit.load();

    final staleRequest = cubit.loadMore();
    await Future<void>.delayed(Duration.zero);
    await cubit.search('nuevo');
    repository.stalePage.complete(
      WorkshopJobsPage(
        items: [_summary('stale', 'Resultado anterior')],
        page: 2,
        limit: 12,
        total: 2,
        totalPages: 2,
      ),
    );
    await staleRequest;

    expect(cubit.state.items.map((item) => item.id), ['new']);
    expect(cubit.state.isLoadingMore, isFalse);
    await cubit.close();
  });

  test('detalle bloquea submit incompatible sin llamar al repositorio',
      () async {
    final repository = FakeWorkshopJobsRepository()
      ..job = _job(WorkshopJobStatus.assigned);
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );
    await cubit.load();

    final success = await cubit.submit(
      const SubmitProgressCommand(
        type: ProgressReportType.progress,
        message: 'No permitido',
        progressPercent: 20,
      ),
    );

    expect(success, isFalse);
    expect(repository.submitCalls, 0);
    expect(cubit.state.submitError, isA<InvalidWorkshopStateException>());
    await cubit.close();
  });

  test('error de submit deja detalle y comando disponibles para reintentar',
      () async {
    final repository = FakeWorkshopJobsRepository()
      ..job = _job(WorkshopJobStatus.inProgress)
      ..submitError = const NetworkException();
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );
    await cubit.load();
    const command = SubmitProgressCommand(
      type: ProgressReportType.progress,
      message: 'Tapizado listo',
      progressPercent: 60,
    );

    expect(await cubit.submit(command), isFalse);

    expect(cubit.state.job, isNotNull);
    expect(cubit.state.submitError, isA<NetworkException>());
    final sent = repository.submittedCommand!;
    expect(sent.type, command.type);
    expect(sent.message, command.message);
    expect(sent.progressPercent, command.progressPercent);
    expect(sent.requestId, matches(r'^[a-f0-9]{32}$'));
    await cubit.close();
  });

  test('POST exitoso conserva éxito local aunque falle el refresh', () async {
    final repository = FakeWorkshopJobsRepository()
      ..job = _job(WorkshopJobStatus.inProgress);
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );
    await cubit.load();
    repository.detailError = const NetworkException();

    final success = await cubit.submit(
      const SubmitProgressCommand(
        type: ProgressReportType.readyForReview,
        message: 'Fabricación terminada',
      ),
    );
    await Future<void>.delayed(Duration.zero);

    expect(success, isTrue);
    expect(cubit.state.submitError, isNull);
    expect(cubit.state.job?.status, WorkshopJobStatus.readyForReview);
    expect(cubit.state.job?.progressReports, hasLength(1));
    expect(repository.submitCalls, 1);
    await cubit.close();
  });

  test('reporte local no se duplica al aplicarse nuevamente', () {
    final report = ProgressReport(
      id: 'report-1',
      type: ProgressReportType.progress,
      message: 'Avance',
      reviewStatus: ProgressReviewStatus.pending,
      submittedAt: DateTime(2026),
      evidenceUrls: const [],
    );

    final result = _job(WorkshopJobStatus.inProgress)
        .withSubmittedReport(report)
        .withSubmittedReport(report);

    expect(result.progressReports, hasLength(1));
  });

  test('close cancela carga y evita emitir una respuesta tardía', () async {
    final repository = _ControlledDetailRepository();
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );

    final pending = cubit.load();
    await Future<void>.delayed(Duration.zero);
    await cubit.close();
    expect(repository.detailCancel?.isCancelled, isTrue);
    repository.detailCompleter.complete(_job(WorkshopJobStatus.assigned));
    await pending;
  });

  test('submit concurrente se bloquea y close cancela el envío activo',
      () async {
    final repository = _ControlledSubmitRepository();
    final cubit = WorkshopJobDetailCubit(
      repository: repository,
      jobId: 'job-1',
    );
    await cubit.load();
    const command = SubmitProgressCommand(
      type: ProgressReportType.progress,
      message: 'Avance',
    );

    final pending = cubit.submit(command);
    await Future<void>.delayed(Duration.zero);
    expect(await cubit.submit(command), isFalse);
    await cubit.close();
    expect(repository.submitCancel?.isCancelled, isTrue);
    repository.submitCompleter.complete(
      ProgressReport(
        id: 'late',
        type: ProgressReportType.progress,
        message: 'Avance',
        reviewStatus: ProgressReviewStatus.pending,
        submittedAt: DateTime(2026),
        evidenceUrls: const [],
      ),
    );
    expect(await pending, isFalse);
    expect(repository.submitCalls, 1);
  });
}

WorkshopJobDetail _job(WorkshopJobStatus status) => WorkshopJobDetail(
      id: 'job-1',
      code: 'HF-TAL-001',
      status: status,
      orderId: 'order-1',
      orderCode: 'HF-PED-001',
      productName: 'Sofá',
      quantity: 1,
      orderItemStatus: status == WorkshopJobStatus.assigned
          ? 'PENDING_PRODUCTION'
          : 'IN_PRODUCTION',
      assignedAt: DateTime(2026),
      progressReports: const [],
    );

WorkshopJobSummary _summary(String id, String product) => WorkshopJobSummary(
      id: id,
      code: 'HF-TAL-$id',
      status: WorkshopJobStatus.inProgress,
      orderCode: 'HF-PED-001',
      productName: product,
      quantity: 1,
      assignedAt: DateTime(2026),
    );

class _DelayedListRepository implements WorkshopJobsRepository {
  final stalePage = Completer<WorkshopJobsPage>();

  @override
  Future<WorkshopJobsPage> list({
    int page = 1,
    int limit = 12,
    String? query,
    WorkshopJobStatus? status,
    CancelToken? cancelToken,
  }) {
    if (query == 'nuevo') {
      return Future.value(
        WorkshopJobsPage(
          items: [_summary('new', 'Resultado nuevo')],
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
        ),
      );
    }
    if (page == 2) return stalePage.future;
    return Future.value(
      WorkshopJobsPage(
        items: [_summary('old', 'Resultado inicial')],
        page: 1,
        limit: 12,
        total: 2,
        totalPages: 2,
      ),
    );
  }

  @override
  Future<WorkshopJobDetail> detail(String id, {CancelToken? cancelToken}) =>
      Future.error(const InvalidResponseException());

  @override
  Future<ProgressReport> submit(
    String jobId,
    SubmitProgressCommand command, {
    CancelToken? cancelToken,
  }) =>
      Future.error(const InvalidResponseException());
}

class _ControlledDetailRepository implements WorkshopJobsRepository {
  final detailCompleter = Completer<WorkshopJobDetail>();
  CancelToken? detailCancel;

  @override
  Future<WorkshopJobDetail> detail(String id, {CancelToken? cancelToken}) {
    detailCancel = cancelToken;
    return detailCompleter.future;
  }

  @override
  Future<WorkshopJobsPage> list({
    int page = 1,
    int limit = 12,
    String? query,
    WorkshopJobStatus? status,
    CancelToken? cancelToken,
  }) =>
      Future.error(const InvalidResponseException());

  @override
  Future<ProgressReport> submit(
    String jobId,
    SubmitProgressCommand command, {
    CancelToken? cancelToken,
  }) =>
      Future.error(const InvalidResponseException());
}

class _ControlledSubmitRepository implements WorkshopJobsRepository {
  final submitCompleter = Completer<ProgressReport>();
  CancelToken? submitCancel;
  int submitCalls = 0;

  @override
  Future<WorkshopJobDetail> detail(String id,
          {CancelToken? cancelToken}) async =>
      _job(WorkshopJobStatus.inProgress);

  @override
  Future<ProgressReport> submit(
    String jobId,
    SubmitProgressCommand command, {
    CancelToken? cancelToken,
  }) {
    submitCalls++;
    submitCancel = cancelToken;
    return submitCompleter.future;
  }

  @override
  Future<WorkshopJobsPage> list({
    int page = 1,
    int limit = 12,
    String? query,
    WorkshopJobStatus? status,
    CancelToken? cancelToken,
  }) =>
      Future.error(const InvalidResponseException());
}
