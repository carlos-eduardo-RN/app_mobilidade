import 'package:flutter/material.dart';

/// ❌ Tipo de erro da aplicação
enum AppErrorType {
  noNetwork,
  gpsUnavailable,
  apiTimeout,
  serverError,
  unknown,
}

/// ❌ Erro estruturado com contexto
class AppError {
  final AppErrorType type;
  final String title;
  final String message;
  final dynamic originalError;

  const AppError({
    required this.type,
    required this.title,
    required this.message,
    this.originalError,
  });

  @override
  String toString() => '$title: $message';
}

/// ❌ Gerenciador centralizado de erros.
///
/// Fornece um ValueNotifier<AppError?> para que a UI reaja a erros globais.
/// Erros podem ser definidos manualmente via setError() ou setErrorByType().
///
/// Exemplo de uso:
/// ```dart
/// // Definir erro (ex: detectado via HTTP timeout)
/// ErrorHandler.instance.setErrorByType(type: AppErrorType.apiTimeout);
///
/// // Limpar erro
/// ErrorHandler.instance.clearError();
///
/// // Verificar status de rede (assumindo isOnline foi definido previamente)
/// if (!ErrorHandler.instance.canPerformNetworkOperation()) {
///   return; // Bloqueia operação
/// }
/// ```
class ErrorHandler {
  /// 🔒 Construtor privado (singleton)
  ErrorHandler._();
  static final ErrorHandler instance = ErrorHandler._();

  final ValueNotifier<AppError?> currentError = ValueNotifier(null);

  /// Indica se há conexão (deve ser definido manualmente ou via listener de HTTP)
  final ValueNotifier<bool> isOnline = ValueNotifier(true);

  /// ================= INICIALIZAÇÃO =================

  /// Inicializa ErrorHandler (nenhuma configuração automática necessária).
  void init() {
    print('🔌 ErrorHandler: Inicializado');
  }

  /// Define manualmente se está online (pode ser chamado via detecção de erro de rede).
  void setOnlineStatus(bool online) {
    isOnline.value = online;
    print('📡 ErrorHandler: Status online = $online');

    if (online && currentError.value?.type == AppErrorType.noNetwork) {
      clearError();
    }
  }

  /// ================= DEFINIR ERRO =================

  /// Registra um erro e notifica listeners.
  void setError(AppError error) {
    print('❌ ErrorHandler: ${error.type.name} - ${error.message}');
    currentError.value = error;
  }

  /// Cria e define um erro de tipo específico.
  void setErrorByType({
    required AppErrorType type,
    String? customMessage,
    dynamic originalError,
  }) {
    final error = _createError(
      type: type,
      customMessage: customMessage,
      originalError: originalError,
    );
    setError(error);
  }

  /// ================= LIMPAR ERRO =================

  /// Remove o erro atual.
  void clearError() {
    currentError.value = null;
  }

  /// ================= VERIFICAÇÕES =================

  /// Verifica se pode executar operação que depende de rede.
  bool canPerformNetworkOperation() {
    if (!isOnline.value) {
      setErrorByType(type: AppErrorType.noNetwork);
      return false;
    }
    return true;
  }

  /// ================= FACTORY ERRORS =================

  /// Cria AppError baseado em tipo.
  AppError _createError({
    required AppErrorType type,
    String? customMessage,
    dynamic originalError,
  }) {
    switch (type) {
      case AppErrorType.noNetwork:
        return AppError(
          type: type,
          title: 'Sem conexão',
          message: customMessage ?? 'Verifique sua conexão com a internet',
          originalError: originalError,
        );

      case AppErrorType.gpsUnavailable:
        return AppError(
          type: type,
          title: 'GPS indisponível',
          message:
              customMessage ??
              'Ative o GPS ou conceda permissão de localização',
          originalError: originalError,
        );

      case AppErrorType.apiTimeout:
        return AppError(
          type: type,
          title: 'Requisição demorou',
          message:
              customMessage ?? 'A solicitação está demorando. Tente novamente.',
          originalError: originalError,
        );

      case AppErrorType.serverError:
        return AppError(
          type: type,
          title: 'Erro no servidor',
          message: customMessage ?? 'Ocorreu um erro. Tente novamente.',
          originalError: originalError,
        );

      case AppErrorType.unknown:
        return AppError(
          type: type,
          title: 'Algo deu errado',
          message: customMessage ?? 'Tente novamente em alguns momentos.',
          originalError: originalError,
        );
    }
  }

  /// ================= LIMPEZA =================

  /// Dispõe recursos do ErrorHandler.
  void dispose() {
    currentError.dispose();
    isOnline.dispose();
    print('🔌 ErrorHandler: Descartado');
  }
}
