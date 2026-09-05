enum WorkshopJobStatus {
  assigned('ASSIGNED'),
  inProgress('IN_PROGRESS'),
  readyForReview('READY_FOR_REVIEW'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const WorkshopJobStatus(this.apiValue);
  final String apiValue;

  static WorkshopJobStatus parse(Object? value) => values.firstWhere(
        (item) => item.apiValue == value,
        orElse: () => throw const FormatException('Invalid workshop status'),
      );
}

enum ProgressReportType {
  started('STARTED'),
  progress('PROGRESS'),
  readyForReview('READY_FOR_REVIEW');

  const ProgressReportType(this.apiValue);
  final String apiValue;
}

enum ProgressReviewStatus {
  pending('PENDING_REVIEW'),
  approved('APPROVED'),
  rejected('REJECTED');

  const ProgressReviewStatus(this.apiValue);
  final String apiValue;

  static ProgressReviewStatus parse(Object? value) => values.firstWhere(
        (item) => item.apiValue == value,
        orElse: () => throw const FormatException('Invalid review status'),
      );
}

class ProgressReport {
  const ProgressReport({
    required this.id,
    required this.type,
    required this.message,
    required this.reviewStatus,
    required this.submittedAt,
    required this.evidenceUrls,
    this.progressPercent,
    this.reviewedAt,
    this.reviewComment,
  });

  factory ProgressReport.fromJson(Map<String, dynamic> json) {
    return ProgressReport(
      id: _requiredString(json, 'id'),
      type: ProgressReportType.values.firstWhere(
        (item) => item.apiValue == json['type'],
        orElse: () => throw const FormatException('Invalid report type'),
      ),
      message: _requiredString(json, 'message'),
      progressPercent: (json['progressPercent'] as num?)?.toInt(),
      evidenceUrls: _stringList(json['evidenceUrls']),
      reviewStatus: ProgressReviewStatus.parse(json['reviewStatus']),
      submittedAt: DateTime.parse(_requiredString(json, 'submittedAt')),
      reviewedAt: _date(json['reviewedAt']),
      reviewComment: _nullableString(json['reviewComment']),
    );
  }

  final String id;
  final ProgressReportType type;
  final String message;
  final int? progressPercent;
  final List<String> evidenceUrls;
  final ProgressReviewStatus reviewStatus;
  final DateTime submittedAt;
  final DateTime? reviewedAt;
  final String? reviewComment;
}

class WorkshopJobSummary {
  const WorkshopJobSummary({
    required this.id,
    required this.code,
    required this.status,
    required this.orderCode,
    required this.productName,
    required this.quantity,
    required this.assignedAt,
    this.variantName,
    this.expectedCompletionDate,
    this.latestReport,
  });

  factory WorkshopJobSummary.fromJson(Map<String, dynamic> json) {
    final order = _map(json['order']);
    return WorkshopJobSummary(
      id: _requiredString(json, 'id'),
      code: _requiredString(json, 'code'),
      status: WorkshopJobStatus.parse(json['status']),
      orderCode: _requiredString(order, 'code'),
      productName: _requiredString(json, 'productNameSnapshot'),
      variantName: _nullableString(json['variantNameSnapshot']),
      quantity: (json['quantity'] as num?)?.toInt() ??
          (throw const FormatException('Missing quantity')),
      assignedAt: DateTime.parse(_requiredString(json, 'assignedAt')),
      expectedCompletionDate: _date(json['expectedCompletionDate']),
      latestReport: json['latestReport'] == null
          ? null
          : ProgressReport.fromJson(_map(json['latestReport'])),
    );
  }

  final String id;
  final String code;
  final WorkshopJobStatus status;
  final String orderCode;
  final String productName;
  final String? variantName;
  final int quantity;
  final DateTime assignedAt;
  final DateTime? expectedCompletionDate;
  final ProgressReport? latestReport;
}

class WorkshopJobDetail {
  const WorkshopJobDetail({
    required this.id,
    required this.code,
    required this.status,
    required this.orderId,
    required this.orderCode,
    required this.productName,
    required this.quantity,
    required this.orderItemStatus,
    required this.assignedAt,
    required this.progressReports,
    this.instructions,
    this.variantName,
    this.sku,
    this.customization,
    this.notes,
    this.expectedCompletionDate,
  });

  factory WorkshopJobDetail.fromJson(Map<String, dynamic> json) {
    final order = _map(json['order']);
    final reports = json['progressReports'];
    if (reports is! List) throw const FormatException('Missing reports');
    return WorkshopJobDetail(
      id: _requiredString(json, 'id'),
      code: _requiredString(json, 'code'),
      status: WorkshopJobStatus.parse(json['status']),
      orderId: _requiredString(order, 'id'),
      orderCode: _requiredString(order, 'code'),
      productName: _requiredString(json, 'productNameSnapshot'),
      variantName: _nullableString(json['variantNameSnapshot']),
      sku: _nullableString(json['skuSnapshot']),
      quantity: (json['quantity'] as num?)?.toInt() ??
          (throw const FormatException('Missing quantity')),
      customization: json['customization'],
      notes: _nullableString(json['notes']),
      instructions: _nullableString(json['instructions']),
      orderItemStatus: _requiredString(json, 'orderItemStatus'),
      assignedAt: DateTime.parse(_requiredString(json, 'assignedAt')),
      expectedCompletionDate: _date(json['expectedCompletionDate']),
      progressReports: reports
          .map((item) => ProgressReport.fromJson(_map(item)))
          .toList(growable: false),
    );
  }

  final String id;
  final String code;
  final WorkshopJobStatus status;
  final String orderId;
  final String orderCode;
  final String productName;
  final String? variantName;
  final String? sku;
  final int quantity;
  final Object? customization;
  final String? notes;
  final String? instructions;
  final String orderItemStatus;
  final DateTime assignedAt;
  final DateTime? expectedCompletionDate;
  final List<ProgressReport> progressReports;

  List<ProgressReportType> get allowedReportTypes => switch (status) {
        WorkshopJobStatus.assigned => const [ProgressReportType.started],
        WorkshopJobStatus.inProgress => const [
            ProgressReportType.progress,
            ProgressReportType.readyForReview,
          ],
        _ => const [],
      };

  WorkshopJobDetail withSubmittedReport(ProgressReport report) {
    final exists = progressReports.any((item) => item.id == report.id);
    final nextStatus = switch (report.type) {
      ProgressReportType.started => WorkshopJobStatus.inProgress,
      ProgressReportType.readyForReview => WorkshopJobStatus.readyForReview,
      ProgressReportType.progress => status,
    };
    return WorkshopJobDetail(
      id: id,
      code: code,
      status: nextStatus,
      orderId: orderId,
      orderCode: orderCode,
      productName: productName,
      quantity: quantity,
      orderItemStatus: report.type == ProgressReportType.started
          ? 'IN_PRODUCTION'
          : orderItemStatus,
      assignedAt: assignedAt,
      progressReports: exists ? progressReports : [...progressReports, report],
      instructions: instructions,
      variantName: variantName,
      sku: sku,
      customization: customization,
      notes: notes,
      expectedCompletionDate: expectedCompletionDate,
    );
  }
}

class WorkshopJobsPage {
  const WorkshopJobsPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory WorkshopJobsPage.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    final pagination = _map(json['pagination']);
    if (data is! List) throw const FormatException('Missing jobs');
    return WorkshopJobsPage(
      items: data
          .map((item) => WorkshopJobSummary.fromJson(_map(item)))
          .toList(growable: false),
      page: (pagination['page'] as num?)?.toInt() ?? 1,
      limit: (pagination['limit'] as num?)?.toInt() ?? 12,
      total: (pagination['total'] as num?)?.toInt() ?? 0,
      totalPages: (pagination['totalPages'] as num?)?.toInt() ?? 0,
    );
  }

  final List<WorkshopJobSummary> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;
}

class SubmitProgressCommand {
  const SubmitProgressCommand({
    required this.type,
    required this.message,
    this.progressPercent,
    this.evidenceUrls = const [],
  });

  final ProgressReportType type;
  final String message;
  final int? progressPercent;
  final List<String> evidenceUrls;

  Map<String, dynamic> toJson() => {
        'type': type.apiValue,
        'message': message.trim(),
        if (type == ProgressReportType.progress && progressPercent != null)
          'progressPercent': progressPercent,
        if (evidenceUrls.isNotEmpty) 'evidenceUrls': evidenceUrls,
      };
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.cast<String, dynamic>();
  throw const FormatException('Invalid object');
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Missing $key');
}

String? _nullableString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value : null;

DateTime? _date(Object? value) =>
    value is String && value.isNotEmpty ? DateTime.parse(value) : null;

List<String> _stringList(Object? value) {
  if (value == null) return const [];
  if (value is! List || value.any((item) => item is! String)) {
    throw const FormatException('Invalid string list');
  }
  return value.cast<String>().toList(growable: false);
}
