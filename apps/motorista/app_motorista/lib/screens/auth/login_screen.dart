import 'package:flutter/material.dart';

import '../../components/auth_button.dart';
import '../../components/auth_input.dart';
import '../../components/auth_layout.dart';
import '../../controllers/auth_controller.dart';
import '../../core/navigation/app_routes.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

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
      _showMessage('Informe telefone e senha');
      return;
    }

    final success = await AuthController.instance.login(
      phone: phone,
      password: password,
    );

    if (!success && mounted) {
      final message = AuthController.instance.errorMessage.value ??
          'Login invalido. Verifique seus dados.';
      _showMessage(message);
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AuthLayout(
      title: 'Entrar',
      subtitle: 'Use seu telefone e senha para continuar',
      children: [
        AuthInput(
          controller: _phoneController,
          label: 'Telefone',
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 16),
        AuthInput(
          controller: _passwordController,
          label: 'Senha',
          obscureText: true,
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 24),
        ValueListenableBuilder<bool>(
          valueListenable: AuthController.instance.isLoading,
          builder: (_, loading, __) {
            return AuthButton(
              label: loading ? 'Entrando' : 'Entrar',
              loading: loading,
              onPressed: _handleLogin,
            );
          },
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            Navigator.of(context).pushNamed(AppRoutes.register);
          },
          child: const Text('Criar conta'),
        ),
      ],
    );
  }
}
