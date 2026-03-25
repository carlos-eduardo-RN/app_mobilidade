import 'package:flutter/material.dart';

import '../controllers/auth_controller.dart';
import '../screens/auth/login_screen.dart';
import '../screens/home/home_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AuthController.instance.isInitializing,
      builder: (_, isInitializing, __) {
        if (isInitializing) {
          return const _AuthSplash();
        }

        return ValueListenableBuilder<String?>(
          valueListenable: AuthController.instance.token,
          builder: (_, token, __) {
            if (token == null || token.isEmpty) {
              return const LoginScreen();
            }

            return const HomeScreen();
          },
        );
      },
    );
  }
}

class _AuthSplash extends StatelessWidget {
  const _AuthSplash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
