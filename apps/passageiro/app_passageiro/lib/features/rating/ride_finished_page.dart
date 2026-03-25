import 'package:flutter/material.dart';

import 'package:app_passageiro/controllers/ride_controller.dart';
import 'package:app_passageiro/services/ride_rating_service.dart';
import 'package:app_passageiro/core/theme/app_colors.dart';

class RideFinishedPage extends StatefulWidget {
  const RideFinishedPage({super.key});

  @override
  State<RideFinishedPage> createState() => _RideFinishedPageState();
}

class _RideFinishedPageState extends State<RideFinishedPage> {
  int _avaliacao = 0;
  bool _enviado = false;
  late final TextEditingController _comentarioController;

  @override
  void initState() {
    super.initState();
    _comentarioController = TextEditingController();
  }

  @override
  void dispose() {
    _comentarioController.dispose();
    super.dispose();
  }

  void _enviarAvaliacao() {
    if (_avaliacao == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecione uma avaliacao'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _enviado = true);

    Future.delayed(const Duration(milliseconds: 200), () async {
      final rideId = RideController.instance.state.value.ride?.id ?? '';
      await RideRatingService.instance.submitRating(
        RideRating(
          rideId: rideId,
          rating: _avaliacao,
          comment: _comentarioController.text.trim().isEmpty
              ? null
              : _comentarioController.text.trim(),
        ),
      );

      await RideController.instance.clearRide();

      if (mounted) {
        Navigator.popUntil(context, (route) => route.isFirst);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Avaliacao enviada com sucesso'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ride = RideController.instance.state.value.ride;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: true,
        title: const Text('Corrida finalizada'),
        automaticallyImplyLeading: false,
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _iconeSucesso(),
                const SizedBox(height: 24),
                _resumoCorrida(ride),
                const SizedBox(height: 32),
                _buildAvaliacao(),
                const SizedBox(height: 16),
                _comentario(),
                const SizedBox(height: 120),
              ],
            ),
          ),
          _botaoEnviar(),
        ],
      ),
    );
  }

  Widget _iconeSucesso() {
    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: AppColors.success.withOpacity(0.2),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.success, width: 2),
      ),
      child: const Icon(Icons.check_circle, color: AppColors.success, size: 56),
    );
  }

  Widget _resumoCorrida(ride) {
    if (ride == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accent),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _info('Origem', ride.origin),
          const SizedBox(height: 8),
          _info('Destino', ride.destination),
          const SizedBox(height: 12),
          _info('Valor final', 'R\$ ${ride.estimatedPrice.toStringAsFixed(2)}'),
        ],
      ),
    );
  }

  Widget _buildAvaliacao() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _avaliacao > 0 ? AppColors.primary : AppColors.accent,
          width: _avaliacao > 0 ? 2 : 1,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(
          5,
          (index) => IconButton(
            iconSize: 36,
            icon: Icon(
              _avaliacao > index ? Icons.star : Icons.star_border,
              color: _avaliacao > index
                  ? AppColors.primary
                  : AppColors.textTertiary,
            ),
            onPressed: () => setState(() => _avaliacao = index + 1),
          ),
        ),
      ),
    );
  }

  Widget _comentario() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accent),
      ),
      child: TextField(
        controller: _comentarioController,
        maxLines: 4,
        maxLength: 200,
        enabled: !_enviado,
        style: const TextStyle(color: AppColors.textPrimary),
        decoration: const InputDecoration(
          hintText: 'Comentario (opcional)',
          hintStyle: TextStyle(color: AppColors.textTertiary),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _botaoEnviar() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 50,
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
            ),
            onPressed: _enviado ? null : _enviarAvaliacao,
            child: Text(
              _enviado ? 'Enviando...' : 'Enviar avaliacao',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }

  Widget _info(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
