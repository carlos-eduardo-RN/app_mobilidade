// ignore_for_file: avoid_print

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../controllers/session_controller.dart';
import '../models/auth_response.dart';

/// AuthService is responsible only for authentication.
class AuthService {
  AuthService({SessionController? sessionController})
    : _sessionController = sessionController ?? SessionController.instance;

  final SessionController _sessionController;

  static const String _loginPath = '/api/auth/driver/login';
  static const String _registerPath = '/api/auth/register';
  static const String _driverRole = 'DRIVER';

  /// Login with phone and password.
  Future<AuthResponse> login({
    required String phone,
    required String password,
  }) async {
    try {
      debugPrint('[AuthService] Tentando login com telefone: $phone');
      ApiConfig.logRequest(_loginPath);

      final response = await http
          .post(
            ApiConfig.buildUri(_loginPath),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'phone': phone,
              'password': password,
              'role': _driverRole,
            }),
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () => throw TimeoutException('Login timeout'),
          );

      print('LOGIN RESPONSE STATUS: ${response.statusCode}');
      print('LOGIN RESPONSE BODY: ${response.body}');

      if (response.statusCode != 200) {
        print('LOGIN ERROR BODY: ${response.body}');
        throw Exception('Erro no login: ${response.body}');
      }

      final data = _decodeJsonBody(response.body);
      final success = data['success'];
      if (success is bool && !success) {
        final message = data['message']?.toString() ?? 'Falha no login';
        throw Exception(message);
      }

      final authResponse = AuthResponse.fromJson(data);
      final refreshToken = _extractRefreshToken(data);

      print('LOGIN TOKEN FIELD: ${authResponse.tokenField}');
      print('LOGIN USER FIELD: ${authResponse.userField}');

      await _sessionController.saveTokens(
        accessToken: authResponse.token,
        refreshToken: refreshToken ?? '',
      );

      debugPrint(
        '[AuthService] Login bem-sucedido para: ${_sessionController.driverId}',
      );
      return authResponse;
    } on TimeoutException catch (e) {
      debugPrint('[AuthService] Timeout: $e');
      rethrow;
    } catch (e) {
      debugPrint('[AuthService] Erro no login: $e');
      rethrow;
    }
  }

  /// Driver registration.
  Future<String> register({
    required String phone,
    required String password,
    String? name,
  }) async {
    try {
      debugPrint('[AuthService] Tentando registro com telefone: $phone');
      ApiConfig.logRequest(_registerPath);

      final response = await http
          .post(
            ApiConfig.buildUri(_registerPath),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'phone': phone,
              'password': password,
              'name': name,
              'role': _driverRole,
            }),
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () => throw TimeoutException('Register timeout'),
          );

      if (response.statusCode != 200 && response.statusCode != 201) {
        final message = _extractErrorMessage(response);
        throw Exception('Registro falhou: $message');
      }

      final json = _decodeJsonBody(response.body);
      final success = json['success'] == true;
      if (!success) {
        final message = json['message']?.toString() ?? 'Falha no registro';
        throw Exception(message);
      }

      final accessToken = json['accessToken']?.toString() ?? '';
      final refreshToken = json['refreshToken']?.toString() ?? '';

      if (accessToken.isEmpty || refreshToken.isEmpty) {
        throw Exception('Tokens nao retornados pelo servidor');
      }

      await _sessionController.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );

      debugPrint(
        '[AuthService] Registro bem-sucedido para: ${_sessionController.driverId}',
      );
      return accessToken;
    } on TimeoutException catch (e) {
      debugPrint('[AuthService] Timeout: $e');
      rethrow;
    } catch (e) {
      debugPrint('[AuthService] Erro no registro: $e');
      rethrow;
    }
  }

  /// Refreshes the access token.
  Future<bool> refreshAccessToken() async {
    final refreshToken = _sessionController.getRefreshToken();

    if (refreshToken == null || refreshToken.isEmpty) {
      debugPrint('[AuthService] Refresh token nao disponivel');
      return false;
    }

    try {
      debugPrint('[AuthService] Tentando refresh de token');
      ApiConfig.logRequest('/auth/refresh');

      final response = await http
          .post(
            ApiConfig.buildUri('/auth/refresh'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $refreshToken',
            },
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () => throw TimeoutException('Refresh timeout'),
          );

      if (response.statusCode != 200) {
        debugPrint(
          '[AuthService] Refresh falhou com status ${response.statusCode}',
        );
        await _sessionController.logout();
        return false;
      }

      final json = _decodeJsonBody(response.body);
      final newAccessToken = json['accessToken']?.toString();

      if (newAccessToken == null || newAccessToken.isEmpty) {
        throw Exception('Novo access token nao retornado');
      }

      await _sessionController.updateAccessToken(newAccessToken);
      debugPrint('[AuthService] Token refreshado com sucesso');
      return true;
    } catch (e) {
      debugPrint('[AuthService] Erro ao fazer refresh: $e');
      await _sessionController.logout();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _sessionController.logout();
      debugPrint('[AuthService] Logout bem-sucedido');
    } catch (e) {
      debugPrint('[AuthService] Erro no logout: $e');
    }
  }

  Future<bool> validateToken() async {
    final token = _sessionController.accessToken;

    if (token == null) {
      return false;
    }

    try {
      ApiConfig.logRequest('/api/driver/me');
      final response = await http
          .get(
            ApiConfig.buildUri('/api/driver/me'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(
            const Duration(seconds: 5),
            onTimeout: () => throw TimeoutException('Validation timeout'),
          );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[AuthService] Erro ao validar token: $e');
      return false;
    }
  }

  String _extractErrorMessage(http.Response response) {
    final body = response.body.trim();
    if (body.isEmpty) {
      return 'Erro desconhecido';
    }

    try {
      final json = _decodeJsonBody(body);
      return json['message']?.toString() ?? json['error']?.toString() ?? body;
    } catch (_) {
      return body;
    }
  }

  Map<String, dynamic> _decodeJsonBody(String body) {
    final decoded = jsonDecode(body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }
    throw const FormatException('Resposta do servidor em formato invalido');
  }

  String? _extractRefreshToken(Map<String, dynamic> data) {
    final direct = data['refreshToken']?.toString();
    if (direct != null && direct.isNotEmpty) {
      return direct;
    }

    final tokens = data['tokens'];
    if (tokens is Map) {
      final nested = tokens['refreshToken']?.toString();
      if (nested != null && nested.isNotEmpty) {
        return nested;
      }
    }

    return null;
  }
}

class TimeoutException implements Exception {
  final String message;

  TimeoutException(this.message);

  @override
  String toString() => message;
}
