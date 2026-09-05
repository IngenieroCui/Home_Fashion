import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/core/network/session_events.dart';
import 'package:home_fashion_workshop/features/auth/logic/session_cubit.dart';

import 'helpers/fakes.dart';

void main() {
  late FakeAuthRepository repository;
  late SessionEvents events;
  late SessionCubit cubit;

  setUp(() {
    repository = FakeAuthRepository();
    events = SessionEvents();
    cubit = SessionCubit(repository: repository, events: events);
  });

  tearDown(() async {
    await cubit.close();
    await events.close();
  });

  test('restauración sin sesión termina como no autenticada', () async {
    await cubit.restore();

    expect(cubit.state.status, SessionStatus.unauthenticated);
    expect(cubit.state.user, isNull);
  });

  test('login correcto autentica al taller', () async {
    await cubit.login(email: workshopUser.email, password: 'password123');

    expect(cubit.state.status, SessionStatus.authenticated);
    expect(cubit.state.user, workshopUser);
  });

  test('login fallido conserva un error claro y permite reintentar', () async {
    repository.loginError = const InvalidCredentialsException();

    await cubit.login(email: workshopUser.email, password: 'incorrecta');

    expect(cubit.state.status, SessionStatus.unauthenticated);
    expect(cubit.state.message, contains('contraseña'));
  });

  test('logout elimina la sesión del estado', () async {
    await cubit.login(email: workshopUser.email, password: 'password123');

    await cubit.logout();

    expect(repository.logoutCalls, 1);
    expect(cubit.state.status, SessionStatus.unauthenticated);
    expect(cubit.state.user, isNull);
  });

  test('expiración recibida desde red invalida la sesión', () async {
    await cubit.login(email: workshopUser.email, password: 'password123');

    events.notifyExpired();
    await Future<void>.delayed(Duration.zero);

    expect(cubit.state.status, SessionStatus.unauthenticated);
    expect(cubit.state.message, contains('finalizó'));
  });

  test('fallo inesperado de storage no deja la restauración en splash',
      () async {
    repository.restoreError = StateError('secure storage unavailable');

    await cubit.restore();

    expect(cubit.state.status, SessionStatus.failure);
    expect(cubit.state.message, contains('Inténtalo'));
  });

  test('fallo inesperado de storage no deja login autenticando', () async {
    repository.loginError = StateError('secure storage unavailable');

    await cubit.login(email: workshopUser.email, password: 'password123');

    expect(cubit.state.status, SessionStatus.unauthenticated);
    expect(cubit.state.message, contains('Inténtalo'));
  });

  test('fallo inesperado de storage no deja logout bloqueado', () async {
    await cubit.login(email: workshopUser.email, password: 'password123');
    repository.logoutError = StateError('secure storage unavailable');

    await cubit.logout();

    expect(cubit.state.status, SessionStatus.unauthenticated);
    expect(cubit.state.message, contains('Inténtalo'));
  });
}
