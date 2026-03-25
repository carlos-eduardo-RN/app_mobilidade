import 'dart:convert';

import 'package:app_passageiro/core/config/app_config.dart';
import 'package:http/http.dart' as http;

class AuthTokens {
  final String accessToken;
  final String refreshToken;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
  });
}

class AuthService {
  AuthService({String? baseUrl})
      : _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final String _baseUrl;

  Future<AuthTokens> login({
    required String phone,
    required String password,
  }) async {
    final uri = Uri.parse('$_baseUrl/auth/login');
    print('AuthService login URL: $uri');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phone': phone,
        'password': password,
      }),
    );
    print('HTTP response status: ${response.statusCode}');
    print('HTTP response body: ${response.body}');

    if (response.statusCode == 400 ||
        response.statusCode == 401 ||
        response.statusCode == 403) {
      throw AuthInvalidException();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'AuthService: HTTP ${response.statusCode} - ${response.body}',
      );
    }

    return _parseTokens(response.body);
  }

  Future<AuthTokens> register({
    required String phone,
    required String password,
  }) async {
    final uri = Uri.parse('$_baseUrl/auth/register');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phone': phone,
        'password': password,
      }),
    );

    if (response.statusCode == 400 ||
        response.statusCode == 401 ||
        response.statusCode == 403) {
      throw AuthInvalidException();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'AuthService: HTTP ${response.statusCode} - ${response.body}',
      );
    }

    return _parseTokens(response.body);
  }

  Future<AuthTokens> refresh({required String refreshToken}) async {
    final uri = Uri.parse('$_baseUrl/passenger/refresh');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'AuthService: HTTP ${response.statusCode} - ${response.body}',
      );
    }

    return _parseTokens(response.body);
  }

  Future<void> logout({required String refreshToken}) async {
    final uri = Uri.parse('$_baseUrl/passenger/logout');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'AuthService: HTTP ${response.statusCode} - ${response.body}',
      );
    }
  }

  AuthTokens _parseTokens(String body) {
    final json = jsonDecode(body) as Map<String, dynamic>;
    final access = json['accessToken'] as String?;
    final refresh = json['refreshToken'] as String?;
    if (access == null || access.isEmpty || refresh == null || refresh.isEmpty) {
      throw Exception('AuthService: tokens ausentes na resposta');
    }

    return AuthTokens(accessToken: access, refreshToken: refresh);
  }
}

class AuthInvalidException implements Exception {
  @override
  String toString() => 'AuthInvalidException';
}
