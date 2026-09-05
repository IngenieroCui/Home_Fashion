import 'package:dio/dio.dart';
import 'package:home_fashion_workshop/core/errors/app_exception.dart';
import 'package:home_fashion_workshop/core/storage/token_storage.dart';
import 'package:home_fashion_workshop/features/auth/data/auth_repository.dart';
import 'package:home_fashion_workshop/features/auth/domain/auth_tokens.dart';
import 'package:home_fashion_workshop/features/auth/domain/workshop_user.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/data/workshop_jobs_repository.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/domain/workshop_job.dart';

const workshopUser = WorkshopUser(
  id: '8',
  fullName: 'Taller Uno',
  email: 'taller@example.com',
  role: 'WORKSHOP',
  permissions: ['WORKSHOP_JOB_VIEW', 'WORKSHOP_PROGRESS_SUBMIT'],
);

class MemoryTokenStorage implements TokenStorage {
  MemoryTokenStorage([this.tokens]);

  AuthTokens? tokens;
  int _epoch = 0;
  int clearCalls = 0;
  int writeCalls = 0;

  @override
  int get epoch => _epoch;

  @override
  Future<void> clear() async {
    _epoch++;
    clearCalls++;
    tokens = null;
  }

  @override
  Future<bool> clearIfCurrent(int expectedEpoch) async {
    if (_epoch != expectedEpoch) return false;
    await clear();
    return true;
  }

  @override
  Future<AuthTokens?> read() async => tokens;

  @override
  Future<TokenSnapshot> readSnapshot() async =>
      TokenSnapshot(tokens: tokens, epoch: _epoch);

  @override
  Future<void> write(AuthTokens value) async {
    _epoch++;
    writeCalls++;
    tokens = value;
  }

  @override
  Future<bool> writeIfCurrent(AuthTokens value, int expectedEpoch) async {
    if (_epoch != expectedEpoch) return false;
    writeCalls++;
    tokens = value;
    return true;
  }
}

class FakeAuthRepository implements AuthRepository {
  WorkshopUser? restoredUser;
  WorkshopUser loginUser = workshopUser;
  Object? restoreError;
  Object? loginError;
  Object? logoutError;
  int logoutCalls = 0;

  @override
  Future<WorkshopUser> login({
    required String email,
    required String password,
  }) async {
    final error = loginError;
    if (error != null) throw error;
    return loginUser;
  }

  @override
  Future<void> logout() async {
    logoutCalls++;
    final error = logoutError;
    if (error != null) throw error;
  }

  @override
  Future<WorkshopUser?> restoreSession() async {
    final error = restoreError;
    if (error != null) throw error;
    return restoredUser;
  }
}

class FakeWorkshopJobsRepository implements WorkshopJobsRepository {
  WorkshopJobsPage page = const WorkshopJobsPage(
    items: [],
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  );
  WorkshopJobDetail? job;
  AppException? listError;
  AppException? detailError;
  AppException? submitError;
  int listCalls = 0;
  final List<String?> listQueries = [];
  int detailCalls = 0;
  int submitCalls = 0;
  SubmitProgressCommand? submittedCommand;

  @override
  Future<WorkshopJobsPage> list({
    int page = 1,
    int limit = 12,
    String? query,
    WorkshopJobStatus? status,
    CancelToken? cancelToken,
  }) async {
    listCalls++;
    listQueries.add(query);
    if (listError case final error?) throw error;
    return this.page;
  }

  @override
  Future<WorkshopJobDetail> detail(
    String id, {
    CancelToken? cancelToken,
  }) async {
    detailCalls++;
    if (detailError case final error?) throw error;
    return job ?? (throw const InvalidResponseException());
  }

  @override
  Future<ProgressReport> submit(
    String jobId,
    SubmitProgressCommand command, {
    CancelToken? cancelToken,
  }) async {
    submitCalls++;
    submittedCommand = command;
    if (submitError case final error?) throw error;
    return ProgressReport(
      id: 'report-1',
      type: command.type,
      message: command.message,
      progressPercent: command.progressPercent,
      evidenceUrls: command.evidenceUrls,
      reviewStatus: ProgressReviewStatus.pending,
      submittedAt: DateTime(2026),
    );
  }
}
