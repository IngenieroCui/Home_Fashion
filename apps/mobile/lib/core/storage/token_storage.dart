import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/domain/auth_tokens.dart';
import '../errors/app_exception.dart';

class TokenSnapshot {
  const TokenSnapshot({required this.tokens, required this.epoch});

  final AuthTokens? tokens;
  final int epoch;
}

abstract interface class TokenStorage {
  int get epoch;
  Future<AuthTokens?> read();
  Future<TokenSnapshot> readSnapshot();
  Future<void> write(AuthTokens tokens);
  Future<bool> writeIfCurrent(AuthTokens tokens, int expectedEpoch);
  Future<void> clear();
  Future<bool> clearIfCurrent(int expectedEpoch);
}

class SecureTokenStorage implements TokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _accessTokenKey = 'home_fashion_access_token';
  static const _refreshTokenKey = 'home_fashion_refresh_token';

  final FlutterSecureStorage _storage;
  int _epoch = 0;
  Future<void> _operations = Future.value();

  @override
  int get epoch => _epoch;

  @override
  Future<AuthTokens?> read() async => (await readSnapshot()).tokens;

  @override
  Future<TokenSnapshot> readSnapshot() => _exclusive(() async {
        try {
          final values = await _storage.readAll();
          final accessToken = values[_accessTokenKey];
          final refreshToken = values[_refreshTokenKey];
          if (accessToken == null || refreshToken == null) {
            if (accessToken != null || refreshToken != null) {
              await _deleteTokens();
            }
            return TokenSnapshot(tokens: null, epoch: _epoch);
          }
          return TokenSnapshot(
            tokens: AuthTokens(
              accessToken: accessToken,
              refreshToken: refreshToken,
            ),
            epoch: _epoch,
          );
        } catch (_) {
          throw const StorageAccessException();
        }
      });

  @override
  Future<void> write(AuthTokens tokens) {
    final nextEpoch = ++_epoch;
    return _exclusive(() async {
      if (_epoch != nextEpoch) return;
      await _writeTokens(tokens);
    });
  }

  @override
  Future<bool> writeIfCurrent(AuthTokens tokens, int expectedEpoch) {
    return _exclusive(() async {
      if (_epoch != expectedEpoch) return false;
      await _writeTokens(tokens);
      return true;
    });
  }

  @override
  Future<void> clear() {
    final nextEpoch = ++_epoch;
    return _exclusive(() async {
      if (_epoch != nextEpoch) return;
      await _deleteTokens();
    });
  }

  @override
  Future<bool> clearIfCurrent(int expectedEpoch) {
    if (_epoch != expectedEpoch) return Future.value(false);
    final nextEpoch = ++_epoch;
    return _exclusive(() async {
      if (_epoch != nextEpoch) return false;
      await _deleteTokens();
      return true;
    });
  }

  Future<void> _writeTokens(AuthTokens tokens) async {
    try {
      await _storage.write(key: _refreshTokenKey, value: tokens.refreshToken);
      await _storage.write(key: _accessTokenKey, value: tokens.accessToken);
    } catch (_) {
      throw const StorageAccessException();
    }
  }

  Future<void> _deleteTokens() async {
    try {
      await Future.wait([
        _storage.delete(key: _accessTokenKey),
        _storage.delete(key: _refreshTokenKey),
      ]);
    } catch (_) {
      throw const StorageAccessException();
    }
  }

  Future<T> _exclusive<T>(Future<T> Function() action) {
    final completer = Completer<T>();
    _operations = _operations.then((_) async {
      try {
        completer.complete(await action());
      } catch (error, stackTrace) {
        completer.completeError(error, stackTrace);
      }
    });
    return completer.future;
  }
}
