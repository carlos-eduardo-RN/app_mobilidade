// ignore_for_file: avoid_print

import 'package:flutter/foundation.dart';

import '../controllers/session_controller.dart';
import 'websocket_service.dart';

class RealtimeService {
  static final RealtimeService instance = RealtimeService._internal();

  RealtimeService._internal();

  final SessionController _sessionController = SessionController.instance;
  final WebSocketService _webSocketService = WebSocketService.instance;

  Stream<Map<String, dynamic>> get events => _webSocketService.events;
  bool get isConnected => _webSocketService.isConnected;

  Future<void> connectAsDriver(String token) async {
    final sessionToken = _sessionController.accessToken?.trim();
    final role = _sessionController.role?.toUpperCase();
    if (sessionToken == null || sessionToken.isEmpty) {
      throw Exception('Token nao disponivel para realtime');
    }

    if (role != 'DRIVER') {
      throw Exception('Usuario nao e motorista');
    }

    if (isConnected) {
      debugPrint('[RealtimeService] Driver ja conectado ao realtime');
      return;
    }

    if (sessionToken != token.trim()) {
      debugPrint(
        '[RealtimeService] Token informado difere da sessao; usando token da sessao',
      );
    }

    print('DRIVER ID: ${_sessionController.driverId}');
    print('TOKEN: $sessionToken');

    await _webSocketService.connect();
    debugPrint('[RealtimeService] Driver conectado ao realtime');
  }

  Future<void> disconnect() async {
    await _webSocketService.disconnect();
  }
}
