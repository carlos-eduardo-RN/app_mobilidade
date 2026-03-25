import 'package:flutter/material.dart';
import '../../controllers/driver_controller.dart';
import '../../widgets/driver_live_map.dart';

class DriverHomePage extends StatelessWidget {
  static const String routeName = '/driver-home';

  const DriverHomePage({
    super.key,
    required this.controller,
    required this.isOnline,
    required this.onGoOnline,
    required this.onGoOffline,
    required this.driverName,
    required this.onOpenProfile,
    required this.onLogout,
  });

  final DriverController controller;
  final bool isOnline;
  final Future<void> Function() onGoOnline;
  final Future<void> Function() onGoOffline;
  final String driverName;
  final VoidCallback onOpenProfile;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final String statusText =
        isOnline ? 'Você está ONLINE' : 'Você está OFFLINE';
    final String buttonText = isOnline ? 'Ficar Offline' : 'Ficar Online';
    final Future<void> Function() onPressed = isOnline ? onGoOffline : onGoOnline;
    final Color statusColor = isOnline
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.error;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Motorista'),
      ),
      drawer: Drawer(
        child: Column(
          children: [
            DrawerHeader(
              margin: EdgeInsets.zero,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: Icon(
                      Icons.person,
                      size: 28,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          driverName,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Motorista',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(color: Theme.of(context).colorScheme.outlineVariant),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Meu perfil'),
              onTap: () {
                Navigator.of(context).pop();
                onOpenProfile();
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sair'),
              onTap: () {
                Navigator.of(context).pop();
                onLogout();
              },
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          DriverLiveMap(
            driverLocation: controller.driverLocation,
            driverHeading: controller.driverHeading,
            isMapFollowing: controller.isMapFollowing,
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Card(
                elevation: 8,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        statusText,
                        textAlign: TextAlign.center,
                        style:
                            Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: statusColor,
                                ),
                      ),
                      const SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: FilledButton(
                          onPressed: () async {
                            await onPressed();
                          },
                          child: Text(buttonText),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class DriverHomePageArgs {
  const DriverHomePageArgs({
    required this.controller,
    required this.isOnline,
    required this.onGoOnline,
    required this.onGoOffline,
    required this.driverName,
    required this.onOpenProfile,
    required this.onLogout,
  });

  final DriverController controller;
  final bool isOnline;
  final Future<void> Function() onGoOnline;
  final Future<void> Function() onGoOffline;
  final String driverName;
  final VoidCallback onOpenProfile;
  final VoidCallback onLogout;
}
