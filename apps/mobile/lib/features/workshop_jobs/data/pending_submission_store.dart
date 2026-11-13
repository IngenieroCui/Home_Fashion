import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A progress report that was sent but whose result is unknown (network loss,
/// timeout, 5xx). Its [requestId] is reused on the next identical submission so
/// the API's idempotency returns the already committed report instead of
/// creating a duplicate, even after the app is closed and reopened.
class PendingSubmission {
  const PendingSubmission({
    required this.requestId,
    required this.fingerprint,
    required this.type,
    required this.message,
    required this.progressPercent,
    required this.imagePaths,
    required this.createdAt,
  });

  final String requestId;
  final String fingerprint;
  final String type;
  final String message;
  final int? progressPercent;
  final List<String> imagePaths;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'requestId': requestId,
        'fingerprint': fingerprint,
        'type': type,
        'message': message,
        'progressPercent': progressPercent,
        'imagePaths': imagePaths,
        'createdAt': createdAt.toUtc().toIso8601String(),
      };

  static PendingSubmission? tryParse(String? raw) {
    if (raw == null) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final requestId = json['requestId'] as String;
      if (!RegExp(r'^[a-f0-9]{32}$').hasMatch(requestId)) return null;
      return PendingSubmission(
        requestId: requestId,
        fingerprint: json['fingerprint'] as String,
        type: json['type'] as String,
        message: json['message'] as String,
        progressPercent: json['progressPercent'] as int?,
        imagePaths: (json['imagePaths'] as List).cast<String>(),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } catch (_) {
      return null;
    }
  }
}

abstract interface class PendingSubmissionStore {
  Future<PendingSubmission?> read(String jobId);
  Future<void> write(String jobId, PendingSubmission submission);
  Future<void> delete(String jobId);
}

/// Default for tests and hosts without secure storage: survives sheet
/// close/reopen but not process death.
class MemoryPendingSubmissionStore implements PendingSubmissionStore {
  final Map<String, PendingSubmission> _items = {};

  @override
  Future<PendingSubmission?> read(String jobId) async => _items[jobId];

  @override
  Future<void> write(String jobId, PendingSubmission submission) async =>
      _items[jobId] = submission;

  @override
  Future<void> delete(String jobId) async => _items.remove(jobId);
}

class SecurePendingSubmissionStore implements PendingSubmissionStore {
  SecurePendingSubmissionStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  // Pending entries expire so an abandoned draft never blocks a new report.
  static const maxAge = Duration(days: 2);
  final FlutterSecureStorage _storage;

  String _key(String jobId) => 'home_fashion_pending_progress_$jobId';

  @override
  Future<PendingSubmission?> read(String jobId) async {
    try {
      final pending =
          PendingSubmission.tryParse(await _storage.read(key: _key(jobId)));
      if (pending == null) return null;
      if (DateTime.now().difference(pending.createdAt) > maxAge) {
        await delete(jobId);
        return null;
      }
      return pending;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(String jobId, PendingSubmission submission) async {
    try {
      await _storage.write(
          key: _key(jobId), value: jsonEncode(submission.toJson()));
    } catch (_) {
      // Best effort: the in-flight request still carries its requestId.
    }
  }

  @override
  Future<void> delete(String jobId) async {
    try {
      await _storage.delete(key: _key(jobId));
    } catch (_) {}
  }
}
