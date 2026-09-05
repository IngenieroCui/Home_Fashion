import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:home_fashion_workshop/features/workshop_jobs/presentation/workshop_jobs_page.dart';

import 'helpers/fakes.dart';

void main() {
  testWidgets('limpiar búsqueda cancela el debounce pendiente', (tester) async {
    final repository = FakeWorkshopJobsRepository();
    await tester.pumpWidget(
      MaterialApp(home: WorkshopJobsPageView(repository: repository)),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'sofá');
    await tester.pump();
    await tester.tap(find.byTooltip('Limpiar búsqueda'));
    await tester.pump(const Duration(milliseconds: 600));

    expect(repository.listCalls, 2);
    expect(repository.listQueries, ['', '']);
  });
}
