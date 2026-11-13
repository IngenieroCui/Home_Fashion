import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
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
  final _picker = ImagePicker();
  final List<XFile> _photos = [];
  bool _picking = false;
  String? _pickerError;
  bool _restoredPending = false;

  @override
  void initState() {
    super.initState();
    _restorePending().whenComplete(_recoverPhotos);
  }

  /// Restores an unconfirmed submission of the same type (for example after
  /// the app was closed while sending) so resending reuses its requestId.
  Future<void> _restorePending() async {
    final pending =
        await context.read<WorkshopJobDetailCubit>().pendingSubmission();
    if (!mounted || pending == null || pending.type != widget.type.apiValue) {
      return;
    }
    final photos = <XFile>[];
    for (final path in pending.imagePaths) {
      if (await File(path).exists()) photos.add(XFile(path));
    }
    if (!mounted) return;
    setState(() {
      _message.text = pending.message;
      _percent.text = pending.progressPercent?.toString() ?? '';
      _photos
        ..clear()
        ..addAll(photos.take(5));
      _restoredPending = true;
    });
  }

  Future<void> _recoverPhotos() async {
    try {
      final response = await _picker.retrieveLostData();
      if (!mounted || response.isEmpty) return;
      if (response.files != null) {
        setState(
            () => _photos.addAll(response.files!.take(5 - _photos.length)));
      }
      if (response.exception != null) {
        setState(() => _pickerError =
            'No pudimos recuperar las fotografías. Puedes seleccionarlas nuevamente.');
      }
    } catch (_) {
      // Unsupported platforms/test hosts have no pending Android picker data.
    }
  }

  @override
  void dispose() {
    _message.dispose();
    _percent.dispose();
    super.dispose();
  }

  Future<void> _addPhoto() async {
    if (_photos.length >= 5 || _picking) return;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(
            leading: const Icon(Icons.camera_alt_outlined),
            title: const Text('Tomar fotografía'),
            onTap: () => Navigator.pop(context, ImageSource.camera)),
        ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Elegir de galería'),
            onTap: () => Navigator.pop(context, ImageSource.gallery)),
        ListTile(
            title: const Text('Cancelar'), onTap: () => Navigator.pop(context)),
      ])),
    );
    if (source == null || !mounted) return;
    setState(() {
      _picking = true;
      _pickerError = null;
    });
    try {
      final photo = await _picker.pickImage(
          source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 82);
      if (photo != null && mounted) setState(() => _photos.add(photo));
    } catch (_) {
      if (mounted) {
        setState(() => _pickerError =
            'No pudimos abrir la cámara o la galería. Puedes volver a intentarlo.');
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkshopJobDetailCubit>().state;
    final busy = state.isSubmitting || _picking;
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 16, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: Form(
          key: _formKey,
          child: SingleChildScrollView(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Row(children: [
                  Expanded(
                      child: Text(reportTypeLabel(widget.type),
                          style: Theme.of(context).textTheme.titleLarge)),
                  IconButton(
                      tooltip: 'Cerrar',
                      onPressed: busy ? null : () => Navigator.pop(context),
                      icon: const Icon(Icons.close))
                ]),
                if (_restoredPending)
                  Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                          'Hay un envío sin confirmar. Revisa los datos y vuelve a enviarlo; no se duplicará.',
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.primary))),
                const SizedBox(height: 8),
                TextFormField(
                    controller: _message,
                    enabled: !busy,
                    minLines: 3,
                    maxLines: 6,
                    maxLength: 4000,
                    decoration: const InputDecoration(
                        labelText: 'Mensaje *',
                        hintText: 'Describe claramente el trabajo realizado.'),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Escribe un mensaje.'
                        : null),
                if (widget.type == ProgressReportType.progress)
                  TextFormField(
                      controller: _percent,
                      enabled: !busy,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Porcentaje de avance (opcional)',
                          suffixText: '%'),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.isEmpty) return null;
                        final number = int.tryParse(text);
                        return number == null || number < 1 || number > 99
                            ? 'El porcentaje debe estar entre 1 y 99.'
                            : null;
                      }),
                const SizedBox(height: 18),
                Text('Evidencias',
                    style: Theme.of(context).textTheme.titleSmall),
                Text('${_photos.length} / 5 fotografías'),
                if (_pickerError != null)
                  Text(_pickerError!,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                    onPressed: busy || _photos.length >= 5 ? null : _addPhoto,
                    icon: const Icon(Icons.add_a_photo_outlined),
                    label: const Text('Agregar fotografía')),
                if (_photos.isNotEmpty)
                  Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Wrap(spacing: 10, runSpacing: 10, children: [
                        for (var i = 0; i < _photos.length; i++)
                          Stack(children: [
                            ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.file(File(_photos[i].path),
                                    width: 96, height: 96, fit: BoxFit.cover)),
                            Positioned(
                                right: 0,
                                child: IconButton(
                                    tooltip: 'Quitar fotografía',
                                    onPressed: busy
                                        ? null
                                        : () =>
                                            setState(() => _photos.removeAt(i)),
                                    icon: const Icon(Icons.cancel),
                                    color: Colors.white))
                          ])
                      ])),
                if (state.submitError != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child: Text(state.submitError!.message,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error))),
                const SizedBox(height: 20),
                FilledButton.icon(
                    onPressed: busy ? null : _submit,
                    icon: state.isSubmitting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send_outlined),
                    label: Text(
                        state.isSubmitting ? 'Enviando…' : 'Enviar reporte')),
              ]))),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final percent = widget.type == ProgressReportType.progress
        ? int.tryParse(_percent.text.trim())
        : null;
    final imagePaths =
        _photos.map((photo) => photo.path).toList(growable: false);
    // The cubit reuses the requestId of an identical unconfirmed submission.
    final success = await context.read<WorkshopJobDetailCubit>().submit(
          SubmitProgressCommand(
            type: widget.type,
            message: _message.text,
            progressPercent: percent,
            imagePaths: imagePaths,
          ),
        );
    if (success && mounted) Navigator.pop(context, true);
  }
}
