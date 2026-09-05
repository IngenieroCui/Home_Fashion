import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/config/app_config.dart';

void main() {
  test('debug admite el host HTTP del emulador Android', () {
    final config = AppConfig(apiBaseUrl: 'http://10.0.2.2:3001/api');

    expect(config.apiBaseUrl, 'http://10.0.2.2:3001/api');
  });

  test('configuración release rechaza HTTP y acepta HTTPS', () {
    expect(
      () => AppConfig(
        apiBaseUrl: 'http://api.example.com/api',
        requireHttps: true,
      ),
      throwsArgumentError,
    );
    expect(
      AppConfig(
        apiBaseUrl: 'https://api.example.com/api/',
        requireHttps: true,
      ).apiBaseUrl,
      'https://api.example.com/api',
    );
  });
}
