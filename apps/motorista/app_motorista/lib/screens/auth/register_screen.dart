import 'package:flutter/material.dart';

import '../../components/auth_button.dart';
import '../../components/auth_input.dart';
import '../../components/auth_layout.dart';
import '../../controllers/auth_controller.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    final phone = _phoneController.text.trim();
    final password = _passwordController.text.trim();

    if (phone.isEmpty || password.isEmpty) {
      _showMessage('Informe telefone e senha');
      return;
    }

    if (!RegExp(r'^[0-9]{6,}$').hasMatch(password)) {
      _showMessage('A senha deve conter pelo menos 6 numeros');
      return;
    }

    final success = await AuthController.instance.register(
      phone: phone,
      password: password,
    );

    if (!success && mounted) {
      final message = AuthController.instance.errorMessage.value ??
          'Nao foi possivel criar a conta.';
      _showMessage(message);
      return;
    }

    if (success && mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
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
      title: 'Criar conta',
      subtitle: 'Cadastre seu telefone e senha para continuar',
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
              label: loading ? 'Criando conta' : 'Criar conta',
              loading: loading,
              onPressed: _handleRegister,
            );
          },
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            Navigator.of(context).popUntil((route) => route.isFirst);
          },
          child: const Text('Ja tenho conta'),
        ),
      ],
    );
  }
}
