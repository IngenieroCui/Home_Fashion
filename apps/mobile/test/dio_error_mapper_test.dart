import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/core/errors/dio_error_mapper.dart';

void main() {
  for (final status in [400, 404, 409, 413, 422, 429, 500, 503]) {
    test('El error $status no expone mensajes internos del servidor', () {
      final options = RequestOptions(path: '/workshop/jobs');
      final mapped = mapDioException(DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(
            requestOptions: options,
            statusCode: status,
            data: {'message': 'SequelizeDatabaseError: private details'}),
      ));
      expect(mapped.statusCode, status);
      expect(mapped.message, isNot(contains('Sequelize')));
      expect(mapped.message, isNot(contains('private details')));
      expect(mapped.message, isNotEmpty);
    });
  }
  test('Conserva errores de sesión ya interpretados', () {
    const expired = SessionExpiredException();
    expect(
        mapDioException(
            DioException(requestOptions: RequestOptions(), error: expired)),
        same(expired));
  });
  test('Una espera agotada ofrece recuperar la conexión', () {
    expect(
        mapDioException(DioException(
            requestOptions: RequestOptions(),
            type: DioExceptionType.receiveTimeout)),
        isA<NetworkException>());
  });
}
