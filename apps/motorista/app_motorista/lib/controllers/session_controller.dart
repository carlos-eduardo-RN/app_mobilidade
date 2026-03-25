import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../services/token_storage.dart';

/// Dados decodificados do JWT
class JwtPayload {
  final String driverId;
  final String phone;
  final String role;
  final int expiresIn;
  final int expiresAt; // timestamp em segundos

  JwtPayload({
    required this.driverId,
    required this.phone,
    required this.role,
    required this.expiresIn,
    required this.expiresAt,
  });

  /// Verifica se o token expirou
  bool get isExpired {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return now >= expiresAt;
  }

  /// Tempo restante até expiração em milissegundos
  int get timeUntilExpiry {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final remaining = expiresAt - now;
    return (remaining * 1000).toInt();
  }
}

/// SessionController gerencia a autenticação JWT
/// Responsabilidades:
/// - Armazenar accessToken e refreshToken
/// - Decodificar JWT para extrair dados
/// - Detectar expiração de token
/// - Gerenciar refresh automático
class SessionController extends ChangeNotifier {
  static final SessionController instance = SessionController._internal();
  SessionController._internal();

  final TokenStorage _storage = TokenStorage();

  String? _accessToken;
  String? _refreshToken;
  String? _driverId;
  JwtPayload? _payload;

  bool get isAuthenticated => _accessToken != null && _payload != null && !_payload!.isExpired;

  String? get accessToken => isAuthenticated ? _accessToken : null;

  // Getter para refresh token (usado por AuthService)
  String? getRefreshToken() => _refreshToken;

  String? get driverId {
    final value = _driverId?.trim();
    if (value == null || value.isEmpty) {
      return null;
    }
    return value;
  }

  String? get phone => _payload?.phone;

  String? get role {
    final value = _payload?.role.trim();
    if (value == null || value.isEmpty) {
      return null;
    }
    return value.toUpperCase();
  }

  int? get tokenExpiresIn => _payload?.expiresIn;

  /// Inicializa o SessionController carregando tokens do storage
  Future<void> init() async {
    await _storage.init();
    _accessToken = _storage.getAccessToken();
    _refreshToken = _storage.getRefreshToken();
    _driverId = _storage.getDriverId();

    if (_accessToken != null) {
      try {
        _payload = _decodeToken(_accessToken!);
        _syncDriverIdFromPayload();
      } catch (e) {
        debugPrint('[SessionController] Erro ao decodificar token: $e');
        _accessToken = null;
        _refreshToken = null;
        _payload = null;
      }
    }

    notifyListeners();
  }

  /// Salva tokens após login/refresh bem-sucedido
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;

    try {
      _payload = _decodeToken(accessToken);
      _syncDriverIdFromPayload();
    } catch (e) {
      debugPrint('[SessionController] Erro ao decodificar token: $e');
      throw Exception('Token inválido: $e');
    }

    await _storage.saveAccessToken(accessToken);
    await _storage.saveRefreshToken(refreshToken);
    final currentDriverId = driverId;
    if (currentDriverId != null) {
      await _storage.saveDriverId(currentDriverId);
    }

    notifyListeners();
  }

  /// Atualiza apenas o accessToken (após refresh)
  Future<void> updateAccessToken(String newAccessToken) async {
    _accessToken = newAccessToken;

    try {
      _payload = _decodeToken(newAccessToken);
      _syncDriverIdFromPayload();
    } catch (e) {
      debugPrint('[SessionController] Erro ao decodificar token: $e');
      throw Exception('Token inválido: $e');
    }

    await _storage.saveAccessToken(newAccessToken);
    final currentDriverId = driverId;
    if (currentDriverId != null) {
      await _storage.saveDriverId(currentDriverId);
    }
    notifyListeners();
  }

  /// Salva o driverId autenticado
  Future<void> setDriverId(String driverId) async {
    final normalized = driverId.trim();
    if (normalized.isEmpty) {
      throw Exception('driverId invalido');
    }

    _driverId = normalized;
    await _storage.saveDriverId(normalized);
    notifyListeners();
  }

  /// Limpa sessao (logout)
  Future<void> logout() async {
    _accessToken = null;
    _refreshToken = null;
    _driverId = null;
    _payload = null;
    await _storage.clearTokens();
    notifyListeners();
  }

  /// Decodifica o payload do JWT (sem validar assinatura)
  /// JWT format: header.payload.signature
  static JwtPayload _decodeToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        throw Exception('Token format inválido');
      }

      // Decodifica o payload (segunda parte)
      final payload = parts[1];
      // Adiciona padding se necessário
      final padding = '=' * ((4 - payload.length % 4) % 4);
      final decoded = utf8.decode(base64Url.decode(payload + padding));
      final json = jsonDecode(decoded) as Map<String, dynamic>;

      final tokenDriverId =
          json['sub']?.toString() ??
          json['userId']?.toString() ??
          json['driverId']?.toString() ??
          json['id']?.toString() ??
          '';

      return JwtPayload(
        driverId: tokenDriverId,
        phone: json['phone']?.toString() ?? '',
        role: json['role']?.toString() ?? '',
        expiresIn: json['exp'] is int ? (json['exp'] as int) - (DateTime.now().millisecondsSinceEpoch ~/ 1000) : 0,
        expiresAt: json['exp'] as int? ?? 0,
      );
    } catch (e) {
      throw Exception('Erro ao decodificar JWT: $e');
    }
  }

  void _syncDriverIdFromPayload() {
    final payloadDriverId = _payload?.driverId.trim();
    if (payloadDriverId != null && payloadDriverId.isNotEmpty) {
      _driverId = payloadDriverId;
    }
  }
}
