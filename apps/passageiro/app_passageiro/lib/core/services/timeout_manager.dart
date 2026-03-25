import 'dart:async';
import 'package:flutter/foundation.dart';

/// ⏰ Gerenciador centralizado de timeouts para fluxos de corrida.
/// Controla deadlines e triggers automáticos de cancelamento.
class TimeoutManager {
  /// Timeout padrão para busca de motorista (60 segundos)
  static const Duration driverSearchTimeout = Duration(seconds: 60);

  /// ⏰ ETAPA 3 - Timeout para falta de atualização de posição (15 segundos)
  static const Duration positionUpdateTimeout = Duration(seconds: 15);

  /// 🔒 Construtor privado (singleton)
  TimeoutManager._();
  static final TimeoutManager instance = TimeoutManager._();

  /// Rastreia timers ativos
  final Map<String, Timer> _timers = {};

  /// ================= CRIAR TIMEOUT =================

  /// Inicia um timeout nomeado que executará callback ao expirar.
  /// Cancela timeout anterior com mesmo nome, se existir.
  void startTimeout({
    required String name,
    required Duration duration,
    required VoidCallback onTimeout,
  }) {
    // Cancela timeout anterior com mesmo nome
    _timers[name]?.cancel();

    final timer = Timer(duration, () {
      onTimeout();
      _timers.remove(name);
    });

    _timers[name] = timer;
    print('⏰ TimeoutManager: Iniciado timeout "$name" por ${duration.inSeconds}s');
  }

  /// ================= CANCELAR TIMEOUT =================

  /// Cancela um timeout nomeado.
  void cancelTimeout(String name) {
    _timers[name]?.cancel();
    _timers.remove(name);
    print('⏰ TimeoutManager: Cancelado timeout "$name"');
  }

  /// Cancela todos os timeouts.
  void cancelAll() {
    for (var timer in _timers.values) {
      timer.cancel();
    }
    _timers.clear();
    print('⏰ TimeoutManager: Cancelados todos os timeouts');
  }

  /// ================= VERIFICAÇÃO =================

  /// Verifica se um timeout está ativo.
  bool isActive(String name) => _timers.containsKey(name);

  /// Obtém lista de timeouts ativos.
  List<String> getActiveTimeouts() => _timers.keys.toList();
}
