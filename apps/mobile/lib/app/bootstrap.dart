import 'package:dio/dio.dart';

import '../core/config/app_config.dart';
import '../core/network/api_client.dart';
import '../core/network/session_events.dart';
import '../core/storage/token_storage.dart';
import '../features/auth/data/auth_repository.dart';
import '../features/auth/logic/session_cubit.dart';
import '../features/workshop_jobs/data/pending_submission_store.dart';
import '../features/workshop_jobs/data/workshop_jobs_repository.dart';

class AppDependencies {
  AppDependencies({
    required this.sessionCubit,
    required this.authRepository,
    required this.sessionEvents,
    required this.workshopJobsRepository,
    PendingSubmissionStore? pendingSubmissionStore,
  }) : pendingSubmissionStore =
            pendingSubmissionStore ?? MemoryPendingSubmissionStore();

  factory AppDependencies.create() {
    final config = AppConfig.fromEnvironment();
    final storage = SecureTokenStorage();
    final events = SessionEvents();
    final apiClient = ApiClient(
      baseUrl: config.apiBaseUrl,
      tokenStorage: storage,
      sessionEvents: events,
    );
    final repository = RemoteAuthRepository(
      api: apiClient.dio,
      authApi: Dio(
        BaseOptions(
          baseUrl: config.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          sendTimeout: const Duration(seconds: 15),
          headers: const {'Accept': 'application/json'},
        ),
      ),
      tokenStorage: storage,
    );
    final cubit = SessionCubit(repository: repository, events: events);
    return AppDependencies(
      sessionCubit: cubit,
      authRepository: repository,
      sessionEvents: events,
      workshopJobsRepository: RemoteWorkshopJobsRepository(api: apiClient.dio),
      pendingSubmissionStore: SecurePendingSubmissionStore(),
    );
  }

  final PendingSubmissionStore pendingSubmissionStore;
  final SessionCubit sessionCubit;
  final AuthRepository authRepository;
  final SessionEvents sessionEvents;
  final WorkshopJobsRepository workshopJobsRepository;

  Future<void> dispose() async {
    await sessionCubit.close();
    await sessionEvents.close();
  }
}
