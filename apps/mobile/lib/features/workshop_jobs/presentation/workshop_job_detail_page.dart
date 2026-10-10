import 'workshop_product_image.dart';
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
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
                color: const Color(0xFF3D352C),
                borderRadius: BorderRadius.circular(20)),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              WorkshopProductImage(url: job.imageUrlSnapshot, height: 220),
              const SizedBox(height: 16),
              const Text('ORDEN DE FABRICACIÓN',
                  style: TextStyle(
                      color: Color(0xFFD9C6AC),
                      fontSize: 11,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(job.productName,
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(color: const Color(0xFFFFF8EA))),
              const SizedBox(height: 8),
              if (job.variantName != null)
                Text(job.variantName!,
                    style: const TextStyle(color: Color(0xFFE7DCCB))),
              Text(
                  '${job.code} · ${job.orderCode} · ${job.quantity} unidad(es)',
                  style: const TextStyle(color: Color(0xFFE7DCCB))),
            ]),
          ),
          const SizedBox(height: 18),
          _Section(
            title: 'Pedido y especificaciones',
            child: Column(
              children: [
                _Fact(label: 'Pedido', value: job.orderCode),
                _Fact(label: 'Cantidad', value: '${job.quantity}'),
                if (job.sku != null) _Fact(label: 'SKU', value: job.sku!),
                _Fact(
                  label: 'Estado del elemento',
                  value: const {
                        'RESERVED': 'Reservado',
                        'PENDING_PRODUCTION': 'Pendiente de fabricación',
                        'IN_PRODUCTION': 'En fabricación',
                        'READY': 'Listo',
                        'DELIVERED': 'Entregado',
                        'CANCELLED': 'Cancelado'
                      }[job.orderItemStatus] ??
                      'En seguimiento',
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
          _Section(
            title: 'Instrucciones Home Fashion',
            child: Text(job.instructions ?? 'Sin instrucciones adicionales.'),
          ),
          StatusBadge(
              label: jobStatusLabel(job.status),
              color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 12),
          _ProductionProgress(status: job.status),
          if (job.customization != null)
            _Section(
              title: 'Personalización',
              child: Text(_readableCustomization(job.customization)),
            ),
          if (job.notes != null)
            _Section(title: 'Notas', child: Text(job.notes!)),
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
                      label: Text(type == ProgressReportType.started
                          ? 'Iniciar trabajo'
                          : reportTypeLabel(type)),
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
        const SnackBar(content: Text('Avance enviado correctamente')),
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

class _ProductionProgress extends StatelessWidget {
  const _ProductionProgress({required this.status});
  final WorkshopJobStatus status;
  @override
  Widget build(BuildContext context) {
    final stage = switch (status) {
      WorkshopJobStatus.assigned => 0,
      WorkshopJobStatus.inProgress => 1,
      WorkshopJobStatus.readyForReview => 2,
      WorkshopJobStatus.completed => 3,
      WorkshopJobStatus.cancelled => 0
    };
    return Card(
        child: Padding(
            padding: const EdgeInsets.all(16),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Progreso del trabajo',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                  value: (stage + 1) / 4,
                  minHeight: 7,
                  borderRadius: BorderRadius.circular(10),
                  backgroundColor: const Color(0xFFE6E0D6)),
              const SizedBox(height: 8),
              Text(jobStatusLabel(status)),
            ])));
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
        child: MediaQuery.textScalerOf(context).scale(14) > 18
            ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(value),
              ])
            : Row(
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
        Wrap(spacing: 12, runSpacing: 8, children: [
          Text(reportTypeLabel(report.type),
              style: Theme.of(context).textTheme.titleSmall),
          StatusBadge(
              label: reviewStatusLabel(report.reviewStatus),
              color: reviewStatusColor(context, report.reviewStatus)),
        ]),
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
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final url in report.evidenceUrls)
              if (_isImageUrl(url))
                InkWell(
                  onTap: () => showDialog<void>(
                    context: context,
                    builder: (_) => Dialog(
                      child: InteractiveViewer(
                        child: Image.network(
                          url,
                          errorBuilder: (_, __, ___) => const Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('No se pudo cargar la imagen.'),
                          ),
                        ),
                      ),
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(
                      url,
                      width: 104,
                      height: 82,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox(
                        width: 104,
                        height: 82,
                        child: Icon(Icons.broken_image_outlined),
                      ),
                    ),
                  ),
                )
              else
                const Chip(
                    avatar: Icon(Icons.attach_file, size: 16),
                    label: Text('Archivo adjunto')),
          ]),
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

bool _isImageUrl(String url) {
  final uri = Uri.tryParse(url);
  return uri != null &&
      (uri.scheme == 'https' || uri.scheme == 'http') &&
      (RegExp(r'\.(jpg|jpeg|png|webp|gif)$', caseSensitive: false)
              .hasMatch(uri.path) ||
          uri.path.contains('/image/upload/'));
}
