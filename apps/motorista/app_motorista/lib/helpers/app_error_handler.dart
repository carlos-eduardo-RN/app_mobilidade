import 'dart:async';
import 'package:flutter/foundation.dart';

/// Gerencia timeouts, retries e tratamento de erros do app
/// 
/// Responsabilidades:
/// - Garantir que app nunca travará
/// - Entrar em estado seguro em exceções
/// - Logs internos para debug
/// - Timeouts para operações async
class AppErrorHandler {
  static final AppErrorHandler _instance = AppErrorHandler._internal();
  factory AppErrorHandler() => _instance;
  AppErrorHandler._internal();

  /// Callback para notificar app sobre erros críticos
  final ValueNotifier<AppError?> lastError = ValueNotifier<AppError?>(null);

  /// Stack de timeouts ativos
  final List<Timer> _activeTimeouts = [];

  /// Cria um timeout seguro que não pode travar o app
  /// 
  /// Exemplo:
  /// ```dart
  /// createTimeout(
  ///   duration: Duration(seconds: 30),
  ///   onTimeout: () => controller.handleTimeout(),
  ///   timeoutName: 'rideRequest',
  /// );
  /// ```
  Timer createTimeout({
    required Duration duration,
    required VoidCallback onTimeout,
    required String timeoutName,
  }) {
    late Timer timer;
    timer = Timer(duration, () {
      _activeTimeouts.remove(timer);
      try {
        onTimeout();
        _logDebug('Timeout executado: $timeoutName');
      } catch (e) {
        _handleError(
          AppError.timeout(
            name: timeoutName,
            originalError: e.toString(),
          ),
        );
      }
    });

    _activeTimeouts.add(timer);
    _logDebug('Timeout criado: $timeoutName (${duration.inSeconds}s)');

    return timer;
  }

  /// Cancela um timeout
  void cancelTimeout(Timer? timer) {
    if (timer == null) return;
    timer.cancel();
    _activeTimeouts.remove(timer);
    _logDebug('Timeout cancelado');
  }

  /// Cancela todos os timeouts ativos
  void cancelAllTimeouts() {
    for (final timer in _activeTimeouts) {
      timer.cancel();
    }
    _activeTimeouts.clear();
    _logDebug('Todos os timeouts cancelados');
  }

  /// Executa um bloco de código com tratamento de erro
  /// 
  /// Garante que exceções nunca causem crash
  Future<T?> safeExecute<T>({
    required Future<T> Function() operation,
    required String operationName,
    VoidCallback? onError,
  }) async {
    try {
      _logDebug('Iniciando operação: $operationName');
      final result = await operation();
      _logDebug('Operação concluída: $operationName');
      return result;
    } on TimeoutException catch (e) {
      _handleError(AppError.timeout(
        name: operationName,
        originalError: e.toString(),
      ));
      onError?.call();
      return null;
    } catch (e) {
      _handleError(AppError.generic(
        operation: operationName,
        error: e.toString(),
      ));
      onError?.call();
      return null;
    }
  }

  /// Handle de erro seguro
  void _handleError(AppError error) {
    lastError.value = error;
    _logError('❌ ${error.message}');
  }

  void _logDebug(String message) {
    debugPrint('[AppErrorHandler] 🔵 $message');
  }

  void _logError(String message) {
    debugPrint('[AppErrorHandler] $message');
  }

  void clearError() {
    lastError.value = null;
  }

  @override
  String toString() =>
      'AppErrorHandler(activeTimeouts: ${_activeTimeouts.length})';
}

/// Representa um erro da aplicação
class AppError {
  final String title;
  final String message;
  final ErrorType type;
  final DateTime timestamp;

  AppError({
    required this.title,
    required this.message,
    required this.type,
    required this.timestamp,
  });

  /// Erro de timeout
  factory AppError.timeout({
    required String name,
    required String originalError,
  }) {
    return AppError(
      title: 'Timeout',
      message: '$name não respondeu em tempo',
      type: ErrorType.timeout,
      timestamp: DateTime.now(),
    );
  }

  /// Erro genérico
  factory AppError.generic({
    required String operation,
    required String error,
  }) {
    return AppError(
      title: 'Erro',
      message: '$operation falhou: $error',
      type: ErrorType.generic,
      timestamp: DateTime.now(),
    );
  }

  /// Erro de localização
  factory AppError.location(String message) {
    return AppError(
      title: 'GPS Indisponível',
      message: message,
      type: ErrorType.location,
      timestamp: DateTime.now(),
    );
  }

  /// Erro de conectividade
  factory AppError.connectivity(String message) {
    return AppError(
      title: 'Sem Conexão',
      message: message,
      type: ErrorType.connectivity,
      timestamp: DateTime.now(),
    );
  }

  @override
  String toString() => '$title: $message';
}

enum ErrorType {
  timeout,
  generic,
  location,
  connectivity,
}