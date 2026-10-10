import 'workshop_product_image.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/state_views.dart';
import '../../auth/logic/session_cubit.dart';
import '../data/workshop_jobs_repository.dart';
import '../domain/workshop_job.dart';
import '../logic/workshop_jobs_cubit.dart';
import 'workshop_labels.dart';

class WorkshopJobsPageView extends StatelessWidget {
  const WorkshopJobsPageView({required this.repository, super.key});

  final WorkshopJobsRepository repository;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => WorkshopJobsCubit(repository: repository)..load(),
      child: const _WorkshopJobsView(),
    );
  }
}

class _WorkshopJobsView extends StatefulWidget {
  const _WorkshopJobsView();

  @override
  State<_WorkshopJobsView> createState() => _WorkshopJobsViewState();
}

class _WorkshopJobsViewState extends State<_WorkshopJobsView> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis trabajos'),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () => _confirmLogout(context),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            BlocBuilder<WorkshopJobsCubit, WorkshopJobsState>(
              builder: (context, state) => _WorkspaceHeader(state: state),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
              child: TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  labelText: 'Buscar trabajo, pedido o producto',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Limpiar búsqueda',
                          onPressed: () {
                            _debounce?.cancel();
                            _searchController.clear();
                            setState(() {});
                            context.read<WorkshopJobsCubit>().search('');
                          },
                          icon: const Icon(Icons.close),
                        ),
                ),
                onChanged: (value) {
                  setState(() {});
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 450), () {
                    if (mounted) {
                      context.read<WorkshopJobsCubit>().search(value);
                    }
                  });
                },
              ),
            ),
            SizedBox(
              height: MediaQuery.textScalerOf(context).scale(36) + 20,
              child: BlocBuilder<WorkshopJobsCubit, WorkshopJobsState>(
                buildWhen: (previous, current) =>
                    previous.filter != current.filter,
                builder: (context, state) => ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  children: [
                    _FilterChip(
                      label: 'Todos',
                      selected: state.filter == null,
                      onSelected: () =>
                          context.read<WorkshopJobsCubit>().setFilter(null),
                    ),
                    for (final status in WorkshopJobStatus.values)
                      _FilterChip(
                        label: jobStatusLabel(status),
                        selected: state.filter == status,
                        onSelected: () =>
                            context.read<WorkshopJobsCubit>().setFilter(status),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 6),
            Expanded(
              child: BlocBuilder<WorkshopJobsCubit, WorkshopJobsState>(
                builder: (context, state) => _body(context, state),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body(BuildContext context, WorkshopJobsState state) {
    if (state.status == WorkshopJobsLoadStatus.loading && state.items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                  state.isSlow
                      ? 'La conexión está tardando. Seguimos intentando…'
                      : 'Cargando tus trabajos…',
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }
    if (state.status == WorkshopJobsLoadStatus.failure && state.items.isEmpty) {
      return ErrorStateView(
        message: state.error?.message ?? 'No fue posible cargar tus trabajos.',
        onRetry: context.read<WorkshopJobsCubit>().load,
      );
    }
    if (state.items.isEmpty) {
      final filtered = state.query.trim().isNotEmpty || state.filter != null;
      return EmptyStateView(
        title: filtered ? 'No encontramos resultados' : 'No tienes trabajos',
        message: filtered
            ? 'Prueba otra búsqueda o cambia el filtro.'
            : 'Los trabajos asignados por Home Fashion aparecerán aquí.',
        icon: Icons.handyman_outlined,
      );
    }
    return RefreshIndicator(
      onRefresh: () => context.read<WorkshopJobsCubit>().load(refresh: true),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        itemCount: state.items.length + 1,
        itemBuilder: (context, index) {
          if (index == state.items.length) return _loadMore(context, state);
          return _JobCard(job: state.items[index]);
        },
      ),
    );
  }

  Widget _loadMore(BuildContext context, WorkshopJobsState state) {
    if (state.isLoadingMore) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (state.loadMoreError != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: OutlinedButton.icon(
          onPressed: context.read<WorkshopJobsCubit>().loadMore,
          icon: const Icon(Icons.refresh),
          label: const Text('Reintentar cargar más'),
        ),
      );
    }
    if (!state.canLoadMore) return const SizedBox(height: 8);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: OutlinedButton(
        onPressed: context.read<WorkshopJobsCubit>().loadMore,
        child: const Text('Cargar más'),
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('¿Cerrar sesión?'),
        content: const Text('Tendrás que ingresar nuevamente.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (accepted == true && context.mounted) {
      await context.read<SessionCubit>().logout();
    }
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: FilterChip(
          label: Text(label),
          selected: selected,
          onSelected: (_) => onSelected(),
        ),
      );
}

class _WorkspaceHeader extends StatelessWidget {
  const _WorkspaceHeader({required this.state});
  final WorkshopJobsState state;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<SessionCubit>().state.user;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF3D352C),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
            user == null
                ? 'Tu espacio de trabajo'
                : 'Hola, ${user.fullName.split(' ').first}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: const Color(0xFFFFF8EA), fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text('Consulta tus asignaciones y reporta cada avance.',
            style: TextStyle(color: Color(0xFFE4D9C9))),
        if (state.status == WorkshopJobsLoadStatus.success) ...[
          const SizedBox(height: 14),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _CountPill(label: 'Por iniciar', count: state.summary.assigned),
            _CountPill(label: 'En proceso', count: state.summary.inProgress),
            _CountPill(
                label: 'En revisión', count: state.summary.readyForReview),
          ]),
          const SizedBox(height: 6),
          const Text('Resumen de todo tu taller',
              style: TextStyle(color: Color(0xFFC8BBAA), fontSize: 11)),
        ],
      ]),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.label, required this.count});
  final String label;
  final int count;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
            color: const Color(0xFF615649),
            borderRadius: BorderRadius.circular(20)),
        child: Text('$count $label',
            style: const TextStyle(
                color: Color(0xFFFFF8EA),
                fontSize: 12,
                fontWeight: FontWeight.w600)),
      );
}

class _JobCard extends StatelessWidget {
  const _JobCard({required this.job});

  final WorkshopJobSummary job;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: Theme.of(context).brightness == Brightness.light
          ? const Color(0xFFFFFDF8)
          : Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFFE4D8C9))),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          await context.push('/jobs/${job.id}');
          if (context.mounted) context.read<WorkshopJobsCubit>().load();
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  job.status == WorkshopJobStatus.assigned
                      ? 'PENDIENTE DE INICIO'
                      : job.status == WorkshopJobStatus.inProgress
                          ? 'EN FABRICACIÓN'
                          : 'FABRICACIÓN',
                  style: const TextStyle(
                      color: Color(0xFF65733D),
                      fontSize: 11,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                alignment: WrapAlignment.spaceBetween,
                children: [
                  Text(job.code,
                      style: Theme.of(context).textTheme.titleMedium),
                  StatusBadge(
                    label: jobStatusLabel(job.status),
                    color: primary,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              WorkshopProductImage(url: job.imageUrlSnapshot, height: 130),
              const SizedBox(height: 12),
              Text(job.productName,
                  style: Theme.of(context).textTheme.titleSmall),
              if (job.variantName != null) Text(job.variantName!),
              const SizedBox(height: 10),
              Text('Pedido ${job.orderCode} · Cantidad ${job.quantity}'),
              if (job.expectedCompletionDate != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Fecha esperada: ${shortDate(job.expectedCompletionDate!)}',
                ),
              ],
              if (job.latestReport != null) ...[
                const Divider(height: 24),
                Text(
                  'Último reporte: ${reportTypeLabel(job.latestReport!.type)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 14),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                Text('Ver trabajo',
                    style:
                        TextStyle(color: primary, fontWeight: FontWeight.w700)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward, size: 17, color: primary)
              ]),
            ],
          ),
        ),
      ),
    );
  }
}
