import 'package:app_passageiro/controllers/session_controller.dart';
import 'package:app_passageiro/core/error_handler/error_handler.dart';
import 'package:app_passageiro/models/passenger_profile.dart';
import 'package:app_passageiro/services/profile_service.dart';
import 'package:flutter/foundation.dart';

class ProfileController {
  ProfileController._();
  static final ProfileController instance = ProfileController._();

  final ValueNotifier<PassengerProfile?> profile = ValueNotifier(null);
  final ValueNotifier<bool> isLoading = ValueNotifier(false);

  bool _loadedOnce = false;

  Future<void> ensureLoaded() async {
    if (_loadedOnce) return;
    _loadedOnce = true;
    await loadProfile();
  }

  Future<void> loadProfile() async {
    if (isLoading.value) return;
    final token = SessionController.instance.accessToken.value;
    if (token == null || token.isEmpty) return;

    isLoading.value = true;
    try {
      final data = await ProfileService().getProfile(token: token);
      profile.value = data;
    } on UnauthorizedException {
      final refreshed = await SessionController.instance.refreshTokens();
      if (refreshed) {
        final newToken = SessionController.instance.accessToken.value;
        if (newToken != null && newToken.isNotEmpty) {
          final data = await ProfileService().getProfile(token: newToken);
          profile.value = data;
        }
      } else {
        await SessionController.instance.clear();
        ErrorHandler.instance.setErrorByType(
          type: AppErrorType.unknown,
          customMessage: 'Sessao expirada. Faca login novamente.',
        );
      }
    } catch (e) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.serverError,
        customMessage: 'Nao foi possivel carregar o perfil.',
        originalError: e,
      );
    } finally {
      isLoading.value = false;
    }
  }
}
