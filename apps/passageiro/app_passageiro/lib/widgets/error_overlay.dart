import 'package:flutter/material.dart';
import 'package:app_passageiro/core/error_handler/error_handler.dart';

/// 🚨 Widget que exibe erros globais da aplicação.
/// Conectado ao ErrorHandler.currentError e exibe SnackBars ou Banners.
class ErrorOverlay extends StatelessWidget {
  const ErrorOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppError?>(
      valueListenable: ErrorHandler.instance.currentError,
      builder: (context, error, _) {
        // Se há erro, mostra banner no topo
        if (error != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _showErrorBanner(context, error);
          });
        }

        return const SizedBox.shrink();
      },
    );
  }

  /// Exibe um banner na parte superior com o erro.
  void _showErrorBanner(BuildContext context, AppError error) {
    // Determina cor baseado no tipo de erro
    Color bannerColor;
    IconData bannerIcon;

    switch (error.type) {
      case AppErrorType.noNetwork:
        bannerColor = Colors.orange;
        bannerIcon = Icons.wifi_off;
        break;
      case AppErrorType.gpsUnavailable:
        bannerColor = Colors.orange;
        bannerIcon = Icons.location_off;
        break;
      case AppErrorType.apiTimeout:
        bannerColor = Colors.orange;
        bannerIcon = Icons.hourglass_empty;
        break;
      case AppErrorType.serverError:
        bannerColor = Colors.red;
        bannerIcon = Icons.error_outline;
        break;
      case AppErrorType.unknown:
        bannerColor = Colors.red;
        bannerIcon = Icons.error;
        break;
    }

    // Remove banner anterior se existir
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    // Mostra novo banner
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(bannerIcon, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    error.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    error.message,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: bannerColor,
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}

/// 🔒 Widget que bloqueia interações quando sem rede.
class NetworkBlocker extends StatelessWidget {
  final Widget child;

  const NetworkBlocker({
    required this.child,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: ErrorHandler.instance.isOnline,
      builder: (context, isOnline, _) {
        return Stack(
          children: [
            child,
            // Overlay bloqueador se sem rede
            if (!isOnline)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withOpacity(0.3),
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.wifi_off,
                          size: 48,
                          color: Colors.white,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Sem conexão',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Operação não disponível',
                          style: TextStyle(
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
