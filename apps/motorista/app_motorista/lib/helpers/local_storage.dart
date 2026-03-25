import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/ride_model.dart';

/// Gerencia persistência local de dados do motorista
/// 
/// IMPORTANTE: Este é código MOCK usando shared_preferences.
/// Integração futura com SQLite/Hive para dados mais complexos.
/// 
/// Busque por "LocalStorage" para encontrar pontos de integração.
/// 
/// Dados persistidos:
/// - Status do motorista (online/offline)
/// - Corrida ativa (se existir)/// - Último estado válido
class LocalStorage {
  static final LocalStorage _instance = LocalStorage._internal();
  factory LocalStorage() => _instance;
  LocalStorage._internal();

  // NOTA: Em um app real, aqui teríamos:
  // late final SharedPreferences _prefs;
  // 
  // await init() async {
  //   _prefs = await SharedPreferences.getInstance();
  // }
  
  // Por enquanto, usamos um mock simples em memória
  final Map<String, dynamic> _mockData = {};

  /// Inicializa o storage (deve ser chamado em main.dart)
  /// 
  /// INTEGRAÇÃO: Usar SharedPreferences real aqui
  Future<void> init() async {
    debugPrint('[LocalStorage] Inicializado');
    // await _prefs = await SharedPreferences.getInstance();
    _loadMockData();
  }

  /// Salva status do motorista
  Future<bool> saveDriverStatus(DriverState status) async {
    try {
      _mockData['driver_status'] = status.name;
      debugPrint('[LocalStorage] Status salvo: ${status.name}');
      return true;
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao salvar status: $e');
      return false;
    }
  }

  /// Carrega status do motorista (ou null se não existir)
  DriverState? loadDriverStatus() {
    try {
      final statusStr = _mockData['driver_status'] as String?;
      if (statusStr == null) return null;

      return DriverState.values.firstWhere(
        (state) => state.name == statusStr,
        orElse: () => DriverState.offline,
      );
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao carregar status: $e');
      return null;
    }
  }

  /// Salva corrida ativa
  Future<bool> saveActiveRide(RideModel ride) async {
    try {
      final rideJson = _rideToJson(ride);
      _mockData['active_ride'] = jsonEncode(rideJson);
      debugPrint('[LocalStorage] Corrida salva: ${ride.id}');
      return true;
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao salvar corrida: $e');
      return false;
    }
  }

  /// Carrega corrida ativa (ou null se não existir)
  RideModel? loadActiveRide() {
    try {
      final rideStr = _mockData['active_ride'] as String?;
      if (rideStr == null) return null;

      final rideJson = jsonDecode(rideStr) as Map<String, dynamic>;
      return _rideFromJson(rideJson);
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao carregar corrida: $e');
      return null;
    }
  }

  /// Limpa corrida ativa
  Future<bool> clearActiveRide() async {
    try {
      _mockData.remove('active_ride');
      debugPrint('[LocalStorage] Corrida limpa');
      return true;
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao limpar corrida: $e');
      return false;
    }
  }

  /// Salva timestamp da última atualização
  Future<bool> saveLastUpdateTime() async {
    try {
      _mockData['last_update'] = DateTime.now().toIso8601String();
      return true;
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao salvar timestamp: $e');
      return false;
    }
  }

  /// Limpa todos os dados
  Future<bool> clearAll() async {
    try {
      _mockData.clear();
      debugPrint('[LocalStorage] Todos os dados foram limpos');
      return true;
    } catch (e) {
      debugPrint('[LocalStorage] Erro ao limpar dados: $e');
      return false;
    }
  }

  // ===== PRIVATE HELPERS =====

  Map<String, dynamic> _rideToJson(RideModel ride) {
    return {
      'id': ride.id,
      'passengerId': ride.passengerId,
      'driverId': ride.driverId,
      'pickupLocation': {
        'latitude': ride.pickupLocation.latitude,
        'longitude': ride.pickupLocation.longitude,
      },
      'dropoffLocation': {
        'latitude': ride.dropoffLocation.latitude,
        'longitude': ride.dropoffLocation.longitude,
      },
      'pickupAddress': ride.pickupAddress,
      'dropoffAddress': ride.dropoffAddress,
      'price': ride.price,
      'status': ride.status.name,
      'createdAt': ride.createdAt.toIso8601String(),
      'acceptedAt': ride.acceptedAt?.toIso8601String(),
      'pickedUpAt': ride.pickedUpAt?.toIso8601String(),
      'finishedAt': ride.finishedAt?.toIso8601String(),
    };
  }

  RideModel _rideFromJson(Map<String, dynamic> json) {
    final pickupLoc = json['pickupLocation'] as Map<String, dynamic>;
    final dropoffLoc = json['dropoffLocation'] as Map<String, dynamic>;

    return RideModel(
      id: json['id'] as String,
      passengerId: json['passengerId'] as String,
      driverId: json['driverId'] as String,
      pickupLocation: LatLngModel(
        latitude: (pickupLoc['latitude'] as num).toDouble(),
        longitude: (pickupLoc['longitude'] as num).toDouble(),
      ),
      dropoffLocation: LatLngModel(
        latitude: (dropoffLoc['latitude'] as num).toDouble(),
        longitude: (dropoffLoc['longitude'] as num).toDouble(),
      ),
      pickupAddress: json['pickupAddress'] as String,
      dropoffAddress: json['dropoffAddress'] as String,
      price: (json['price'] as num).toDouble(),
      status: RideStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => RideStatus.requested,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      acceptedAt: json['acceptedAt'] != null
          ? DateTime.parse(json['acceptedAt'] as String)
          : null,
      pickedUpAt: json['pickedUpAt'] != null
          ? DateTime.parse(json['pickedUpAt'] as String)
          : null,
      finishedAt: json['finishedAt'] != null
          ? DateTime.parse(json['finishedAt'] as String)
          : null,
    );
  }

  void _loadMockData() {
    // Simula carregamento de dados persistidos
    // Em um app real, isso viria do SharedPreferences/SQLite
  }

  @override
  String toString() => 'LocalStorage(entries: ${_mockData.length})';
}