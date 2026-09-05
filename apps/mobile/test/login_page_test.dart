import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/core/network/session_events.dart';
import 'package:home_fashion_workshop/features/auth/logic/session_cubit.dart';
import 'package:home_fashion_workshop/features/auth/presentation/login_page.dart';

import 'helpers/fakes.dart';

void main() {
  testWidgets('restauración fallida ofrece reintento sin perder la sesión',
      (tester) async {
    final repository = FakeAuthRepository()
      ..restoreError = const NetworkException();
    final events = SessionEvents();
    final cubit = SessionCubit(repository: repository, events: events);
    addTearDown(() async {
      await cubit.close();
      await events.close();
    });

    await cubit.restore();
    await tester.pumpWidget(
      BlocProvider<SessionCubit>.value(
        value: cubit,
        child: const MaterialApp(home: LoginPage()),
      ),
    );

    expect(find.text('Reintentar sesión'), findsOneWidget);
    repository
      ..restoreError = null
      ..restoredUser = workshopUser;

    await tester.tap(find.text('Reintentar sesión'));
    await tester.pumpAndSettle();

    expect(cubit.state.status, SessionStatus.authenticated);
    expect(cubit.state.user, workshopUser);
  });
}
