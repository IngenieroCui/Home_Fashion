import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/widgets/state_views.dart';
import '../data/workshop_jobs_repository.dart';
import '../domain/workshop_job.dart';
import '../logic/workshop_job_detail_cubit.dart';
import 'progress_report_sheet.dart';
import 'workshop_labels.dart';

class WorkshopJobDetailPage extends StatelessWidget {
  const WorkshopJobDetailPage({
    required this.jobId,
    required this.repository,
    super.key,
  });

  final String jobId;
  final WorkshopJobsRepository repository;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => WorkshopJobDetailCubit(
        repository: repository,
        jobId: jobId,
      )..load(),
      child: const _DetailView(),
    );
  }
}

class _DetailView extends StatelessWidget {
  const _DetailView();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkshopJobDetailCubit>().state;
    return Scaffold(
      appBar: AppBar(title: Text(state.job?.code ?? 'Detalle del trabajo')),
      body: switch (state.status) {
        WorkshopJobDetailStatus.initial ||
        WorkshopJobDetailStatus.loading =>
          const Center(child: CircularProgressIndicator()),
        WorkshopJobDetailStatus.failure => ErrorStateView(
            message: state.error?.message ?? 'No pudimos cargar el trabajo.',
            onRetry: context.read<WorkshopJobDetailCubit>().load,
          ),
        WorkshopJobDetailStatus.success => _content(context, state.job!),
      },
    );
  }

  Widget _content(BuildContext context, WorkshopJobDetail job) {
    return RefreshIndicator(
      onRefresh: context.read<WorkshopJobDetailCubit>().load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(job.productName,
                    style: Theme.of(context).textTheme.headlineSmall),
              ),
              StatusBadge(
                label: jobStatusLabel(job.status),
                color: Theme.of(context).colorScheme.primary,
              ),
            ],
          ),
          if (job.variantName != null) ...[
            const SizedBox(height: 4),
            Text(job.variantName!),
          ],
          const SizedBox(height: 16),
          _Section(
            title: 'Instrucciones',
            child: Text(job.instructions ?? 'Sin instrucciones adicionales.'),
          ),
          _Section(
            title: 'Pedido y especificaciones',
            child: Column(
              children: [
                _Fact(label: 'Pedido', value: job.orderCode),
                _Fact(label: 'Cantidad', value: '${job.quantity}'),
                if (job.sku != null) _Fact(label: 'SKU', value: job.sku!),
                _Fact(
                  label: 'Estado del elemento',
                  value: job.orderItemStatus,
                ),
                _Fact(
                  label: 'Asignado',
                  value: shortDate(job.assignedAt),
                ),
                _Fact(
                  label: 'Fecha esperada',
                  value: job.expectedCompletionDate == null
                      ? 'No definida'
                      : shortDate(job.expectedCompletionDate!),
                ),
              ],
            ),
          ),
          if (job.customization != null)
            _Section(
              title: 'Personalización',
              child: Text(_readableCustomization(job.customization)),
            ),
          if (job.notes != null)
            _Section(title: 'Notas', child: Text(job.notes!)),
          if (job.allowedReportTypes.isNotEmpty)
            _Section(
              title: 'Reportar avance',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final type in job.allowedReportTypes) ...[
                    FilledButton.tonalIcon(
                      onPressed: () => _openReport(context, type),
                      icon: Icon(_reportIcon(type)),
                      label: Text(reportTypeLabel(type)),
                    ),
                    if (type != job.allowedReportTypes.last)
                      const SizedBox(height: 10),
                  ],
                ],
              ),
            )
          else
            _Section(
              title: 'Acciones',
              child: Text(_blockedMessage(job.status)),
            ),
          _Section(
            title: 'Historial de reportes',
            child: job.progressReports.isEmpty
                ? const Text('Todavía no se han enviado reportes.')
                : Column(
                    children: [
                      for (var index = 0;
                          index < job.progressReports.length;
                          index++) ...[
                        _ReportTile(report: job.progressReports[index]),
                        if (index < job.progressReports.length - 1)
                          const Divider(height: 28),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _openReport(
    BuildContext context,
    ProgressReportType type,
  ) async {
    final cubit = context.read<WorkshopJobDetailCubit>();
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => BlocProvider.value(
        value: cubit,
        child: ProgressReportSheet(type: type),
      ),
    );
    if (sent == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reporte enviado correctamente.')),
      );
    }
  }

  IconData _reportIcon(ProgressReportType type) => switch (type) {
        ProgressReportType.started => Icons.play_arrow,
        ProgressReportType.progress => Icons.trending_up,
        ProgressReportType.readyForReview => Icons.fact_check_outlined,
      };

  String _blockedMessage(WorkshopJobStatus status) => switch (status) {
        WorkshopJobStatus.readyForReview =>
          'El trabajo está esperando revisión de Home Fashion. No puedes enviar otro reporte por ahora.',
        WorkshopJobStatus.completed =>
          'Este trabajo ya fue aprobado y completado.',
        WorkshopJobStatus.cancelled => 'Este trabajo fue cancelado.',
        _ => 'No hay acciones disponibles para el estado actual.',
      };

  String _readableCustomization(Object? value) {
    if (value is Map) {
      return value.entries
          .map((entry) => '${_title(entry.key.toString())}: ${entry.value}')
          .join('\n');
    }
    if (value is List) return value.join('\n');
    if (value is String) return value;
    return jsonEncode(value);
  }

  String _title(String value) {
    const labels = {
      'dimensions': 'Medidas',
      'seats': 'Puestos',
      'material': 'Material',
      'fabric': 'Tela',
      'color': 'Color',
      'finish': 'Acabado',
      'observations': 'Observaciones',
      'details': 'Detalles solicitados',
      'accessRestrictions': 'Restricciones de acceso',
    };
    return labels[value] ?? 'Detalle adicional';
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(top: 14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              child,
            ],
          ),
        ),
      );
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 130,
              child: Text(label,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            Expanded(child: Text(value)),
          ],
        ),
      );
}

class _ReportTile extends StatelessWidget {
  const _ReportTile({required this.report});
  final ProgressReport report;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                reportTypeLabel(report.type),
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            StatusBadge(
              label: reviewStatusLabel(report.reviewStatus),
              color: reviewStatusColor(context, report.reviewStatus),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(dateTimeLabel(report.submittedAt)),
        const SizedBox(height: 8),
        Text(report.message),
        if (report.progressPercent != null) ...[
          const SizedBox(height: 8),
          Text('Avance: ${report.progressPercent}%'),
        ],
        if (report.evidenceUrls.isNotEmpty) ...[
          const SizedBox(height: 8),
          for (final url in report.evidenceUrls)
            Text(url,
                style: TextStyle(color: Theme.of(context).colorScheme.primary)),
        ],
        if (report.reviewComment != null) ...[
          const SizedBox(height: 10),
          Text(
            'Comentario de revisión: ${report.reviewComment}',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ],
    );
  }
}
