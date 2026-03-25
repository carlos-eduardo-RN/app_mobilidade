import 'dart:async';

import 'package:app_passageiro/core/enums/connection_status.dart';
import 'package:app_passageiro/services/websocket_service.dart';
import 'package:flutter/foundation.dart';

class RealtimeController {
  RealtimeController({WebSocketService? service})
      : _service = service ?? WebSocketService();

  final WebSocketService _service;
  StreamSubscription? _subscription;
  bool _listeningToStatus = false;

  final ValueNotifier<ConnectionStatus> connectionStatus =
      ValueNotifier(ConnectionStatus.disconnected);

  void connect({required String token, required void Function(Map<String, dynamic>) onEvent}) {
    connectionStatus.value = ConnectionStatus.connecting;
    _service.connect(token: token);

    _subscription?.cancel();
    _subscription = _service.events.listen(onEvent);

    if (!_listeningToStatus) {
      _service.connectionStatus.addListener(() {
        connectionStatus.value = _service.connectionStatus.value;
      });
      _listeningToStatus = true;
    }
  }

  void disconnect() {
    _subscription?.cancel();
    _service.disconnect();
    connectionStatus.value = ConnectionStatus.disconnected;
  }

  void send(Map<String, dynamic> payload) {
    _service.send(payload);
  }

  void dispose() {
    _subscription?.cancel();
    _service.dispose();
  }
}
