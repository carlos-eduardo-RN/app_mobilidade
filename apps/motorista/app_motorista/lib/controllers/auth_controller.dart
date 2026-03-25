// ignore_for_file: avoid_print

import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/realtime_service.dart';
import '../services/token_storage.dart';
import 'driver_controller.dart';
import 'session_controller.dart';

class AuthController extends ChangeNotifier {
  static final AuthController instance = AuthController._internal();

  AuthController._internal();

  final AuthService _service = AuthService();
  final TokenStorage _storage = TokenStorage();

  final ValueNotifier<bool> isInitializing = ValueNotifier(true);
  final ValueNotifier<bool> isLoading = ValueNotifier(false);
  final ValueNotifier<String?> errorMessage = ValueNotifier(null);
  final ValueNotifier<String?> token = ValueNotifier(null);

  static const String _driverRole = 'DRIVER';

  Future<void> init() async {
    isInitializing.value = true;

    try {
      await _storage.init();
      await SessionController.instance.init();

      final storedToken = _storage.getToken();
      token.value = storedToken != null && storedToken.isNotEmpty
          ? storedToken
          : null;

      if (token.value != null && token.value!.isNotEmpty) {
        if (!_hasDriverRole()) {
          print('TOKEN ROLE: ${SessionController.instance.role?.toUpperCase()}');
          await _clearLocalSession();
          return;
        }

        final valid = await _service.validateToken();

        if (!valid) {
          await logout();
        }
      }
    } finally {
      isInitializing.value = false;
    }
  }

  Future<bool> login({required String phone, required String password}) async {
    try {
      isLoading.value = true;
      errorMessage.value = null;

      final authResponse = await _service.login(
        phone: phone,
        password: password,
      );

      await _storage.saveToken(authResponse.token);
      token.value = authResponse.token;
      await _ensureDriverRole();

      final driverId = _extractDriverId(authResponse.user);
      if (driverId == null) {
        throw Exception('ID do motorista nao retornado no login');
      }

      await DriverController.instance.setDriverId(driverId);

      print('DRIVER ID: ${SessionController.instance.driverId}');
      print('TOKEN: ${token.value}');

      await DriverController.instance.goOnline();
      await RealtimeService.instance.connectAsDriver(authResponse.token);

      return true;
    } catch (e) {
      errorMessage.value = "Erro ao fazer login: ${e.toString()}";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> register({required String phone, required String password}) async {
    try {
      isLoading.value = true;
      errorMessage.value = null;

      final authToken = await _service.register(
        phone: phone,
        password: password,
      );

      await _storage.saveToken(authToken);
      token.value = authToken;
      await _ensureDriverRole();
      await DriverController.instance.goOnline();
      return true;
    } catch (e) {
      errorMessage.value = "Erro ao criar conta";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> logout() async {
    await DriverController.instance.goOffline();
    token.value = null;
    await _storage.clearToken();
    await SessionController.instance.logout();
  }

  bool get isAuthenticated => token.value != null && token.value!.isNotEmpty;

  Future<void> _ensureDriverRole() async {
    final decodedRole = SessionController.instance.role?.toUpperCase();
    print('TOKEN ROLE: $decodedRole');
    if (!_hasDriverRole()) {
      await _clearLocalSession();
      throw Exception('Usuario nao e motorista');
    }
  }

  bool _hasDriverRole() {
    final decodedRole = SessionController.instance.role?.toUpperCase();
    return decodedRole == _driverRole;
  }

  Future<void> _clearLocalSession() async {
    token.value = null;
    await _storage.clearToken();
    await SessionController.instance.logout();
  }

  String? _extractDriverId(Map<String, dynamic> user) {
    final candidates = [user['id'], user['_id'], user['driverId']];
    for (final candidate in candidates) {
      final value = candidate?.toString().trim();
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }
    return null;
  }
}
