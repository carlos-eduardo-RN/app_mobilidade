import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const String _accessTokenKey = 'driver_access_token';
  static const String _refreshTokenKey = 'driver_refresh_token';
  static const String _driverIdKey = 'driver_id';
  // Mantém compatibilidade com código anterior
  static const String _tokenKey = 'driver_auth_token';

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Salva accessToken
  Future<void> saveAccessToken(String token) async {
    await _prefs?.setString(_accessTokenKey, token);
  }

  /// Salva refreshToken
  Future<void> saveRefreshToken(String token) async {
    await _prefs?.setString(_refreshTokenKey, token);
  }

  /// Recupera accessToken
  String? getAccessToken() {
    return _prefs?.getString(_accessTokenKey);
  }

  /// Recupera refreshToken
  String? getRefreshToken() {
    return _prefs?.getString(_refreshTokenKey);
  }

  Future<void> saveDriverId(String driverId) async {
    await _prefs?.setString(_driverIdKey, driverId);
  }

  String? getDriverId() {
    return _prefs?.getString(_driverIdKey);
  }

  /// Compatibilidade com código anterior
  Future<void> saveToken(String token) async {
    await saveAccessToken(token);
  }

  /// Compatibilidade com código anterior
  String? getToken() {
    return getAccessToken();
  }

  /// Limpa ambos os tokens
  Future<void> clearTokens() async {
    await _prefs?.remove(_accessTokenKey);
    await _prefs?.remove(_refreshTokenKey);
    await _prefs?.remove(_driverIdKey);
    await _prefs?.remove(_tokenKey);
  }

  /// Compatibilidade com código anterior
  Future<void> clearToken() async {
    await clearTokens();
  }
}
