import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../core/widgets/state_views.dart';
import '../features/auth/logic/session_cubit.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/workshop_jobs/data/pending_submission_store.dart';
import '../features/workshop_jobs/data/workshop_jobs_repository.dart';
import '../features/workshop_jobs/presentation/workshop_job_detail_page.dart';
import '../features/workshop_jobs/presentation/workshop_jobs_page.dart';

class AppRouter {
  AppRouter({
    required SessionCubit sessionCubit,
    required WorkshopJobsRepository workshopJobsRepository,
    PendingSubmissionStore? pendingSubmissionStore,
  }) : _refresh = _RouterRefresh(sessionCubit.stream) {
    router = GoRouter(
      initialLocation: '/splash',
      refreshListenable: _refresh,
      redirect: (context, state) => _redirect(sessionCubit, state),
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const LoadingStateView(
            message: 'Recuperando tu sesión...',
          ),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginPage(),
        ),
        GoRoute(
          path: '/home',
          builder: (context, state) => WorkshopJobsPageView(
            repository: workshopJobsRepository,
          ),
        ),
        GoRoute(
          path: '/jobs/:id',
          builder: (context, state) => WorkshopJobDetailPage(
            jobId: state.pathParameters['id']!,
            repository: workshopJobsRepository,
            pendingStore: pendingSubmissionStore,
          ),
        ),
      ],
    );
  }

  late final GoRouter router;
  final _RouterRefresh _refresh;

  static String? _redirect(SessionCubit cubit, GoRouterState state) {
    final status = cubit.state.status;
    final location = state.matchedLocation;
    final isRestoring =
        status == SessionStatus.initial || status == SessionStatus.restoring;
    final isSigningOut = status == SessionStatus.signingOut;

    if (isRestoring || isSigningOut) {
      return location == '/splash' ? null : '/splash';
    }
    if (cubit.state.isAuthenticated) {
      return location == '/login' || location == '/splash' ? '/home' : null;
    }
    return location == '/login' ? null : '/login';
  }

  void dispose() {
    router.dispose();
    _refresh.dispose();
  }
}

class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(Stream<SessionState> states) {
    _subscription = states.listen((_) => notifyListeners());
  }

  late final StreamSubscription<SessionState> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
