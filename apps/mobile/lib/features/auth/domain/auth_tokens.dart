import '../../../core/errors/app_exception.dart';

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    final accessToken = json['accessToken'];
    final refreshToken = json['refreshToken'];
    if (accessToken is! String ||
        accessToken.isEmpty ||
        refreshToken is! String ||
        refreshToken.isEmpty) {
      throw const InvalidResponseException();
    }
    return AuthTokens(accessToken: accessToken, refreshToken: refreshToken);
  }

  final String accessToken;
  final String refreshToken;
}
