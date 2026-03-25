import 'package:app_motorista/core/constants/ui_constants.dart';
import 'package:flutter/material.dart';

class EarningsCard extends StatelessWidget {
  final double todayEarnings;
  final VoidCallback? onTap;

  const EarningsCard({
    super.key,
    required this.todayEarnings,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: UiConstants.surface,
      borderRadius: BorderRadius.circular(UiConstants.cardRadius),
      child: InkWell(
        borderRadius: BorderRadius.circular(UiConstants.cardRadius),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(UiConstants.cardRadius),
            boxShadow: const [UiConstants.cardShadow],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.attach_money, color: UiConstants.success),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Hoje',
                    style: TextStyle(
                      fontSize: 11,
                      color: UiConstants.secondaryText,
                    ),
                  ),
                  Text(
                    _formatCurrency(todayEarnings),
                    style: const TextStyle(
                      color: UiConstants.primaryText,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              if (onTap != null) ...[
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: UiConstants.secondaryText,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static String _formatCurrency(double value) {
    final cents = (value * 100).round();
    final units = cents ~/ 100;
    final decimals = cents % 100;
    final unitText = units
        .toString()
        .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
    return 'R\$ $unitText,${decimals.toString().padLeft(2, '0')}';
  }
}
