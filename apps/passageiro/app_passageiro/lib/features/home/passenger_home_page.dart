import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Tela home do passageiro
/// 
/// Exibe um mapa em tela cheia com a localização atual e controles
/// para solicitar uma corrida.
/// 
/// Responsabilidades:
/// - Renderizar GoogleMap
/// - Exibir marcador da localização do passageiro
/// - Fornecer controles para seleção de destino e solicitação de corrida
class PassengerHomePage extends StatelessWidget {
  /// Posição inicial para o mapa
  final LatLng initialPosition;

  /// Nome do usuário
  final String userName;

  /// Email do usuário
  final String userEmail;

  /// Callback quando o usuário toca em "Para onde vamos?"
  final VoidCallback onSelectDestination;

  /// Callback quando o usuário toca em "Solicitar corrida"
  final VoidCallback onRequestRide;

  /// Callback quando o usuário abre o perfil
  final VoidCallback onOpenProfile;

  /// Callback quando o usuário sai da conta
  final VoidCallback onLogout;

  const PassengerHomePage({
    super.key,
    required this.initialPosition,
    required this.userName,
    required this.userEmail,
    required this.onSelectDestination,
    required this.onRequestRide,
    required this.onOpenProfile,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: Drawer(
        child: Column(
          children: [
            DrawerHeader(
              margin: EdgeInsets.zero,
              padding: const EdgeInsets.all(16.0),
              decoration: const BoxDecoration(color: Colors.white),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.blue[100],
                    child: Icon(
                      Icons.person,
                      size: 32,
                      color: Colors.blue[700],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          userEmail,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.black54,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Meu perfil'),
              onTap: () {
                Navigator.pop(context);
                onOpenProfile();
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sair'),
              onTap: () {
                Navigator.pop(context);
                onLogout();
              },
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          /// Mapa em tela cheia
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: initialPosition,
              zoom: 15.0,
            ),
            markers: {
              Marker(
                markerId: const MarkerId('passenger_location'),
                position: initialPosition,
                infoWindow: const InfoWindow(
                  title: 'Sua localização',
                ),
              ),
            },
            zoomControlsEnabled: false,
            myLocationButtonEnabled: false,
          ),
          /// Controles na parte inferior
          Positioned(
            bottom: 24.0,
            left: 24.0,
            right: 24.0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                /// Botão: "Para onde vamos?"
                SizedBox(
                  width: double.infinity,
                  height: 56.0,
                  child: ElevatedButton(
                    onPressed: onSelectDestination,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black87,
                      elevation: 4.0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                    ),
                    child: const Text(
                      'Para onde vamos?',
                      style: TextStyle(
                        fontSize: 16.0,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12.0),

                /// Botão: "Solicitar corrida"
                SizedBox(
                  width: double.infinity,
                  height: 56.0,
                  child: ElevatedButton(
                    onPressed: onRequestRide,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      elevation: 4.0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                    ),
                    child: const Text(
                      'Solicitar corrida',
                      style: TextStyle(
                        fontSize: 16.0,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
