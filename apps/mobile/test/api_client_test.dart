import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/network/api_client.dart';
import 'package:home_fashion_workshop/core/network/session_events.dart';
import 'package:home_fashion_workshop/features/auth/data/auth_repository.dart';
import 'package:home_fashion_workshop/features/auth/domain/auth_tokens.dart';

import 'helpers/fakes.dart';
import 'helpers/recording_adapter.dart';

void main() {
  const baseUrl = 'https://api.example.com/api';

  test('401 concurrentes comparten una única renovación y se reintentan',
      () async {
    final storage = MemoryTokenStorage(
      const AuthTokens(accessToken: 'old-access', refreshToken: 'old-refresh'),
    );
    final events = SessionEvents();
    var refreshCalls = 0;
    final apiDio = Dio(BaseOptions(baseUrl: baseUrl));
    apiDio.httpClientAdapter = RecordingAdapter((options) async {
      final authorization = options.headers['Authorization'];
      if (authorization == 'Bearer old-access') {
        return jsonResponse(401, {'message': 'Unauthorized'});
      }
      expect(authorization, 'Bearer new-access');
      return jsonResponse(200, {'ok': true});
    });
    final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
    refreshDio.httpClientAdapter = RecordingAdapter((options) async {
      refreshCalls++;
      expect(options.path, '/auth/refresh');
      expect(options.data, {'refreshToken': 'old-refresh'});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      return jsonResponse(200, {
        'user': {
          'id': '8',
          'fullName': 'Taller Uno',
          'email': 'taller@example.com',
          'role': 'WORKSHOP',
        },
        'accessToken': 'new-access',
        'refreshToken': 'new-refresh',
      });
    });
    final client = ApiClient(
      baseUrl: baseUrl,
      tokenStorage: storage,
      sessionEvents: events,
      dio: apiDio,
      refreshDio: refreshDio,
    );

    final responses = await Future.wait([
      client.dio.get<Map<String, dynamic>>('/protected/one'),
      client.dio.get<Map<String, dynamic>>('/protected/two'),
    ]);

    expect(responses.every((response) => response.data?['ok'] == true), isTrue);
    expect(refreshCalls, 1);
    expect(storage.tokens?.accessToken, 'new-access');
    await events.close();
  });

  test('un segundo 401 no renueva otra vez, limpia y expira la sesión',
      () async {
    final storage = MemoryTokenStorage(
      const AuthTokens(accessToken: 'old-access', refreshToken: 'old-refresh'),
    );
    final events = SessionEvents();
    final expired = Completer<void>();
    final subscription = events.expired.listen((_) {
      if (!expired.isCompleted) expired.complete();
    });
    var apiCalls = 0;
    var refreshCalls = 0;
    final apiDio = Dio(BaseOptions(baseUrl: baseUrl));
    apiDio.httpClientAdapter = RecordingAdapter((_) async {
      apiCalls++;
      return jsonResponse(401, {'message': 'Unauthorized'});
    });
    final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
    refreshDio.httpClientAdapter = RecordingAdapter((_) async {
      refreshCalls++;
      return jsonResponse(200, {
        'user': {
          'id': '8',
          'fullName': 'Taller Uno',
          'email': 'taller@example.com',
          'role': 'WORKSHOP',
        },
        'accessToken': 'new-access',
        'refreshToken': 'new-refresh',
      });
    });
    final client = ApiClient(
      baseUrl: baseUrl,
      tokenStorage: storage,
      sessionEvents: events,
      dio: apiDio,
      refreshDio: refreshDio,
    );

    await expectLater(
      client.dio.get<Map<String, dynamic>>('/protected'),
      throwsA(isA<DioException>()),
    );
    await expired.future;

    expect(apiCalls, 2);
    expect(refreshCalls, 1);
    expect(storage.tokens, isNull);
    await subscription.cancel();
    await events.close();
  });

  test('refresh anterior no revive tokens después de logout', () async {
    final storage = MemoryTokenStorage(
      const AuthTokens(accessToken: 'old-access', refreshToken: 'old-refresh'),
    );
    final events = SessionEvents();
    var expirations = 0;
    final subscription = events.expired.listen((_) => expirations++);
    final refreshStarted = Completer<void>();
    final finishRefresh = Completer<void>();
    final apiDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter(
        (_) async => jsonResponse(401, {'message': 'Unauthorized'}),
      );
    final refreshDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter((_) async {
        refreshStarted.complete();
        await finishRefresh.future;
        return jsonResponse(200, _tokensPayload('stale'));
      });
    final client = ApiClient(
      baseUrl: baseUrl,
      tokenStorage: storage,
      sessionEvents: events,
      dio: apiDio,
      refreshDio: refreshDio,
    );
    final authDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter(
        (_) async => jsonResponse(201, null),
      );
    final repository = RemoteAuthRepository(
      api: client.dio,
      authApi: authDio,
      tokenStorage: storage,
    );

    final request = client.dio.get<Map<String, dynamic>>('/protected');
    await refreshStarted.future;
    await repository.logout();
    finishRefresh.complete();
    await expectLater(request, throwsA(isA<DioException>()));

    expect(storage.tokens, isNull);
    expect(expirations, 0);
    await subscription.cancel();
    await events.close();
  });

  test('refresh anterior no sobrescribe tokens de un login nuevo', () async {
    final storage = MemoryTokenStorage(
      const AuthTokens(accessToken: 'old-access', refreshToken: 'old-refresh'),
    );
    final events = SessionEvents();
    final refreshStarted = Completer<void>();
    final finishRefresh = Completer<void>();
    final apiDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter(
        (_) async => jsonResponse(401, {'message': 'Unauthorized'}),
      );
    final refreshDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter((_) async {
        refreshStarted.complete();
        await finishRefresh.future;
        return jsonResponse(200, _tokensPayload('stale'));
      });
    final client = ApiClient(
      baseUrl: baseUrl,
      tokenStorage: storage,
      sessionEvents: events,
      dio: apiDio,
      refreshDio: refreshDio,
    );
    final authDio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = RecordingAdapter(
        (_) async => jsonResponse(200, _tokensPayload('new-login')),
      );
    final repository = RemoteAuthRepository(
      api: client.dio,
      authApi: authDio,
      tokenStorage: storage,
    );

    final request = client.dio.get<Map<String, dynamic>>('/protected');
    await refreshStarted.future;
    await repository.login(
        email: 'taller@example.com', password: 'password123');
    finishRefresh.complete();
    await expectLater(request, throwsA(isA<DioException>()));

    expect(storage.tokens?.accessToken, 'new-login-access');
    expect(storage.tokens?.refreshToken, 'new-login-refresh');
    await events.close();
  });
}

Map<String, dynamic> _tokensPayload(String prefix) => {
      'user': {
        'id': '8',
        'fullName': 'Taller Uno',
        'email': 'taller@example.com',
        'role': 'WORKSHOP',
      },
      'accessToken': '$prefix-access',
      'refreshToken': '$prefix-refresh',
    };
