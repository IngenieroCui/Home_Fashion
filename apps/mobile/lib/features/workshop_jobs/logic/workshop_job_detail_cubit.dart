import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors/app_exception.dart';
import '../data/pending_submission_store.dart';
import '../data/workshop_jobs_repository.dart';
import '../domain/workshop_job.dart';

enum WorkshopJobDetailStatus { initial, loading, success, failure }

class WorkshopJobDetailState {
  const WorkshopJobDetailState({
    this.status = WorkshopJobDetailStatus.initial,
    this.isSubmitting = false,
    this.job,
    this.error,
    this.submitError,
  });

  final WorkshopJobDetailStatus status;
  final bool isSubmitting;
  final WorkshopJobDetail? job;
  final AppException? error;
  final AppException? submitError;

  WorkshopJobDetailState copyWith({
    WorkshopJobDetailStatus? status,
    bool? isSubmitting,
    WorkshopJobDetail? job,
    AppException? error,
    bool clearError = false,
    AppException? submitError,
    bool clearSubmitError = false,
  }) {
    return WorkshopJobDetailState(
      status: status ?? this.status,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      job: job ?? this.job,
      error: clearError ? null : (error ?? this.error),
      submitError: clearSubmitError ? null : (submitError ?? this.submitError),
    );
  }
}

class WorkshopJobDetailCubit extends Cubit<WorkshopJobDetailState> {
  WorkshopJobDetailCubit({
    required WorkshopJobsRepository repository,
    required this.jobId,
    PendingSubmissionStore? pendingStore,
  })  : _repository = repository,
        _pending = pendingStore ?? MemoryPendingSubmissionStore(),
        super(const WorkshopJobDetailState());

  final WorkshopJobsRepository _repository;
  final PendingSubmissionStore _pending;
  final String jobId;

  /// Unconfirmed submission for this job, if any (survives app restarts when
  /// backed by secure storage).
  Future<PendingSubmission?> pendingSubmission() => _pending.read(jobId);
  int _loadGeneration = 0;
  int _submitGeneration = 0;
  int _refreshGeneration = 0;
  CancelToken? _loadCancel;
  CancelToken? _submitCancel;
  CancelToken? _refreshCancel;

  Future<void> load() async {
    if (isClosed) return;
    final generation = ++_loadGeneration;
    _loadCancel?.cancel('Nueva carga de detalle');
    _refreshCancel?.cancel('Carga manual de detalle');
    _refreshGeneration++;
    final cancelToken = CancelToken();
    _loadCancel = cancelToken;
    emit(
      state.copyWith(
        status: WorkshopJobDetailStatus.loading,
        clearError: true,
      ),
    );
    try {
      final job = await _repository.detail(jobId, cancelToken: cancelToken);
      if (isClosed || generation != _loadGeneration) return;
      emit(
        state.copyWith(
          status: WorkshopJobDetailStatus.success,
          job: job,
          clearError: true,
        ),
      );
    } on AppException catch (error) {
      if (isClosed || generation != _loadGeneration) return;
      emit(
        state.copyWith(
          status: WorkshopJobDetailStatus.failure,
          error: error,
        ),
      );
    }
  }

  Future<bool> submit(SubmitProgressCommand command) async {
    if (isClosed || state.isSubmitting) return false;
    final allowed = state.job?.allowedReportTypes ?? const [];
    if (!allowed.contains(command.type)) {
      emit(
        state.copyWith(
          submitError: const InvalidWorkshopStateException(
            'Esta acción ya no está disponible para el estado actual del trabajo.',
          ),
        ),
      );
      return false;
    }
    final generation = ++_submitGeneration;
    _submitCancel?.cancel('Nuevo envío de reporte');
    _loadCancel?.cancel('Envío de reporte');
    _loadGeneration++;
    final cancelToken = CancelToken();
    _submitCancel = cancelToken;
    emit(state.copyWith(isSubmitting: true, clearSubmitError: true));
    final fingerprint = await _fingerprint(command);
    final previous = await _pending.read(jobId);
    final requestId = previous != null && previous.fingerprint == fingerprint
        ? previous.requestId
        : command.requestId ?? _newRequestId();
    await _pending.write(
      jobId,
      PendingSubmission(
        requestId: requestId,
        fingerprint: fingerprint,
        type: command.type.apiValue,
        message: command.message,
        progressPercent: command.progressPercent,
        imagePaths: command.imagePaths,
        createdAt: previous?.requestId == requestId
            ? previous!.createdAt
            : DateTime.now(),
      ),
    );
    try {
      final report = await _repository.submit(
        jobId,
        command.withRequestId(requestId),
        cancelToken: cancelToken,
      );
      await _pending.delete(jobId);
      if (isClosed || generation != _submitGeneration) return false;
      final currentJob = state.job;
      if (currentJob == null) return false;
      emit(
        state.copyWith(
          status: WorkshopJobDetailStatus.success,
          job: currentJob.withSubmittedReport(report),
          isSubmitting: false,
          clearSubmitError: true,
        ),
      );
      unawaited(_refreshBestEffort(generation));
      return true;
    } on AppException catch (error) {
      // Keep the requestId only when the server may have committed the report.
      if (!_outcomeUnknown(error)) await _pending.delete(jobId);
      if (isClosed || generation != _submitGeneration) return false;
      emit(state.copyWith(isSubmitting: false, submitError: error));
      return false;
    }
  }

  static bool _outcomeUnknown(AppException error) =>
      error is NetworkException ||
      error is InvalidResponseException ||
      error is SessionChangedException ||
      (error is ApiException &&
          (error.statusCode == null || error.statusCode! >= 500));

  static String _newRequestId() {
    final random = Random.secure();
    return List.generate(
        16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  static Future<String> _fingerprint(SubmitProgressCommand command) async {
    final images = <String>[];
    for (final path in command.imagePaths) {
      try {
        images.add(sha256.convert(await File(path).readAsBytes()).toString());
      } catch (_) {
        images.add('path:$path');
      }
    }
    final percent = command.type == ProgressReportType.progress
        ? command.progressPercent
        : null;
    return sha256
        .convert(utf8.encode(jsonEncode(
            [command.type.apiValue, command.message.trim(), percent, images])))
        .toString();
  }

  Future<void> _refreshBestEffort(int submitGeneration) async {
    if (isClosed || submitGeneration != _submitGeneration) return;
    final generation = ++_refreshGeneration;
    _refreshCancel?.cancel('Nueva reconciliación');
    final cancelToken = CancelToken();
    _refreshCancel = cancelToken;
    try {
      final refreshed = await _repository.detail(
        jobId,
        cancelToken: cancelToken,
      );
      if (isClosed ||
          generation != _refreshGeneration ||
          submitGeneration != _submitGeneration) {
        return;
      }
      emit(
        state.copyWith(
          status: WorkshopJobDetailStatus.success,
          job: refreshed,
          clearError: true,
        ),
      );
    } on AppException {
      // El POST ya fue confirmado; la reconciliación es best-effort.
    }
  }

  @override
  Future<void> close() {
    _loadGeneration++;
    _submitGeneration++;
    _refreshGeneration++;
    _loadCancel?.cancel('Detalle cerrado');
    _submitCancel?.cancel('Detalle cerrado');
    _refreshCancel?.cancel('Detalle cerrado');
    return super.close();
  }
}
