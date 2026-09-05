import 'package:dio/dio.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/errors/dio_error_mapper.dart';
import '../domain/workshop_job.dart';

abstract interface class WorkshopJobsRepository {
  Future<WorkshopJobsPage> list({
    int page = 1,
    int limit = 12,
    String? query,
    WorkshopJobStatus? status,
    CancelToken? cancelToken,
  });

  Future<WorkshopJobDetail> detail(String id, {CancelToken? cancelToken});

  Future<ProgressReport> submit(
    String jobId,
    SubmitProgressCommand command, {
    CancelToken? cancelToken,
  });
}

class RemoteWorkshopJobsRepository implements WorkshopJobsRepository {
  RemoteWorkshopJobsRepository({required Dio api}) : _api = api;

  final Dio _api;

  @override
  Future<WorkshopJobsPage> list({
    int page = 1,
    int limit = 12,
    String? query,
    WorkshopJobStatus? status,
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/workshop/jobs',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
          if (status != null) 'status': status.apiValue,
        },
        cancelToken: cancelToken,
      );
      return WorkshopJobsPage.fromJson(_payload(response));
    } on DioException catch (error) {
      throw _mapWorkshopError(error);
    } on FormatException {
      throw const InvalidResponseException();
    }
  }

  @override
  Future<WorkshopJobDetail> detail(
    String id, {
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/workshop/jobs/$id',
        cancelToken: cancelToken,
      );
      return WorkshopJobDetail.fromJson(_payload(response));
    } on DioException catch (error) {
      throw _mapWorkshopError(error);
    } on FormatException {
      throw const InvalidResponseException();
    }
  }

  @override
  Future<ProgressReport> submit(
    String jobId,
    SubmitProgressCommand command, {
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        '/workshop/jobs/$jobId/progress',
        data: command.toJson(),
        cancelToken: cancelToken,
      );
      return ProgressReport.fromJson(_payload(response));
    } on DioException catch (error) {
      throw _mapWorkshopError(error);
    } on FormatException {
      throw const InvalidResponseException();
    }
  }

  Map<String, dynamic> _payload(Response<Map<String, dynamic>> response) {
    return response.data ?? (throw const FormatException('Missing payload'));
  }

  AppException _mapWorkshopError(DioException error) {
    return switch (error.response?.statusCode) {
      401 => const SessionExpiredException(),
      404 => const WorkshopJobNotFoundException(),
      400 => WorkshopValidationException(_validationMessage(error)),
      409 => InvalidWorkshopStateException(_stateMessage(error)),
      _ => mapDioException(error),
    };
  }

  String _validationMessage(DioException error) {
    final message = _rawServerMessage(error);
    if (message.contains('evidenceUrls')) {
      return 'Las evidencias deben ser hasta cinco URLs válidas.';
    }
    if (message.contains('progressPercent')) {
      return 'El porcentaje de avance debe ser un número válido entre 1 y 99.';
    }
    if (message.contains('message')) {
      return 'Escribe un mensaje válido para el reporte.';
    }
    return 'Revisa el mensaje, el porcentaje y las URLs antes de enviar.';
  }

  String _stateMessage(DioException error) {
    final message = _rawServerMessage(error);
    if (message.contains('no longer available')) {
      return 'Este trabajo ya no acepta nuevos reportes.';
    }
    if (message.contains('incompatible') || message.contains('state')) {
      return 'La acción no es compatible con el estado actual del trabajo. Actualiza la información.';
    }
    return 'El trabajo cambió de estado. Actualiza la información e inténtalo de nuevo.';
  }

  String _rawServerMessage(DioException error) {
    final data = error.response?.data;
    final value = data is Map ? data['message'] : null;
    if (value is List) {
      return value.whereType<String>().map((item) => item.trim()).join(' ');
    }
    return value is String && value.trim().isNotEmpty
        ? value
        : 'El trabajo cambió de estado. Actualiza la información e inténtalo de nuevo.';
  }
}
