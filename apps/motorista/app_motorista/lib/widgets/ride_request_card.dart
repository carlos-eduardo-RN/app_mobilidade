import 'package:app_motorista/core/constants/ui_constants.dart';
import 'package:flutter/material.dart';

class RideRequestCard extends StatelessWidget {
  final String pickup;
  final String destination;
  final String distanceText;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const RideRequestCard({
    super.key,
    required this.pickup,
    required this.destination,
    required this.distanceText,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: UiConstants.surface,
        borderRadius: BorderRadius.circular(UiConstants.cardRadius),
        boxShadow: const [UiConstants.cardShadow],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Nova solicitacao de corrida',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: UiConstants.primaryText,
            ),
          ),
          const SizedBox(height: 12),
          _AddressRow(
            icon: Icons.radio_button_checked,
            color: UiConstants.success,
            label: pickup,
          ),
          const Padding(
            padding: EdgeInsets.only(left: 8),
            child: SizedBox(
              height: 18,
              child: VerticalDivider(
                width: 2,
                thickness: 2,
                color: Color(0xFFE0E0E0),
              ),
            ),
          ),
          _AddressRow(
            icon: Icons.location_on,
            color: UiConstants.accent,
            label: destination,
          ),
          const SizedBox(height: 12),
          Text(
            distanceText,
            style: const TextStyle(
              color: UiConstants.secondaryText,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: OutlinedButton(
                    onPressed: onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: UiConstants.danger,
                      side: const BorderSide(color: UiConstants.danger),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('RECUSAR'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: UiConstants.accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('ACEITAR'),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AddressRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _AddressRow({
    required this.icon,
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: color),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: UiConstants.primaryText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
