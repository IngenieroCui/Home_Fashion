import 'package:flutter/widgets.dart';

import 'app/app.dart';
import 'app/bootstrap.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final dependencies = AppDependencies.create();
  runApp(HomeFashionWorkshopApp(dependencies: dependencies));
}
