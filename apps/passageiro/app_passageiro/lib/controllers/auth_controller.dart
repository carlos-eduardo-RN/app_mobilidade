import 'package:app_passageiro/controllers/session_controller.dart';
import 'package:app_passageiro/core/error_handler/error_handler.dart';
import 'package:app_passageiro/services/auth_service.dart';
import 'package:flutter/foundation.dart';

class AuthResult {
  final bool success;
  final String? message;

  const AuthResult._(this.success, this.message);

  const AuthResult.success() : this._(true, null);

  const AuthResult.failure(String message) : this._(false, message);
}

class AuthController {
  AuthController._();
  static final AuthController instance = AuthController._();

  final AuthService _authService = AuthService();
  final ValueNotifier<bool> isLoading = ValueNotifier(false);

  Future<AuthResult> login({
    required String phone,
    required String password,
  }) async {
    if (isLoading.value) {
      return const AuthResult.failure('Aguarde a requisicao atual.');
    }
    isLoading.value = true;

    try {
      final tokens = await _authService.login(
        phone: phone,
        password: password,
      );
      await SessionController.instance.setTokens(
        access: tokens.accessToken,
        refresh: tokens.refreshToken,
      );
      return const AuthResult.success();
    } on AuthInvalidException {
      return const AuthResult.failure('Telefone ou senha invalidos.');
    } catch (e) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.serverError,
        customMessage: 'Nao foi possivel autenticar. Verifique seus dados.',
        originalError: e,
      );
      return const AuthResult.failure('Falha ao autenticar. Tente novamente.');
    } finally {
      isLoading.value = false;
    }
  }

  Future<AuthResult> register({
    required String phone,
    required String password,
  }) async {
    if (isLoading.value) {
      return const AuthResult.failure('Aguarde a requisicao atual.');
    }
    isLoading.value = true;

    try {
      final tokens = await _authService.register(
        phone: phone,
        password: password,
      );
      await SessionController.instance.setTokens(
        access: tokens.accessToken,
        refresh: tokens.refreshToken,
      );
      return const AuthResult.success();
    } on AuthInvalidException {
      return const AuthResult.failure('Telefone ou senha invalidos.');
    } catch (e) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.serverError,
        customMessage: 'Nao foi possivel criar sua conta. Tente novamente.',
        originalError: e,
      );
      return const AuthResult.failure('Falha ao criar conta.');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> logout() async {
    final refreshToken = SessionController.instance.refreshToken.value;
    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await _authService.logout(refreshToken: refreshToken);
      } catch (e) {
        debugPrint('Logout request failed: $e');
        // Logout best-effort
      }
    }

    await SessionController.instance.clear();
  }
}
