import 'dart:developer';

/// Modelo de avaliação de corrida
class RideRating {
  final String rideId;
  final int rating; // 1 a 5
  final String? comment;
  final DateTime createdAt;

  RideRating({
    required this.rideId,
    required this.rating,
    this.comment,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

/// Serviço responsável por lidar com avaliações de corrida
class RideRatingService {
  /// Singleton
  static final RideRatingService instance =
      RideRatingService._internal();

  RideRatingService._internal();

  /// 🔮 Envia avaliação da corrida
  /// Hoje: mock local
  /// Amanhã: API REST
  Future<void> submitRating(RideRating rating) async {
    // Simula latência de rede
    await Future.delayed(const Duration(milliseconds: 500));

    // Log local (debug)
    log(
      '⭐ Avaliação enviada',
      name: 'RideRatingService',
      error: {
        'rideId': rating.rideId,
        'rating': rating.rating,
        'comment': rating.comment,
        'createdAt': rating.createdAt.toIso8601String(),
      },
    );

    // Aqui futuramente: POST /ratings
  }
}