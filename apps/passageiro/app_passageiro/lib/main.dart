import 'package:flutter/material.dart';
import 'core/navigation/app_routes.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VouDeMotoApp());
}

class VouDeMotoApp extends StatelessWidget {
  const VouDeMotoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'VouDeMoto',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF0E2A3B),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF7931E),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      initialRoute: AppRoutes.splash,
      onGenerateRoute: AppRoutes.onGenerateRoute,
    );
  }
}
