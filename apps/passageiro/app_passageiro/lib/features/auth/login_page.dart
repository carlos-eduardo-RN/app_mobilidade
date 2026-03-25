import 'package:flutter/material.dart';

import 'package:app_passageiro/controllers/auth_controller.dart';
import 'package:app_passageiro/controllers/session_controller.dart';
import 'package:app_passageiro/core/navigation/app_routes.dart';
import 'package:app_passageiro/core/theme/app_colors.dart';
import 'package:app_passageiro/widgets/auth_text_field.dart';
import 'package:app_passageiro/widgets/primary_button.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await SessionController.instance.init();
    if (!mounted) return;
    if (SessionController.instance.isAuthenticated) {
      Navigator.of(context).pushReplacementNamed(AppRoutes.home);
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final phone = _phoneController.text.trim();
    final password = _passwordController.text.trim();

    if (phone.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Informe telefone e senha')),
      );
      return;
    }

    final result = await AuthController.instance.login(
      phone: phone,
      password: password,
    );

    if (result.success && mounted) {
      Navigator.of(context).pushReplacementNamed(AppRoutes.home);
      return;
    }

    if (!result.success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message ?? 'Falha ao entrar.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              const Text(
                'Entrar',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Acesse sua conta com telefone e senha',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 32),
              AuthTextField(
                controller: _phoneController,
                label: 'Telefone',
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _passwordController,
                label: 'Senha',
                obscureText: true,
                keyboardType: TextInputType.visiblePassword,
                textInputAction: TextInputAction.done,
              ),
              const SizedBox(height: 24),
              ValueListenableBuilder<bool>(
                valueListenable: AuthController.instance.isLoading,
                builder: (_, loading, __) {
                  return PrimaryButton(
                    label: 'Entrar',
                    isLoading: loading,
                    onPressed: _handleLogin,
                  );
                },
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pushNamed(AppRoutes.register);
                },
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.textSecondary,
                ),
                child: const Text('Criar conta'),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
