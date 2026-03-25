import 'package:flutter/material.dart';

class RideCancelledPage extends StatelessWidget {
  final VoidCallback onDismiss;

  const RideCancelledPage({
    super.key,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.cancel_outlined,
                size: 72,
                color: Colors.red.shade400,
              ),
              const SizedBox(height: 16),
              const Text(
                'Corrida cancelada',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Voce pode solicitar uma nova corrida quando quiser.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onDismiss,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Voltar para inicio'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
