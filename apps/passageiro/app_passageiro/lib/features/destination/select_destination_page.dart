import 'package:flutter/material.dart';

/// Tela de seleção de destino
///
/// Permite que o passageiro visualize a origem e selecione um destino
/// antes de confirmar a criação da corrida.
///
/// Responsabilidades:
/// - Exibir origem (readonly)
/// - Permitir edição do destino
/// - Exibir placeholder do mapa
/// - Dispara callback com o destino selecionado
class SelectDestinationPage extends StatefulWidget {
  /// Texto exibido no campo de origem
  final String originLabel;

  /// Callback disparado quando o usuário confirma a corrida
  /// Recebe o texto digitado no campo de destino
  final Function(String destinationText) onConfirm;

  /// Callback para cancelar selecao de destino
  final VoidCallback? onCancel;

  const SelectDestinationPage({
    super.key,
    required this.originLabel,
    required this.onConfirm,
    this.onCancel,
  });

  @override
  State<SelectDestinationPage> createState() => _SelectDestinationPageState();
}

class _SelectDestinationPageState extends State<SelectDestinationPage> {
  /// Controlador para o campo de destino
  late final TextEditingController _destinationController;

  @override
  void initState() {
    super.initState();
    _destinationController = TextEditingController();
  }

  @override
  void dispose() {
    _destinationController.dispose();
    super.dispose();
  }

  /// Valida se o destino foi preenchido
  bool _isDestinationValid() {
    return _destinationController.text.trim().isNotEmpty;
  }

  /// Dispara o callback com o destino
  void _handleConfirmRide() {
    if (_isDestinationValid()) {
      widget.onConfirm(_destinationController.text.trim());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Escolha o destino'),
        centerTitle: true,
        elevation: 2.0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (widget.onCancel != null) {
              widget.onCancel!();
            }
            Navigator.of(context).maybePop();
          },
        ),
      ),
      body: Stack(
        children: [
          /// Conteúdo principal
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                /// Label: Origem
                Text(
                  'Origem',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8.0),

                /// Campo de Origem (readonly)
                TextField(
                  enabled: false,
                  decoration: InputDecoration(
                    hintText: 'Sua localização atual',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                    prefixIcon: const Icon(Icons.location_on),
                  ),
                  controller: TextEditingController(
                    text: widget.originLabel,
                  ),
                ),
                const SizedBox(height: 32.0),

                /// Label: Destino
                Text(
                  'Destino',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8.0),

                /// Campo de Destino (editável)
                TextField(
                  controller: _destinationController,
                  decoration: InputDecoration(
                    hintText: 'Para onde deseja ir?',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.location_on_outlined),
                  ),
                  textInputAction: TextInputAction.done,
                  onChanged: (_) {
                    setState(() {}); // Atualiza validação do botão
                  },
                ),
                const SizedBox(height: 32.0),

                /// Mini-mapa (placeholder)
                Container(
                  width: double.infinity,
                  height: 200.0,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(12.0),
                    border: Border.all(
                      color: Colors.grey[400]!,
                      width: 1.0,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.map,
                        size: 48.0,
                        color: Colors.grey[600],
                      ),
                      const SizedBox(height: 12.0),
                      Text(
                        'Mapa da rota',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14.0,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 100.0), // Espaço para o botão flutuante
              ],
            ),
          ),

          /// Botão fixo na parte inferior
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8.0,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: double.infinity,
                height: 56.0,
                child: ElevatedButton(
                  onPressed: _isDestinationValid()
                      ? _handleConfirmRide
                      : null, // Desabilita se destino vazio
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    disabledBackgroundColor: Colors.grey[300],
                    foregroundColor: Colors.white,
                    disabledForegroundColor: Colors.grey,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12.0),
                    ),
                  ),
                  child: const Text(
                    'Confirmar corrida',
                    style: TextStyle(
                      fontSize: 16.0,
                      fontWeight: FontWeight.w600,
                    ),
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
