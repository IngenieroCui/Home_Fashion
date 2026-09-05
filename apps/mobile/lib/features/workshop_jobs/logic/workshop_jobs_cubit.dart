import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors/app_exception.dart';
import '../data/workshop_jobs_repository.dart';
import '../domain/workshop_job.dart';

enum WorkshopJobsLoadStatus { initial, loading, success, failure }

class WorkshopJobsState {
  const WorkshopJobsState({
    this.status = WorkshopJobsLoadStatus.initial,
    this.items = const [],
    this.query = '',
    this.isSlow = false,
    this.isLoadingMore = false,
    this.page = 0,
    this.totalPages = 0,
    this.filter,
    this.error,
    this.loadMoreError,
  });

  final WorkshopJobsLoadStatus status;
  final List<WorkshopJobSummary> items;
  final String query;
  final WorkshopJobStatus? filter;
  final bool isSlow;
  final bool isLoadingMore;
  final int page;
  final int totalPages;
  final AppException? error;
  final AppException? loadMoreError;

  bool get canLoadMore => page < totalPages;

  WorkshopJobsState copyWith({
    WorkshopJobsLoadStatus? status,
    List<WorkshopJobSummary>? items,
    String? query,
    WorkshopJobStatus? filter,
    bool clearFilter = false,
    bool? isSlow,
    bool? isLoadingMore,
    int? page,
    int? totalPages,
    AppException? error,
    bool clearError = false,
    AppException? loadMoreError,
    bool clearLoadMoreError = false,
  }) {
    return WorkshopJobsState(
      status: status ?? this.status,
      items: items ?? this.items,
      query: query ?? this.query,
      filter: clearFilter ? null : (filter ?? this.filter),
      isSlow: isSlow ?? this.isSlow,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      error: clearError ? null : (error ?? this.error),
      loadMoreError:
          clearLoadMoreError ? null : (loadMoreError ?? this.loadMoreError),
    );
  }
}

class WorkshopJobsCubit extends Cubit<WorkshopJobsState> {
  WorkshopJobsCubit({required WorkshopJobsRepository repository})
      : _repository = repository,
        super(const WorkshopJobsState());

  final WorkshopJobsRepository _repository;
  int _request = 0;
  Timer? _slowTimer;
  CancelToken? _loadCancel;
  CancelToken? _loadMoreCancel;

  Future<void> load({bool refresh = false}) async {
    if (isClosed) return;
    final request = ++_request;
    _loadCancel?.cancel('Nueva carga');
    _loadMoreCancel?.cancel('Cambió la consulta');
    final cancelToken = CancelToken();
    _loadCancel = cancelToken;
    final query = state.query;
    final filter = state.filter;
    _slowTimer?.cancel();
    emit(
      state.copyWith(
        status: WorkshopJobsLoadStatus.loading,
        isSlow: false,
        isLoadingMore: false,
        clearError: true,
        clearLoadMoreError: true,
      ),
    );
    _slowTimer = Timer(const Duration(milliseconds: 900), () {
      if (!isClosed && request == _request) emit(state.copyWith(isSlow: true));
    });
    try {
      final result = await _repository.list(
        query: query,
        status: filter,
        cancelToken: cancelToken,
      );
      if (isClosed || request != _request) return;
      emit(
        state.copyWith(
          status: WorkshopJobsLoadStatus.success,
          items: result.items,
          page: result.page,
          totalPages: result.totalPages,
          isSlow: false,
          clearError: true,
        ),
      );
    } on AppException catch (error) {
      if (isClosed || request != _request) return;
      emit(
        state.copyWith(
          status: WorkshopJobsLoadStatus.failure,
          error: error,
          isSlow: false,
        ),
      );
    } finally {
      if (request == _request) _slowTimer?.cancel();
    }
  }

  Future<void> search(String value) async {
    if (isClosed) return;
    emit(state.copyWith(query: value));
    await load();
  }

  Future<void> setFilter(WorkshopJobStatus? value) async {
    if (isClosed) return;
    emit(
      value == null
          ? state.copyWith(clearFilter: true)
          : state.copyWith(filter: value),
    );
    await load();
  }

  Future<void> loadMore() async {
    if (isClosed || !state.canLoadMore || state.isLoadingMore) return;
    final request = _request;
    final query = state.query;
    final filter = state.filter;
    final currentPage = state.page;
    final nextPage = currentPage + 1;
    _loadMoreCancel?.cancel('Nueva página');
    final cancelToken = CancelToken();
    _loadMoreCancel = cancelToken;
    emit(
      state.copyWith(
        isLoadingMore: true,
        clearLoadMoreError: true,
      ),
    );
    try {
      final result = await _repository.list(
        page: nextPage,
        query: query,
        status: filter,
        cancelToken: cancelToken,
      );
      if (isClosed ||
          request != _request ||
          state.query != query ||
          state.filter != filter ||
          state.page != currentPage) {
        return;
      }
      emit(
        state.copyWith(
          items: [...state.items, ...result.items],
          page: result.page,
          totalPages: result.totalPages,
          isLoadingMore: false,
        ),
      );
    } on AppException catch (error) {
      if (isClosed ||
          request != _request ||
          state.query != query ||
          state.filter != filter ||
          state.page != currentPage) {
        return;
      }
      emit(
        state.copyWith(
          isLoadingMore: false,
          loadMoreError: error,
        ),
      );
    }
  }

  @override
  Future<void> close() async {
    _request++;
    _slowTimer?.cancel();
    _loadCancel?.cancel('Listado cerrado');
    _loadMoreCancel?.cancel('Listado cerrado');
    return super.close();
  }
}
