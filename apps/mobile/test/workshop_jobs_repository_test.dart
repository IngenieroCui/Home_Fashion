import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/data/workshop_jobs_repository.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/domain/workshop_job.dart';

import 'helpers/recording_adapter.dart';

void main() {
  const baseUrl = 'https://api.example.com/api';

  Dio api(RequestHandler handler) => Dio(BaseOptions(baseUrl: baseUrl))
    ..httpClientAdapter = RecordingAdapter(handler);

  test('lista usa paginación, q y status del contrato real', () async {
    late RequestOptions request;
    final repository = RemoteWorkshopJobsRepository(
      api: api((options) async {
        request = options;
        return jsonResponse(200, {
          'data': [_summaryJson],
          'summary': {
            'assigned': 7,
            'inProgress': 12,
            'readyForReview': 3,
            'completed': 20
          },
          'pagination': {
            'page': 2,
            'limit': 12,
            'total': 13,
            'totalPages': 2,
          },
        });
      }),
    );

    final result = await repository.list(
      page: 2,
      query: ' sofá ',
      status: WorkshopJobStatus.inProgress,
    );

    expect(request.path, '/workshop/jobs');
    expect(request.queryParameters, {
      'page': 2,
      'limit': 12,
      'q': 'sofá',
      'status': 'IN_PROGRESS',
    });
    expect(result.items.single.productName, 'Sofá Verona');
    expect(result.totalPages, 2);
    expect(result.summary.assigned, 7);
    expect(result.summary.inProgress, 12);
    expect(result.summary.readyForReview, 3);
  });

  test('detalle interpreta snapshots, personalización e historial', () async {
    final repository = RemoteWorkshopJobsRepository(
      api: api((options) async {
        expect(options.path, '/workshop/jobs/job-1');
        return jsonResponse(200, _detailJson);
      }),
    );

    final result = await repository.detail('job-1');

    expect(result.orderCode, 'HF-PED-001');
    expect(result.customization, {'color': 'Azul'});
    expect(result.progressReports, hasLength(1));
    expect(
      result.progressReports.single.reviewStatus,
      ProgressReviewStatus.rejected,
    );
    expect(result.progressReports.single.reviewComment, 'Corrige el acabado');
  });

  test('submit envía tipos exactos y omite porcentajes que controla backend',
      () async {
    final directory = await Directory.systemTemp.createTemp('hf-progress-test');
    addTearDown(() => directory.delete(recursive: true));
    final photo = await File('${directory.path}/photo.jpg')
        .writeAsBytes([255, 216, 255, 217]);
    final requests = <RequestOptions>[];
    final repository = RemoteWorkshopJobsRepository(
      api: api((options) async {
        requests.add(options);
        final fields = Map.fromEntries((options.data as FormData).fields);
        return jsonResponse(201, _reportJson(type: fields['type']));
      }),
    );

    await repository.submit(
      'job-1',
      const SubmitProgressCommand(
        type: ProgressReportType.started,
        message: ' Inicié ',
      ),
    );
    await repository.submit(
      'job-1',
      SubmitProgressCommand(
        type: ProgressReportType.progress,
        message: 'Avance',
        progressPercent: 45,
        imagePaths: [photo.path],
      ),
    );
    await repository.submit(
      'job-1',
      const SubmitProgressCommand(
        type: ProgressReportType.readyForReview,
        message: 'Terminado',
      ),
    );
    await repository.submit(
      'job-1',
      const SubmitProgressCommand(
        type: ProgressReportType.progress,
        message: 'Avance sin porcentaje',
      ),
    );

    Map<String, String> fields(int index) =>
        Map.fromEntries((requests[index].data as FormData).fields);
    expect(fields(0), {'type': 'STARTED', 'message': 'Inicié'});
    expect(fields(1),
        {'type': 'PROGRESS', 'message': 'Avance', 'progressPercent': '45'});
    expect(fields(2), {'type': 'READY_FOR_REVIEW', 'message': 'Terminado'});
    expect(fields(3), {'type': 'PROGRESS', 'message': 'Avance sin porcentaje'});
    expect((requests[1].data as FormData).files.single.key, 'files');
    expect((requests[1].data as FormData).files.single.value.filename,
        'photo.jpg');
    expect((requests[0].data as FormData).files, isEmpty);
    expect(
        requests.every(
            (request) => request.path == '/workshop/jobs/job-1/progress-media'),
        isTrue);
  });

  test(
      'detalle admite IDs numéricos reales de MySQL sin confundirlos con textos',
      () async {
    final repository = RemoteWorkshopJobsRepository(
        api: api((_) async => jsonResponse(200, {
              ..._detailJson,
              'id': 10,
              'order': {'id': 20, 'code': 'HF-PED-001'},
              'progressReports': [
                {..._reportJson(type: 'PROGRESS'), 'id': 30}
              ],
            })));
    final result = await repository.detail('10');
    expect(result.id, '10');
    expect(result.orderId, '20');
    expect(result.progressReports.single.id, '30');
  });

  test('401, 404, validación y conflicto producen errores separados', () async {
    WorkshopJobsRepository repositoryFor(int status) =>
        RemoteWorkshopJobsRepository(
          api: api(
            (_) async => jsonResponse(status, {'message': 'State changed'}),
          ),
        );

    await expectLater(
      repositoryFor(401).detail('job-1'),
      throwsA(isA<SessionExpiredException>()),
    );
    await expectLater(
      repositoryFor(404).detail('job-1'),
      throwsA(isA<WorkshopJobNotFoundException>()),
    );
    await expectLater(
      repositoryFor(400).detail('job-1'),
      throwsA(isA<WorkshopValidationException>()),
    );
    await expectLater(
      repositoryFor(409).detail('job-1'),
      throwsA(isA<InvalidWorkshopStateException>()),
    );
  });

  test('arrays malformados del servidor se rechazan de forma segura', () async {
    final malformed = Map<String, dynamic>.from(_detailJson);
    malformed['progressReports'] = [
      {
        ..._reportJson(type: 'PROGRESS'),
        'evidenceUrls': ['https://example.com/ok.jpg', 42],
      },
    ];
    final repository = RemoteWorkshopJobsRepository(
      api: api((_) async => jsonResponse(200, malformed)),
    );

    await expectLater(
      repository.detail('job-1'),
      throwsA(isA<InvalidResponseException>()),
    );
  });
}

final _summaryJson = {
  'id': 'job-1',
  'code': 'HF-TAL-001',
  'status': 'IN_PROGRESS',
  'instructions': 'Usar espuma firme',
  'expectedCompletionDate': '2026-08-20',
  'assignedAt': '2026-08-01T10:00:00.000Z',
  'order': {'id': 'order-1', 'code': 'HF-PED-001'},
  'productNameSnapshot': 'Sofá Verona',
  'variantNameSnapshot': 'Tres puestos',
  'quantity': 1,
  'latestReport': null,
};

final _detailJson = {
  ..._summaryJson,
  'skuSnapshot': 'SOF-VER-3',
  'customization': {'color': 'Azul'},
  'orderItemStatus': 'IN_PRODUCTION',
  'notes': 'Subir por escaleras',
  'progressReports': [
    {
      ..._reportJson(type: 'PROGRESS'),
      'reviewStatus': 'REJECTED',
      'reviewComment': 'Corrige el acabado',
    },
  ],
};

Map<String, dynamic> _reportJson({required Object? type}) => {
      'id': 'report-1',
      'type': type,
      'message': 'Avance registrado',
      'progressPercent': type == 'READY_FOR_REVIEW' ? 100 : 45,
      'evidenceUrls': <String>[],
      'reviewStatus': 'PENDING_REVIEW',
      'submittedAt': '2026-08-02T10:00:00.000Z',
      'reviewedAt': null,
      'reviewComment': null,
    };
