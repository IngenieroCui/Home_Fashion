import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig({required String apiBaseUrl, bool requireHttps = false})
      : apiBaseUrl = _normalize(apiBaseUrl, requireHttps: requireHttps);

  factory AppConfig.fromEnvironment() {
    return AppConfig(
      apiBaseUrl: const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://10.0.2.2:3001/api',
      ),
      requireHttps: kReleaseMode,
    );
  }

  final String apiBaseUrl;

  static String _normalize(String value, {required bool requireHttps}) {
    final normalized = value.trim().replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(normalized);
    if (uri == null ||
        !uri.hasScheme ||
        !uri.hasAuthority ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      throw ArgumentError.value(
        value,
        'API_BASE_URL',
        'Debe ser una URL absoluta HTTP o HTTPS.',
      );
    }
    if (requireHttps && uri.scheme != 'https') {
      throw ArgumentError.value(
        value,
        'API_BASE_URL',
        'En release debe usar HTTPS.',
      );
    }
    return normalized;
  }
}
