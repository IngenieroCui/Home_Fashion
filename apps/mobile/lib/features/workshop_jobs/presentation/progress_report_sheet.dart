import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../domain/workshop_job.dart';
import '../logic/workshop_job_detail_cubit.dart';
import 'workshop_labels.dart';

class ProgressReportSheet extends StatefulWidget {
  const ProgressReportSheet({required this.type, super.key});

  final ProgressReportType type;

  @override
  State<ProgressReportSheet> createState() => _ProgressReportSheetState();
}

class _ProgressReportSheetState extends State<ProgressReportSheet> {
  final _formKey = GlobalKey<FormState>();
  final _message = TextEditingController();
  final _percent = TextEditingController();
  final _urls = List.generate(5, (_) => TextEditingController());

  @override
  void dispose() {
    _message.dispose();
    _percent.dispose();
    for (final controller in _urls) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkshopJobDetailCubit>().state;
    final submitting = state.isSubmitting;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      reportTypeLabel(widget.type),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Cerrar',
                    onPressed: submitting ? null : () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _message,
                enabled: !submitting,
                minLines: 3,
                maxLines: 6,
                maxLength: 4000,
                decoration: const InputDecoration(
                  labelText: 'Mensaje *',
                  hintText: 'Describe claramente el trabajo realizado.',
                  alignLabelWithHint: true,
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Escribe un mensaje.'
                    : null,
              ),
              if (widget.type == ProgressReportType.progress) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _percent,
                  enabled: !submitting,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Porcentaje de avance (opcional)',
                    suffixText: '%',
                    helperText: 'Si lo indicas, debe estar entre 1 y 99.',
                  ),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) return null;
                    final parsed = int.tryParse(text);
                    return parsed == null || parsed < 1 || parsed > 99
                        ? 'El porcentaje debe estar entre 1 y 99.'
                        : null;
                  },
                ),
              ],
              const SizedBox(height: 18),
              Text('Evidencias por URL (opcional)',
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 4),
              const Text(
                'Puedes agregar hasta 5 enlaces https. No selecciones archivos del teléfono.',
              ),
              const SizedBox(height: 12),
              for (var index = 0; index < _urls.length; index++) ...[
                TextFormField(
                  key: ValueKey('evidence-$index'),
                  controller: _urls[index],
                  enabled: !submitting,
                  keyboardType: TextInputType.url,
                  decoration: InputDecoration(
                    labelText: 'URL ${index + 1}',
                    prefixIcon: const Icon(Icons.link),
                  ),
                  validator: _validateUrl,
                ),
                if (index < _urls.length - 1) const SizedBox(height: 10),
              ],
              if (state.submitError != null) ...[
                const SizedBox(height: 16),
                Text(
                  state.submitError!.message,
                  key: const Key('submit-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: submitting ? null : _submit,
                icon: submitting
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send_outlined),
                label: Text(submitting ? 'Enviando…' : 'Enviar reporte'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _validateUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    final uri = Uri.tryParse(trimmed);
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
      return 'Ingresa una URL https válida.';
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final cubit = context.read<WorkshopJobDetailCubit>();
    final success = await cubit.submit(
      SubmitProgressCommand(
        type: widget.type,
        message: _message.text,
        progressPercent: widget.type == ProgressReportType.progress &&
                _percent.text.trim().isNotEmpty
            ? int.parse(_percent.text.trim())
            : null,
        evidenceUrls: _urls
            .map((item) => item.text.trim())
            .where((item) => item.isNotEmpty)
            .toList(growable: false),
      ),
    );
    if (success && mounted) Navigator.pop(context, true);
  }
}
