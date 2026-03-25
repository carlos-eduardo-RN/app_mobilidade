import 'package:flutter/material.dart';
import '../../controllers/driver_controller.dart';

class RideRequestPage extends StatelessWidget {
  const RideRequestPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = DriverController.instance;
    final ride = controller.currentRide.value;

    if (ride == null) {
      return const Scaffold(body: Center(child: Text('Nenhuma corrida')));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Nova Corrida')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text('Origem: ${ride.pickupAddress}'),
            Text('Destino: ${ride.dropoffAddress}'),
            Text('Valor: R\$ ${ride.price.toStringAsFixed(2)}'),
            const Spacer(),
            ElevatedButton(
              onPressed: () {
                controller.acceptRide();
                Navigator.pop(context);
              },
              child: const Text('Aceitar corrida'),
            ),
          ],
        ),
      ),
    );
  }
}
