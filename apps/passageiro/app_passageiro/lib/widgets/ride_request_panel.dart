import 'package:app_passageiro/core/constants/ui_constants.dart';
import 'package:flutter/material.dart';

class RideRequestPanel extends StatelessWidget {
  final ScrollController? scrollController;
  final String pickupLabel;
  final String? destinationLabel;
  final double? estimatedPrice;
  final bool isLoading;
  final VoidCallback onSelectDestination;
  final VoidCallback onRequestRide;

  const RideRequestPanel({
    super.key,
    this.scrollController,
    required this.pickupLabel,
    required this.destinationLabel,
    required this.estimatedPrice,
    required this.isLoading,
    required this.onSelectDestination,
    required this.onRequestRide,
  });

  bool get _hasDestination =>
      destinationLabel != null && destinationLabel!.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: UiConstants.surface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(UiConstants.panelRadius),
        ),
        boxShadow: [UiConstants.softPanelShadow],
      ),
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Para onde?',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w700,
              color: UiConstants.primaryText,
            ),
          ),
          const SizedBox(height: 14),
          if (!_hasDestination)
            _DestinationSearchButton(onTap: onSelectDestination)
          else ...[
            _RouteInfoCard(
              pickupLabel: pickupLabel,
              destinationLabel: destinationLabel!,
              estimatedPrice: estimatedPrice,
              onEditDestination: onSelectDestination,
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: isLoading ? null : onRequestRide,
                style: ElevatedButton.styleFrom(
                  elevation: 0,
                  backgroundColor: const Color(0xFF111111),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'SOLICITAR CORRIDA',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DestinationSearchButton extends StatelessWidget {
  final VoidCallback onTap;

  const _DestinationSearchButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        height: 58,
        decoration: BoxDecoration(
          color: const Color(0xFFF2F2F2),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: const [
            SizedBox(width: 16),
            Icon(Icons.search, color: Color(0xFF222222)),
            SizedBox(width: 12),
            Text(
              'Digite o destino',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF222222),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RouteInfoCard extends StatelessWidget {
  final String pickupLabel;
  final String destinationLabel;
  final double? estimatedPrice;
  final VoidCallback onEditDestination;

  const _RouteInfoCard({
    required this.pickupLabel,
    required this.destinationLabel,
    required this.estimatedPrice,
    required this.onEditDestination,
  });

  @override
  Widget build(BuildContext context) {
    final price = estimatedPrice == null
        ? '--'
        : 'R\$ ${estimatedPrice!.toStringAsFixed(2)}';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F8F8),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _LocationRow(
            icon: Icons.radio_button_checked,
            iconColor: const Color(0xFF1A73E8),
            label: pickupLabel,
          ),
          const Padding(
            padding: EdgeInsets.only(left: 9),
            child: SizedBox(
              height: 20,
              child: VerticalDivider(
                width: 2,
                thickness: 2,
                color: Color(0xFFDDDDDD),
              ),
            ),
          ),
          _LocationRow(
            icon: Icons.location_on,
            iconColor: const Color(0xFF111111),
            label: destinationLabel,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.payments_outlined,
                size: 18,
                color: Color(0xFF4A4A4A),
              ),
              const SizedBox(width: 8),
              Text(
                'Estimativa: $price',
                style: const TextStyle(
                  color: Color(0xFF333333),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: onEditDestination,
                child: const Text('Alterar'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LocationRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;

  const _LocationRow({
    required this.icon,
    required this.iconColor,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 18, color: iconColor),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF202020),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
