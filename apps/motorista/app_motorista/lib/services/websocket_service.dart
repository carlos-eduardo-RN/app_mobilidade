import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;

import '../config/api_config.dart';
import '../controllers/session_controller.dart';

enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  disconnecting,
  error,
}

/// WebSocketService gerencia a conexão WebSocket autenticada com o backend
///
/// Características:
/// - Autenticação via token usando a URL derivada de ApiConfig.wsBaseUrl
/// - Reconexão automática com backoff exponencial
/// - Reinscrição automática ao reconectar
/// - Stream de eventos para listener
/// - Controle de status de conexão
class WebSocketService {
  static final WebSocketService instance = WebSocketService._internal();
  WebSocketService._internal();

  final SessionController _sessionController = SessionController.instance;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _reconnectTimer;

  final _eventController = StreamController<Map<String, dynamic>>.broadcast();
  final ValueNotifier<ConnectionStatus> connectionStatus =
      ValueNotifier<ConnectionStatus>(ConnectionStatus.disconnected);

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  bool get isConnected => connectionStatus.value == ConnectionStatus.connected;

  static const int _maxReconnectAttempts = 10;
  static const Duration _initialReconnectDelay = Duration(seconds: 1);

  int _reconnectAttempts = 0;

  /// Inicia a conexão WebSocket
  Future<void> connect() async {
    if (isConnected || connectionStatus.value == ConnectionStatus.connecting) {
      debugPrint('[WebSocketService] Já conectado ou conectando');
      return;
    }

    if (!_sessionController.isAuthenticated) {
      throw Exception('Usuário não autenticado. Faça login primeiro.');
    }

    connectionStatus.value = ConnectionStatus.connecting;

    try {
      final token = _sessionController.accessToken;
      if (token == null || token.isEmpty) {
        throw Exception('Token não disponível');
      }

      final wsUri = Uri.parse(
        ApiConfig.wsBaseUrl,
      ).replace(queryParameters: {'token': token});
      debugPrint('[WebSocketService] Conectando em: $wsUri');

      _channel = WebSocketChannel.connect(wsUri);

      // Aguarda a conexão estar estabelecida
      await _channel!.ready;

      connectionStatus.value = ConnectionStatus.connected;
      _reconnectAttempts = 0;

      // Envia mensagem de subscrição
      _sendSubscribe();

      // Inicia listener de eventos
      _setupListener();

      debugPrint('[WebSocketService] Conectado com sucesso');
    } catch (e) {
      debugPrint('[WebSocketService] Erro ao conectar: $e');
      connectionStatus.value = ConnectionStatus.error;
      _scheduleReconnect();
    }
  }

  /// Desconecta do WebSocket
  Future<void> disconnect() async {
    connectionStatus.value = ConnectionStatus.disconnecting;

    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    _subscription?.cancel();
    _subscription = null;

    try {
      await _channel?.sink.close(status.goingAway);
    } catch (e) {
      debugPrint('[WebSocketService] Erro ao fechar canal: $e');
    }

    _channel = null;
    connectionStatus.value = ConnectionStatus.disconnected;
    debugPrint('[WebSocketService] Desconectado');
  }

  /// Envia mensagem ao servidor
  void send(Map<String, dynamic> message) {
    if (!isConnected) {
      debugPrint(
        '[WebSocketService] Não está conectado, não é possível enviar',
      );
      return;
    }

    try {
      _channel?.sink.add(jsonEncode(message));
      debugPrint('[WebSocketService] Mensagem enviada: $message');
    } catch (e) {
      debugPrint('[WebSocketService] Erro ao enviar mensagem: $e');
    }
  }

  /// Envia mensagem de subscrição
  void _sendSubscribe() {
    final driverId = _sessionController.driverId;
    if (driverId == null || driverId.isEmpty) {
      debugPrint('[WebSocketService] Erro: driverId não disponível');
      return;
    }

    send({'type': 'subscribe_driver', 'driverId': driverId});
  }

  /// Configura listener para eventos WebSocket
  void _setupListener() {
    _subscription?.cancel();

    _subscription = _channel?.stream.listen(
      (message) {
        try {
          final data = jsonDecode(message) as Map<String, dynamic>;
          debugPrint('[WebSocketService] Evento recebido: ${data['type']}');
          _eventController.add(data);
        } catch (e) {
          debugPrint('[WebSocketService] Erro ao processar mensagem: $e');
        }
      },
      onError: (error) {
        debugPrint('[WebSocketService] Erro no stream: $error');
        connectionStatus.value = ConnectionStatus.error;
        _scheduleReconnect();
      },
      onDone: () {
        debugPrint('[WebSocketService] Stream fechado pelo servidor');
        connectionStatus.value = ConnectionStatus.disconnected;
        _scheduleReconnect();
      },
      cancelOnError: false,
    );
  }

  /// Agenda reconexão com backoff exponencial
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[WebSocketService] Máximo de tentativas atingido');
      connectionStatus.value = ConnectionStatus.error;
      return;
    }

    _reconnectAttempts++;

    // Backoff exponencial: 1s, 2s, 4s, 8s, etc.
    final delaySeconds =
        _initialReconnectDelay.inSeconds * (1 << (_reconnectAttempts - 1));
    final delay = Duration(
      seconds: delaySeconds.clamp(1, 60),
    ); // Max 60 segundos

    debugPrint(
      '[WebSocketService] Agendando reconexão em ${delay.inSeconds}s '
      '(tentativa $_reconnectAttempts/$_maxReconnectAttempts)',
    );

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      debugPrint('[WebSocketService] Tentando reconectar...');
      connect();
    });
  }

  /// Limpa recursos
  void dispose() {
    disconnect();
    _eventController.close();
  }
}
