sealed class AppException implements Exception {
  const AppException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

final class InvalidCredentialsException extends AppException {
  const InvalidCredentialsException()
      : super('El correo o la contraseña no son correctos.', statusCode: 401);
}

final class WorkshopRoleRequiredException extends AppException {
  const WorkshopRoleRequiredException()
      : super('Esta aplicación es exclusiva para cuentas de taller.',
            statusCode: 403);
}

final class SessionExpiredException extends AppException {
  const SessionExpiredException()
      : super('Tu sesión finalizó. Ingresa nuevamente.', statusCode: 401);
}

final class SessionChangedException extends AppException {
  const SessionChangedException()
      : super(
            'La sesión cambió mientras se completaba la operación. Inténtalo nuevamente.');
}

final class NetworkException extends AppException {
  const NetworkException()
      : super('No fue posible conectar con Home Fashion. Revisa tu conexión.');
}

final class InvalidResponseException extends AppException {
  const InvalidResponseException()
      : super('El servidor envió una respuesta que no se pudo interpretar.');
}

final class StorageAccessException extends AppException {
  const StorageAccessException()
      : super(
          'No pudimos acceder a la sesión segura del dispositivo. Inténtalo de nuevo.',
        );
}

final class ApiException extends AppException {
  const ApiException(super.message, {super.statusCode});
}

final class WorkshopJobNotFoundException extends AppException {
  const WorkshopJobNotFoundException()
      : super(
          'Este trabajo no existe o ya no está asignado a tu taller.',
          statusCode: 404,
        );
}

final class InvalidWorkshopStateException extends AppException {
  const InvalidWorkshopStateException(super.message) : super(statusCode: 409);
}

final class WorkshopValidationException extends AppException {
  const WorkshopValidationException(super.message) : super(statusCode: 400);
}
