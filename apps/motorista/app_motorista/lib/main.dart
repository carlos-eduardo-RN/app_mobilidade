import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'controllers/auth_controller.dart';
import 'core/navigation/app_routes.dart';
import 'helpers/local_storage.dart';
import 'widgets/auth_gate.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStorage().init();
  unawaited(AuthController.instance.init());

  FlutterError.onError = (details) {
    debugPrintStack(
      stackTrace: details.stack,
      label: '[FLUTTER ERROR] ${details.exception}',
    );
  };

  if (kDebugMode) {
    debugPrint('App do Motorista iniciando (Debug)');
  }

  runApp(const AppMotoristaApp());
}

class AppMotoristaApp extends StatelessWidget {
  const AppMotoristaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Motorista - VouDeMoto',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF7931E),
          brightness: Brightness.dark,
        ),
      ),
      onGenerateRoute: AppRoutes.onGenerateRoute,
      home: const AuthGate(),
    );
  }
}
