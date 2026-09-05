import 'package:flutter/material.dart';

import '../domain/workshop_job.dart';

String jobStatusLabel(WorkshopJobStatus status) => switch (status) {
      WorkshopJobStatus.assigned => 'Asignado',
      WorkshopJobStatus.inProgress => 'En fabricación',
      WorkshopJobStatus.readyForReview => 'En revisión',
      WorkshopJobStatus.completed => 'Completado',
      WorkshopJobStatus.cancelled => 'Cancelado',
    };

String reportTypeLabel(ProgressReportType type) => switch (type) {
      ProgressReportType.started => 'Inicio de fabricación',
      ProgressReportType.progress => 'Avance',
      ProgressReportType.readyForReview => 'Listo para revisión',
    };

String reviewStatusLabel(ProgressReviewStatus status) => switch (status) {
      ProgressReviewStatus.pending => 'PENDIENTE',
      ProgressReviewStatus.approved => 'APROBADO',
      ProgressReviewStatus.rejected => 'RECHAZADO',
    };

Color reviewStatusColor(BuildContext context, ProgressReviewStatus status) {
  final scheme = Theme.of(context).colorScheme;
  return switch (status) {
    ProgressReviewStatus.pending => scheme.tertiary,
    ProgressReviewStatus.approved => Colors.green.shade700,
    ProgressReviewStatus.rejected => scheme.error,
  };
}

String shortDate(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year}';
}

String dateTimeLabel(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${shortDate(local)} · ${two(local.hour)}:${two(local.minute)}';
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.label, required this.color, super.key});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}
