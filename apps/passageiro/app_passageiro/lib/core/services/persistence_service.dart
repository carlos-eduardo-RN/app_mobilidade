import 'dart:convert';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'package:app_passageiro/models/ride_model.dart';
import 'package:app_passageiro/models/driver_location_model.dart';
import 'package:app_passageiro/models/route_data_model.dart';

/// 💾 Serviço centralizado de persistência local para corridas.
/// 
/// Permite salvar e restaurar o estado da corrida ativa em caso de crash/fechamento.
/// 
/// **ETAPA 1 - Persistência Mínima:**
/// - Salva automaticamente RideModel em JSON
/// - Restaura ao abrir o app
/// - Limpa quando corrida finalizar/cancelar
/// - Usa apenas armazenamento de arquivo (sem dependências externas)
/// 
/// **Nota:** Pode ser substituído por SharedPreferences no futuro sem alterar a interface.
class PersistenceService {
  static const String _rideKey = 'active_ride';

  /// 🔒 Construtor privado (singleton)
  PersistenceService._();
  static final PersistenceService instance = PersistenceService._();

  /// Cache em memória (fallback rápido durante execução)
  static Map<String, dynamic>? _memoryCache;

  /// ================= SALVAR =================

  /// Salva a corrida atual na memória local (arquivo).
  /// Chamado sempre que o estado da corrida muda.
  Future<bool> saveRide(RideModel ride) async {
    try {
      // Salva em cache de memória para acesso rápido
      _memoryCache = _rideModelToMap(ride);

      // Persiste no storage local
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_rideKey, jsonEncode(_memoryCache ?? {}));

      return true;
    } catch (e) {
      print('❌ PersistenceService: Erro ao salvar corrida - $e');
      return false;
    }
  }

  /// ================= CARREGAR =================

  /// Carrega a corrida salva (se houver) com validação de estado.
  /// 
  /// **ETAPA 2 - Restauração Segura:**
  /// - Retorna null se status for rideCompleted ou rideCancelled
  /// - Retorna null se houver erro na desserialização
  /// - Preserva cache válido para acesso rápido
  /// 
  /// Retorna null se nenhuma corrida estiver salva ou estado inválido.
  Future<RideModel?> loadRide() async {
    try {
      // Primeiro tenta cache de memória (já foi carregado nesta sessão)
      if (_memoryCache != null) {
        final ride = _rideModelFromMap(_memoryCache!);
        
        // ETAPA 2: Valida se o estado é restaurável
        if (_isRestorable(ride)) {
          return ride;
        } else {
          print('⚠️ PersistenceService: Corrida anterior não é restaurável (status: ${ride.status})');
          // Limpa memória se estado não é válido
          _memoryCache = null;
          return null;
        }
      }

      // Tenta carregar do storage local
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_rideKey);
      if (json == null || json.isEmpty) {
        return null;
      }

      final map = jsonDecode(json) as Map<String, dynamic>;

      // Desserializa e valida
      final ride = _rideModelFromMap(map);
      
      // ETAPA 2: Valida se o estado é restaurável
      if (!_isRestorable(ride)) {
        print('⚠️ PersistenceService: Corrida salva não é restaurável (status: ${ride.status})');
        // Remove cache inválido
        await prefs.remove(_rideKey);
        return null;
      }

      // Carrega em cache
      _memoryCache = map;

      return ride;
    } catch (e) {
      print('❌ PersistenceService: Erro ao carregar corrida - $e');
      // Em caso de erro, limpa cache e storage
      _memoryCache = null;
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_rideKey);
      } catch (clearError) {
        print('⚠️ PersistenceService: Erro ao limpar storage - $clearError');
      }
      return null;
    }
  }

  /// **ETAPA 2 - Validação de estado restaurável**
  /// Verifica se a corrida pode ser restaurada
  bool _isRestorable(RideModel ride) {
    // Não restaura corridas finalizadas ou canceladas
    if (ride.status == RideStatus.rideCompleted ||
        ride.status == RideStatus.rideCancelled) {
      return false;
    }
    
    // Status válidos para restauração: selectingDestination, searchingDriver,
    // driverAssigned, driverArriving, rideStarted, rideInProgress
    return true;
  }

  /// ================= LIMPAR =================

  /// Remove a corrida salva (após finalização ou cancelamento).
  Future<bool> clearRide() async {
    try {
      _memoryCache = null;

      // Tenta remover do storage local
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_rideKey);

      return true;
    } catch (e) {
      print('❌ PersistenceService: Erro ao limpar corrida - $e');
      return false;
    }
  }

  /// ================= CONVERSÃO JSON =================

  /// Converte RideModel para Map para persistência.
  Map<String, dynamic> _rideModelToMap(RideModel ride) {
    return {
      'id': ride.id,
      'origin': ride.origin,
      'destination': ride.destination,
      'estimatedDistanceKm': ride.estimatedDistanceKm,
      'estimatedPrice': ride.estimatedPrice,
      'status': rideStatusToString(ride.status),
      'driverName': ride.driverName,
      'driverRating': ride.driverRating,
      'driverVehicle': ride.driverVehicle,
      'driverPlate': ride.driverPlate,
      'passengerLocation': ride.passengerLocation != null
          ? {
              'lat': ride.passengerLocation!.latitude,
              'lng': ride.passengerLocation!.longitude,
            }
          : null,
      'driverLocation': ride.driverLocation != null
          ? {
              'lat': ride.driverLocation!.position.latitude,
              'lng': ride.driverLocation!.position.longitude,
              'heading': ride.driverLocation!.heading,
              'timestamp': ride.driverLocation!.timestamp.toIso8601String(),
            }
          : null,
      'approachRoute': ride.approachRoute != null
          ? {
              'polyline': ride.approachRoute!.polyline
                  .map((p) => {'lat': p.latitude, 'lng': p.longitude})
                  .toList(),
              'totalDistanceKm': ride.approachRoute!.totalDistanceKm,
              'estimatedTimeMinutes': ride.approachRoute!.estimatedTimeMinutes,
            }
          : null,
      'rideRoute': ride.rideRoute != null
          ? {
              'polyline': ride.rideRoute!.polyline
                  .map((p) => {'lat': p.latitude, 'lng': p.longitude})
                  .toList(),
              'totalDistanceKm': ride.rideRoute!.totalDistanceKm,
              'estimatedTimeMinutes': ride.rideRoute!.estimatedTimeMinutes,
            }
          : null,
      'remainingDistanceKm': ride.remainingDistanceKm,
      'remainingTimeMinutes': ride.remainingTimeMinutes,
      // ⏰ ETAPA 3 - Lastimestamp de atualização
      'lastPositionUpdate': ride.lastPositionUpdate?.toIso8601String(),
      // 🔴 ETAPA 4 - Flags de erro
      'hasError': ride.hasError,
      'errorMessage': ride.errorMessage,
    };
  }

  /// Converte Map de volta para RideModel.
  RideModel _rideModelFromMap(Map<String, dynamic> map) {
    // Parse status
    final status = rideStatusFromString(map['status'] as String?);

    // Parse passenger location
    LatLng? passengerLocation;
    if (map['passengerLocation'] != null) {
      final pLoc = map['passengerLocation'] as Map<String, dynamic>;
      passengerLocation = LatLng(pLoc['lat'] as double, pLoc['lng'] as double);
    }

    // Parse driver location
    DriverLocation? driverLocation;
    if (map['driverLocation'] != null) {
      final dLoc = map['driverLocation'] as Map<String, dynamic>;
      driverLocation = DriverLocation(
        position: LatLng(dLoc['lat'] as double, dLoc['lng'] as double),
        heading: dLoc['heading'] as double,
        timestamp: DateTime.parse(dLoc['timestamp'] as String),
      );
    }

    // Parse approach route
    RouteData? approachRoute;
    if (map['approachRoute'] != null) {
      final aRoute = map['approachRoute'] as Map<String, dynamic>;
      final polyline = (aRoute['polyline'] as List)
          .cast<Map<String, dynamic>>()
          .map((p) => LatLng(p['lat'] as double, p['lng'] as double))
          .toList();
      approachRoute = RouteData(
        polyline: polyline,
        totalDistanceKm: aRoute['totalDistanceKm'] as double,
        estimatedTimeMinutes: aRoute['estimatedTimeMinutes'] as int,
      );
    }

    // Parse ride route
    RouteData? rideRoute;
    if (map['rideRoute'] != null) {
      final rRoute = map['rideRoute'] as Map<String, dynamic>;
      final polyline = (rRoute['polyline'] as List)
          .cast<Map<String, dynamic>>()
          .map((p) => LatLng(p['lat'] as double, p['lng'] as double))
          .toList();
      rideRoute = RouteData(
        polyline: polyline,
        totalDistanceKm: rRoute['totalDistanceKm'] as double,
        estimatedTimeMinutes: rRoute['estimatedTimeMinutes'] as int,
      );
    }

    return RideModel(
      id: map['id'] as String? ?? '',
      origin: map['origin'] as String,
      destination: map['destination'] as String,
      estimatedDistanceKm: map['estimatedDistanceKm'] as double,
      estimatedPrice: map['estimatedPrice'] as double,
      status: status,
      driverName: map['driverName'] as String?,
      driverRating: (map['driverRating'] as num?)?.toDouble(),
      driverVehicle: map['driverVehicle'] as String?,
      driverPlate: map['driverPlate'] as String?,
      passengerLocation: passengerLocation,
      driverLocation: driverLocation,
      approachRoute: approachRoute,
      rideRoute: rideRoute,
      remainingDistanceKm: map['remainingDistanceKm'] as double?,
      remainingTimeMinutes: map['remainingTimeMinutes'] as int?,
      // ⏰ ETAPA 3 - Restaura lastPositionUpdate
      lastPositionUpdate: map['lastPositionUpdate'] != null
          ? DateTime.parse(map['lastPositionUpdate'] as String)
          : null,
      // 🔴 ETAPA 4 - Restaura flags de erro
      hasError: map['hasError'] as bool? ?? false,
      errorMessage: map['errorMessage'] as String?,
    );
  }
}
