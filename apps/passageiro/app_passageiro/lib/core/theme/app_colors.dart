import 'package:flutter/material.dart';

/// 🎨 Paleta oficial do app (Uber-like Dark Mode)
///
/// Uso recomendado:
/// AppColors.primary
/// AppColors.background
/// AppColors.textPrimary
class AppColors {
  // ===============================
  // 🎯 Cores base
  // ===============================
  static const Color primary = Color(0xFFF7931E); // Laranja destaque
  static const Color background = Color(0xFF0E2A3B); // Fundo principal
  static const Color surface = Color(0xFF122C3A); // Cards / BottomSheets
  static const Color accent = Color(0xFF1E3A50); // Divisores / bordas

  // ===============================
  // 📝 Textos
  // ===============================
  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Colors.white70;
  static const Color textTertiary = Colors.white38;

  // ===============================
  // ✅ Estados
  // ===============================
  static const Color success = Color(0xFF27AE60);
  static const Color error = Color(0xFFE74C3C);
  static const Color warning = Color(0xFFF39C12);

  // ===============================
  // 🧊 Utilitários
  // ===============================
  static const Color disabled = Colors.white24;
  static const Color overlay = Colors.black54;

  // 🔒 Impede instância acidental
  const AppColors._();
}