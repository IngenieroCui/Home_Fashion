import 'package:dio/dio.dart';

import '../../features/auth/domain/auth_tokens.dart';
import '../../features/auth/domain/workshop_user.dart';
import '../storage/token_storage.dart';
import 'session_events.dart';

const _retriedAfterRefresh = 'retriedAfterRefresh';

class ApiClient {
  ApiClient({
    required String baseUrl,
    required TokenStorage tokenStorage,
    required SessionEvents sessionEvents,
    Dio? dio,
    Dio? refreshDio,
  }) : dio = dio ?? Dio(_options(baseUrl)) {
    final coordinator = TokenRefreshCoordinator(
      authApi: refreshDio ?? Dio(_options(baseUrl)),
      tokenStorage: tokenStorage,
      sessionEvents: sessionEvents,
    );
    this.dio.interceptors.add(
          AuthInterceptor(
            dio: this.dio,
            tokenStorage: tokenStorage,
            refreshCoordinator: coordinator,
          ),
        );
  }

  final Dio dio;

  static BaseOptions _options(String baseUrl) => BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 15),
        headers: const {'Accept': 'application/json'},
      );
}

class TokenRefreshCoordinator {
  TokenRefreshCoordinator({
    required Dio authApi,
    required TokenStorage tokenStorage,
    required SessionEvents sessionEvents,
  })  : _authApi = authApi,
        _tokenStorage = tokenStorage,
        _sessionEvents = sessionEvents;

  final Dio _authApi;
  final TokenStorage _tokenStorage;
  final SessionEvents _sessionEvents;
  Future<RefreshResult?>? _refreshing;
  int? _refreshingEpoch;

  Future<RefreshResult?> refreshAccessToken(
      {required String? failedAccessToken}) async {
    final snapshot = await _tokenStorage.readSnapshot();
    final storedTokens = snapshot.tokens;
    if (storedTokens == null) {
      await _expireSession(snapshot.epoch);
      return null;
    }
    if (failedAccessToken != null &&
        storedTokens.accessToken != failedAccessToken) {
      return RefreshResult(storedTokens.accessToken, snapshot.epoch);
    }

    final current = _refreshing;
    if (current != null && _refreshingEpoch == snapshot.epoch) return current;

    late final Future<RefreshResult?> attempt;
    attempt = _performRefresh(snapshot).whenComplete(() {
      if (identical(_refreshing, attempt)) {
        _refreshing = null;
        _refreshingEpoch = null;
      }
    });
    _refreshing = attempt;
    _refreshingEpoch = snapshot.epoch;
    return attempt;
  }

  Future<RefreshResult?> _performRefresh(TokenSnapshot snapshot) async {
    try {
      final currentTokens = snapshot.tokens;
      if (currentTokens == null) {
        await _expireSession(snapshot.epoch);
        return null;
      }
      final response = await _authApi.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': currentTokens.refreshToken},
      );
      final data = response.data;
      if (data == null) throw const FormatException('Missing refresh payload');
      final userData = data['user'];
      if (userData is! Map<String, dynamic>) {
        throw const FormatException('Missing refresh user');
      }
      final user = WorkshopUser.fromJson(userData);
      if (!user.isWorkshop) throw const FormatException('Invalid mobile role');
      final nextTokens = AuthTokens.fromJson(data);
      final stored = await _tokenStorage.writeIfCurrent(
        nextTokens,
        snapshot.epoch,
      );
      return stored
          ? RefreshResult(nextTokens.accessToken, snapshot.epoch)
          : null;
    } catch (_) {
      await _expireSession(snapshot.epoch);
      return null;
    }
  }

  Future<void> expireSession(int epoch) async {
    await _expireSession(epoch);
  }

  Future<void> _expireSession(int epoch) async {
    try {
      if (await _tokenStorage.clearIfCurrent(epoch)) {
        _sessionEvents.notifyExpired();
      }
    } catch (_) {
      // La solicitud original conserva el error; nunca se borra otra sesión.
    }
  }
}

class RefreshResult {
  const RefreshResult(this.accessToken, this.epoch);
  final String accessToken;
  final int epoch;
}

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required Dio dio,
    required TokenStorage tokenStorage,
    required TokenRefreshCoordinator refreshCoordinator,
  })  : _dio = dio,
        _tokenStorage = tokenStorage,
        _refreshCoordinator = refreshCoordinator;

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final TokenRefreshCoordinator _refreshCoordinator;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      final tokens = await _tokenStorage.read();
      if (tokens != null) {
        options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      }
      handler.next(options);
    } catch (error) {
      handler.reject(
        DioException(
          requestOptions: options,
          error: error,
          type: DioExceptionType.unknown,
        ),
      );
    }
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;
    if (err.response?.statusCode != 401 ||
        request.extra[_retriedAfterRefresh] == true ||
        _isAuthRequest(request.path)) {
      handler.next(err);
      return;
    }

    final failedAccessToken = _bearerToken(request.headers['Authorization']);
    final refresh = await _refreshCoordinator.refreshAccessToken(
      failedAccessToken: failedAccessToken,
    );
    if (refresh == null) {
      handler.next(err);
      return;
    }

    request.extra[_retriedAfterRefresh] = true;
    request.headers['Authorization'] = 'Bearer ${refresh.accessToken}';
    try {
      handler.resolve(await _dio.fetch<dynamic>(request));
    } on DioException catch (retryError) {
      if (retryError.response?.statusCode == 401) {
        await _refreshCoordinator.expireSession(refresh.epoch);
      }
      handler.next(retryError);
    }
  }

  String? _bearerToken(Object? authorization) {
    if (authorization is! String ||
        !authorization.startsWith('Bearer ') ||
        authorization.length <= 7) {
      return null;
    }
    return authorization.substring(7);
  }

  bool _isAuthRequest(String path) =>
      path.endsWith('/auth/login') ||
      path.endsWith('/auth/refresh') ||
      path.endsWith('/auth/logout');
}
