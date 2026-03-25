import 'dart:async';
import 'dart:convert';

import 'package:app_passageiro/core/config/app_config.dart';
import 'package:app_passageiro/core/enums/connection_status.dart';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService {
    WebSocketService({String? baseUrl})
      : _baseUrl = baseUrl ?? AppConfig.wsBaseUrl;

  final String _baseUrl;
  final StreamController<Map<String, dynamic>> _eventsController =
      StreamController.broadcast();

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  bool _manualClose = false;
  String? _token;

  final ValueNotifier<ConnectionStatus> connectionStatus =
      ValueNotifier(ConnectionStatus.disconnected);

  Stream<Map<String, dynamic>> get events => _eventsController.stream;

  void connect({required String token}) {
    if (connectionStatus.value == ConnectionStatus.connected ||
        connectionStatus.value == ConnectionStatus.connecting) {
      return;
    }

    _token = token;
    _manualClose = false;
    connectionStatus.value = _reconnectAttempts > 0
        ? ConnectionStatus.reconnecting
        : ConnectionStatus.connecting;

    final uri = Uri.parse('$_baseUrl?token=$token');
    _channel = WebSocketChannel.connect(uri);
    _subscription = _channel!.stream.listen(
      (data) {
        final decoded = _decodeEvent(data);
        if (decoded != null) {
          _eventsController.add(decoded);
        }
      },
      onDone: _scheduleReconnect,
      onError: (_) => _scheduleReconnect(),
      cancelOnError: true,
    );

    connectionStatus.value = ConnectionStatus.connected;
    _reconnectAttempts = 0;
  }

  void disconnect() {
    _manualClose = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    connectionStatus.value = ConnectionStatus.disconnected;
  }

  void send(Map<String, dynamic> payload) {
    if (_channel == null) return;
    _channel!.sink.add(jsonEncode(payload));
  }

  Map<String, dynamic>? _decodeEvent(dynamic data) {
    try {
      if (data is! String) return null;
      final decoded = jsonDecode(data);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  void _scheduleReconnect() {
    if (_manualClose) {
      connectionStatus.value = ConnectionStatus.disconnected;
      return;
    }

    _reconnectAttempts += 1;
    connectionStatus.value = ConnectionStatus.reconnecting;
    _subscription?.cancel();

    final delaySeconds = _reconnectAttempts.clamp(1, 6);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      if (_token != null) {
        connect(token: _token!);
      }
    });
  }

  void dispose() {
    disconnect();
    _eventsController.close();
  }
}
