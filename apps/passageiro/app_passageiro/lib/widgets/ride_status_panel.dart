import 'package:flutter/material.dart';
import 'package:app_passageiro/core/constants/ui_constants.dart';

class RideStatusPanel extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool showLoading;
  final Widget? footer;

  const RideStatusPanel({
    super.key,
    required this.title,
    required this.subtitle,
    this.showLoading = false,
    this.footer,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
        decoration: const BoxDecoration(
          color: UiConstants.surface,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(UiConstants.panelRadius),
          ),
          boxShadow: [UiConstants.softPanelShadow],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showLoading) ...[
              const LinearProgressIndicator(minHeight: 3),
              const SizedBox(height: 14),
            ],
            Text(
              title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: UiConstants.primaryText,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 14,
                color: UiConstants.secondaryText,
                height: 1.4,
              ),
            ),
            if (footer != null) ...[const SizedBox(height: 16), footer!],
          ],
        ),
      ),
    );
  }
}
