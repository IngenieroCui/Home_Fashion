import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/network/session_events.dart';
import '../data/auth_repository.dart';
import '../domain/workshop_user.dart';

enum SessionStatus {
  initial,
  restoring,
  unauthenticated,
  authenticating,
  authenticated,
  signingOut,
  failure,
}

class SessionState {
  const SessionState({
    this.status = SessionStatus.initial,
    this.user,
    this.message,
  });

  final SessionStatus status;
  final WorkshopUser? user;
  final String? message;

  bool get isAuthenticated =>
      status == SessionStatus.authenticated && user != null;
}

class SessionCubit extends Cubit<SessionState> {
  SessionCubit({
    required AuthRepository repository,
    required SessionEvents events,
  })  : _repository = repository,
        _events = events,
        super(const SessionState()) {
    _expirationSubscription = _events.expired.listen((_) {
      if (!isClosed) {
        _operation++;
        emit(
          const SessionState(
            status: SessionStatus.unauthenticated,
            message: 'Tu sesión finalizó. Ingresa nuevamente.',
          ),
        );
      }
    });
  }

  final AuthRepository _repository;
  final SessionEvents _events;
  late final StreamSubscription<void> _expirationSubscription;
  int _operation = 0;

  Future<void> restore() async {
    if (isClosed) return;
    final operation = ++_operation;
    emit(const SessionState(status: SessionStatus.restoring));
    try {
      final user = await _repository.restoreSession();
      if (isClosed || operation != _operation) return;
      emit(
        user == null
            ? const SessionState(status: SessionStatus.unauthenticated)
            : SessionState(status: SessionStatus.authenticated, user: user),
      );
    } catch (error) {
      if (isClosed || operation != _operation) return;
      emit(
        SessionState(
          status: SessionStatus.failure,
          message: _message(error),
        ),
      );
    }
  }

  Future<void> login({required String email, required String password}) async {
    if (isClosed) return;
    final operation = ++_operation;
    emit(const SessionState(status: SessionStatus.authenticating));
    try {
      final user = await _repository.login(email: email, password: password);
      if (isClosed || operation != _operation) return;
      emit(SessionState(status: SessionStatus.authenticated, user: user));
    } catch (error) {
      if (isClosed || operation != _operation) return;
      emit(
        SessionState(
          status: SessionStatus.unauthenticated,
          message: _message(error),
        ),
      );
    }
  }

  Future<void> logout() async {
    if (isClosed) return;
    final operation = ++_operation;
    emit(SessionState(status: SessionStatus.signingOut, user: state.user));
    try {
      await _repository.logout();
      if (isClosed || operation != _operation) return;
      emit(const SessionState(status: SessionStatus.unauthenticated));
    } catch (error) {
      if (isClosed || operation != _operation) return;
      emit(
        SessionState(
          status: SessionStatus.unauthenticated,
          message: _message(error),
        ),
      );
    }
  }

  String _message(Object error) => error is AppException
      ? error.message
      : 'Ocurrió un problema inesperado. Inténtalo nuevamente.';

  @override
  Future<void> close() async {
    await _expirationSubscription.cancel();
    return super.close();
  }
}
