import 'package:dio/dio.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/errors/dio_error_mapper.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/auth_tokens.dart';
import '../domain/workshop_user.dart';

abstract interface class AuthRepository {
  Future<WorkshopUser?> restoreSession();
  Future<WorkshopUser> login({required String email, required String password});
  Future<void> logout();
}

class RemoteAuthRepository implements AuthRepository {
  RemoteAuthRepository({
    required Dio api,
    required Dio authApi,
    required TokenStorage tokenStorage,
  })  : _api = api,
        _authApi = authApi,
        _tokenStorage = tokenStorage;

  final Dio _api;
  final Dio _authApi;
  final TokenStorage _tokenStorage;

  @override
  Future<WorkshopUser?> restoreSession() async {
    final snapshot = await _tokenStorage.readSnapshot();
    if (snapshot.tokens == null) return null;
    try {
      final response = await _api.get<Map<String, dynamic>>('/auth/me');
      final data = response.data;
      if (data == null) throw const InvalidResponseException();
      final user = WorkshopUser.fromJson(data);
      if (!user.isWorkshop) {
        await logout();
        throw const WorkshopRoleRequiredException();
      }
      if (_tokenStorage.epoch != snapshot.epoch) {
        throw const SessionChangedException();
      }
      return user;
    } on DioException catch (error) {
      final mapped = mapDioException(error);
      if (mapped.statusCode == 401) {
        await _tokenStorage.clearIfCurrent(snapshot.epoch);
        return null;
      }
      throw mapped;
    }
  }

  @override
  Future<WorkshopUser> login({
    required String email,
    required String password,
  }) async {
    await _tokenStorage.clear();
    final loginEpoch = _tokenStorage.epoch;
    try {
      final response = await _authApi.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email.trim(), 'password': password},
      );
      final data = response.data;
      final userData = data?['user'];
      if (data == null || userData is! Map<String, dynamic>) {
        throw const InvalidResponseException();
      }
      final user = WorkshopUser.fromJson(userData);
      final tokens = AuthTokens.fromJson(data);
      if (!user.isWorkshop) {
        await _revoke(tokens.refreshToken);
        throw const WorkshopRoleRequiredException();
      }
      final stored = await _tokenStorage.writeIfCurrent(tokens, loginEpoch);
      if (!stored) {
        await _revoke(tokens.refreshToken);
        throw const SessionChangedException();
      }
      return user;
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  @override
  Future<void> logout() async {
    final snapshot = await _tokenStorage.readSnapshot();
    await _tokenStorage.clearIfCurrent(snapshot.epoch);
    final tokens = snapshot.tokens;
    if (tokens != null) await _revoke(tokens.refreshToken);
  }

  Future<void> _revoke(String refreshToken) async {
    try {
      await _authApi.post<void>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } on DioException {
      // El cierre local es definitivo aunque el servidor no esté disponible.
    }
  }
}
