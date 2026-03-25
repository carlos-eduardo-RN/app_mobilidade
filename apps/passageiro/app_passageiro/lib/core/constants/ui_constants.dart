import 'package:flutter/material.dart';

class UiConstants {
  static const Color surface = Colors.white;
  static const Color primaryText = Color(0xFF111111);
  static const Color secondaryText = Color(0xFF666666);

  static const double panelRadius = 24;
  static const double cardRadius = 18;

  static const BoxShadow softPanelShadow = BoxShadow(
    color: Color(0x22000000),
    blurRadius: 18,
    offset: Offset(0, -4),
  );

  static const BoxShadow softCardShadow = BoxShadow(
    color: Color(0x22000000),
    blurRadius: 16,
    offset: Offset(0, 6),
  );

  const UiConstants._();
}
