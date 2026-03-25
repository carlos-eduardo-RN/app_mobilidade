import 'package:flutter/material.dart';

import 'package:app_passageiro/widgets/driver_info_card.dart';
import 'package:app_passageiro/widgets/ride_status_panel.dart';

class DriverAssignedScreen extends StatelessWidget {
  final String driverName;
  final double? rating;
  final int etaMinutes;
  final String? vehicle;
  final String? plate;
  final VoidCallback onTrackRide;

  const DriverAssignedScreen({
    super.key,
    required this.driverName,
    required this.rating,
    required this.etaMinutes,
    required this.vehicle,
    required this.plate,
    required this.onTrackRide,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          Container(color: Colors.black.withOpacity(0.15)),
          RideStatusPanel(
            title: 'Motorista encontrado',
            subtitle: 'Seu motorista esta confirmado. Acompanhe a chegada no mapa.',
            footer: Column(
              children: [
                DriverInfoCard(
                  driverName: driverName,
                  rating: rating,
                  vehicle: vehicle,
                  plate: plate,
                  status: 'A caminho do embarque',
                  etaText: 'Chega em $etaMinutes min',
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: onTrackRide,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF111111),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'ACOMPANHAR NO MAPA',
                      style: TextStyle(fontWeight: FontWeight.w700),
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
