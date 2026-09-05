import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/features/auth/data/auth_repository.dart';
import 'package:home_fashion_workshop/features/auth/domain/auth_tokens.dart';

import 'helpers/fakes.dart';
import 'helpers/recording_adapter.dart';

void main() {
  const baseUrl = 'https://api.example.com/api';

  test('login usa el contrato real y persiste sólo los tokens', () async {
    final storage = MemoryTokenStorage();
    final authAdapter = RecordingAdapter((options) async {
      expect(options.path, '/auth/login');
      expect(options.data, {
        'email': 'taller@example.com',
        'password': 'password123',
      });
      return jsonResponse(200, {
        'user': {
          'id': '8',
          'fullName': 'Taller Uno',
          'email': 'taller@example.com',
          'role': 'WORKSHOP',
        },
        'accessToken': 'access-1',
        'refreshToken': 'refresh-1',
      });
    });
    final authDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = authAdapter;
    final repository = RemoteAuthRepository(
      api: Dio(BaseOptions(baseUrl: baseUrl)),
      authApi: authDio,
      tokenStorage: storage,
    );

    final user = await repository.login(
      email: ' taller@example.com ',
      password: 'password123',
    );

    expect(user.isWorkshop, isTrue);
    expect(
      storage.tokens,
      isA<AuthTokens>()
          .having((value) => value.accessToken, 'accessToken', 'access-1')
          .having((value) => value.refreshToken, 'refreshToken', 'refresh-1'),
    );
  });

  test('login 401 se transforma en credenciales inválidas', () async {
    final storage = MemoryTokenStorage();
    final authDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter(
        (_) async => jsonResponse(401, {'message': 'Invalid credentials'}),
      );
    final repository = RemoteAuthRepository(
      api: Dio(BaseOptions(baseUrl: baseUrl)),
      authApi: authDio,
      tokenStorage: storage,
    );

    await expectLater(
      repository.login(email: workshopUser.email, password: 'incorrecta'),
      throwsA(isA<InvalidCredentialsException>()),
    );
    expect(storage.tokens, isNull);
  });

  test('rechaza roles distintos de WORKSHOP y revoca su refresh token',
      () async {
    final storage = MemoryTokenStorage();
    final authAdapter = RecordingAdapter((options) async {
      if (options.path == '/auth/logout') return jsonResponse(201, null);
      return jsonResponse(200, {
        'user': {
          'id': '1',
          'fullName': 'Administradora',
          'email': 'admin@example.com',
          'role': 'ADMIN',
        },
        'accessToken': 'admin-access',
        'refreshToken': 'admin-refresh',
      });
    });
    final authDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = authAdapter;
    final repository = RemoteAuthRepository(
      api: Dio(BaseOptions(baseUrl: baseUrl)),
      authApi: authDio,
      tokenStorage: storage,
    );

    await expectLater(
      repository.login(email: 'admin@example.com', password: 'password123'),
      throwsA(isA<WorkshopRoleRequiredException>()),
    );
    expect(
      authAdapter.requests.map((request) => request.path),
      ['/auth/login', '/auth/logout'],
    );
    expect(storage.tokens, isNull);
  });

  test('logout remoto siempre termina limpiando tokens locales', () async {
    final storage = MemoryTokenStorage(
      const AuthTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
    );
    final authDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter(
        (_) async => jsonResponse(503, {'message': 'Unavailable'}),
      );
    final repository = RemoteAuthRepository(
      api: Dio(BaseOptions(baseUrl: baseUrl)),
      authApi: authDio,
      tokenStorage: storage,
    );

    await repository.logout();

    expect(storage.tokens, isNull);
  });
}
