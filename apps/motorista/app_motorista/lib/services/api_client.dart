import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../controllers/session_controller.dart';

/// Função de callback para fazer refresh de token
typedef RefreshTokenCallback = Future<bool> Function();

/// ApiClient é responsável por todas as requisições HTTP autenticadas
///
/// Características:
/// - Injeta Authorization: Bearer <token> automaticamente
/// - Intercepta 401 e tenta refresh de token usando callback
/// - Repete requisição após refresh bem-sucedido
/// - Logout automático se refresh falhar
///
/// Não faz login/registro (veja AuthService)
class ApiClient {
  ApiClient({
    SessionController? sessionController,
    RefreshTokenCallback? onRefreshToken,
  }) : _sessionController = sessionController ?? SessionController.instance,
       _onRefreshToken = onRefreshToken;

  final SessionController _sessionController;
  final RefreshTokenCallback? _onRefreshToken;

  String get baseUrl => ApiConfig.baseUrl;

  /// POST com autenticação por padrão
  Future<http.Response> post(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool authenticated = true,
  }) async {
    return _requestWithRefresh(
      () => _post(
        path,
        headers: headers,
        body: body,
        authenticated: authenticated,
      ),
    );
  }

  /// GET com autenticação por padrão
  Future<http.Response> get(
    String path, {
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    return _requestWithRefresh(
      () => _get(path, headers: headers, authenticated: authenticated),
    );
  }

  /// PUT com autenticação por padrão
  Future<http.Response> put(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool authenticated = true,
  }) async {
    return _requestWithRefresh(
      () => _put(
        path,
        headers: headers,
        body: body,
        authenticated: authenticated,
      ),
    );
  }

  /// DELETE com autenticação por padrão
  Future<http.Response> delete(
    String path, {
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    return _requestWithRefresh(
      () => _delete(path, headers: headers, authenticated: authenticated),
    );
  }

  /// Faz requisição com interceptação de 401 e refresh automático
  Future<http.Response> _requestWithRefresh(
    Future<http.Response> Function() request,
  ) async {
    try {
      final response = await request().timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw TimeoutException('Requisição excedeu timeout'),
      );

      // Se não é 401, retorna normalmente
      if (response.statusCode != 401) {
        return response;
      }

      // Se é 401 e temos callback, tenta refresh
      if (_onRefreshToken != null) {
        debugPrint('[ApiClient] Recebido 401, tentando refresh...');
        final refreshed = await _onRefreshToken();

        // Se refresh falhou, retorna o 401
        if (!refreshed) {
          debugPrint('[ApiClient] Refresh falhou, retornando 401');
          return response;
        }

        // Se refresh sucesso, repete requisição
        debugPrint('[ApiClient] Refresh sucesso, repetindo requisição');
        return await request().timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Requisição excedeu timeout'),
        );
      }

      // Sem callback, retorna 401
      return response;
    } on SocketException catch (e) {
      debugPrint('[ApiClient] Erro de rede: $e');
      rethrow;
    } on FormatException catch (e) {
      debugPrint('[ApiClient] Erro ao processar resposta: $e');
      rethrow;
    } catch (e) {
      debugPrint('[ApiClient] Erro na requisição: $e');
      rethrow;
    }
  }

  /// POST interno sem interceptação
  Future<http.Response> _post(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool authenticated = true,
  }) async {
    final mergedHeaders = await _buildHeaders(
      baseHeaders: headers,
      authenticated: authenticated,
    );
    ApiConfig.logRequest(path);

    return http.post(
      ApiConfig.buildUri(path),
      headers: mergedHeaders,
      body: body == null ? null : jsonEncode(body),
    );
  }

  /// GET interno sem interceptação
  Future<http.Response> _get(
    String path, {
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final mergedHeaders = await _buildHeaders(
      baseHeaders: headers,
      authenticated: authenticated,
    );
    ApiConfig.logRequest(path);

    return http.get(ApiConfig.buildUri(path), headers: mergedHeaders);
  }

  /// PUT interno sem interceptação
  Future<http.Response> _put(
    String path, {
    Map<String, String>? headers,
    Object? body,
    bool authenticated = true,
  }) async {
    final mergedHeaders = await _buildHeaders(
      baseHeaders: headers,
      authenticated: authenticated,
    );
    ApiConfig.logRequest(path);

    return http.put(
      ApiConfig.buildUri(path),
      headers: mergedHeaders,
      body: body == null ? null : jsonEncode(body),
    );
  }

  /// DELETE interno sem interceptação
  Future<http.Response> _delete(
    String path, {
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final mergedHeaders = await _buildHeaders(
      baseHeaders: headers,
      authenticated: authenticated,
    );
    ApiConfig.logRequest(path);

    return http.delete(ApiConfig.buildUri(path), headers: mergedHeaders);
  }

  /// Constrói headers com Authorization Bearer se autenticado
  Future<Map<String, String>> _buildHeaders({
    Map<String, String>? baseHeaders,
    required bool authenticated,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      ...?baseHeaders,
    };

    if (authenticated) {
      final token = _sessionController.accessToken;
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  Future<void> testConnection() async {
    try {
      ApiConfig.logRequest('/health');
      final response = await http.get(ApiConfig.buildUri('/health'));
      print('API OK: ${response.statusCode}');
    } catch (e) {
      print('API ERROR: $e');
    }
  }
}

class TimeoutException implements Exception {
  final String message;
  TimeoutException(this.message);

  @override
  String toString() => message;
}
