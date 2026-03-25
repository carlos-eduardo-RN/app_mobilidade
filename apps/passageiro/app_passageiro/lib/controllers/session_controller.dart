import 'package:app_passageiro/services/auth_service.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionController {
  SessionController._();
  static final SessionController instance = SessionController._();

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  // Credenciais de teste para demonstração automática
  static const String _testPhone = '11987654321';
  static const String _testPassword = '12345678';

  final ValueNotifier<String?> accessToken = ValueNotifier(null);
  final ValueNotifier<String?> refreshToken = ValueNotifier(null);

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    accessToken.value = prefs.getString(_accessTokenKey);
    refreshToken.value = prefs.getString(_refreshTokenKey);

    // Se não há tokens salvos, tenta fazer login com credenciais de teste
    if (!isAuthenticated) {
      await _tryAutoLoginWithTestCredentials();
    }
  }

  /// Tenta fazer login automático com credenciais de teste
  Future<void> _tryAutoLoginWithTestCredentials() async {
    try {
      final tokens = await AuthService().login(
        phone: _testPhone,
        password: _testPassword,
      );
      await setTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
    } catch (e) {
      // Se falhar, apenas continua - usuário irá para tela de login
      debugPrint('Auto-login failed: $e');
    }
  }

  bool get isAuthenticated =>
      accessToken.value != null && accessToken.value!.isNotEmpty;

  Future<void> setTokens({required String access, required String refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, access);
    await prefs.setString(_refreshTokenKey, refresh);
    accessToken.value = access;
    refreshToken.value = refresh;
  }

  Future<bool> refreshTokens() async {
    final token = refreshToken.value;
    if (token == null || token.isEmpty) return false;

    try {
      final tokens = await AuthService().refresh(refreshToken: token);
      await setTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
      return true;
    } catch (e) {
      debugPrint('Refresh token failed: $e');
      return false;
    }
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
    accessToken.value = null;
    refreshToken.value = null;
  }
}
