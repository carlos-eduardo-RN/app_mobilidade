import 'package:flutter/material.dart';

class UiConstants {
  static const Color surface = Colors.white;
  static const Color surfaceMuted = Color(0xFFF5F5F5);
  static const Color primaryText = Color(0xFF141414);
  static const Color secondaryText = Color(0xFF666666);
  static const Color accent = Color(0xFF111111);
  static const Color success = Color(0xFF0F9D58);
  static const Color danger = Color(0xFFE53935);

  static const double panelRadius = 24;
  static const double cardRadius = 18;

  static const BoxShadow panelShadow = BoxShadow(
    color: Color(0x22000000),
    blurRadius: 18,
    offset: Offset(0, -4),
  );

  static const BoxShadow cardShadow = BoxShadow(
    color: Color(0x22000000),
    blurRadius: 16,
    offset: Offset(0, 6),
  );

  const UiConstants._();
}
