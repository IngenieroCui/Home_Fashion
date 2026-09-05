import 'package:dio/dio.dart';

import 'app_exception.dart';

AppException mapDioException(DioException error) {
  if (error.error case final AppException appException) return appException;
  if (error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.sendTimeout) {
    return const NetworkException();
  }

  final statusCode = error.response?.statusCode;
  if (statusCode == 401) return const InvalidCredentialsException();
  if (statusCode == 403) {
    return const ApiException(
      'No tienes permiso para realizar esta operación.',
      statusCode: 403,
    );
  }

  // API validation and internal errors may be in English or include private details.
  final message = switch (statusCode ?? 0) {
    400 || 422 => 'Revisa los campos obligatorios y el formato de los datos.',
    404 => 'No encontramos la información. Puede que ya no esté disponible.',
    409 => 'La información cambió. Actualiza e inténtalo nuevamente.',
    413 =>
      'La información supera el tamaño permitido. Reduce el texto e inténtalo nuevamente.',
    429 => 'Espera un momento antes de volver a intentarlo.',
    >= 500 =>
      'Home Fashion no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    _ => 'No fue posible completar la operación. Inténtalo nuevamente.',
  };
  return ApiException(message, statusCode: statusCode);
}
