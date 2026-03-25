import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:app_passageiro/core/error_handler/error_handler.dart';

class ConnectivityService {
  ConnectivityService._();
  static final ConnectivityService instance = ConnectivityService._();

  StreamSubscription? _subscription;

  Future<void> start() async {
    _subscription?.cancel();

    final result = await Connectivity().checkConnectivity();
    _handleResults(result);

    _subscription = Connectivity().onConnectivityChanged.listen(_handleResults);
  }

  void _handleResults(List<ConnectivityResult> results) {
    final online = results.any((result) => result != ConnectivityResult.none);
    ErrorHandler.instance.setOnlineStatus(online);
  }

  void dispose() {
    _subscription?.cancel();
  }
}
