import 'package:flutter/material.dart';

import 'package:app_passageiro/widgets/ride_status_panel.dart';

class SearchingDriverScreen extends StatelessWidget {
  final VoidCallback onCancel;

  const SearchingDriverScreen({
    super.key,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          Container(color: Colors.black.withOpacity(0.2)),
          RideStatusPanel(
            title: 'Procurando motorista...',
            subtitle:
                'Estamos encontrando o melhor motorista perto de voce. Isso normalmente leva poucos segundos.',
            showLoading: true,
            footer: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onCancel,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFE53935),
                  side: const BorderSide(color: Color(0xFFE53935)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text('Cancelar corrida'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
