import 'package:app_passageiro/core/enums/connection_status.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'package:app_passageiro/models/ride_model.dart';

class RideState {
  final RideStatus status;
  final RideModel? ride;
  final bool isLoading;
  final String? errorMessage;
  final ConnectionStatus connectionStatus;

  const RideState({
    required this.status,
    required this.ride,
    required this.isLoading,
    required this.connectionStatus,
    this.errorMessage,
  });

  factory RideState.initial() {
    return const RideState(
      status: RideStatus.idle,
      ride: null,
      isLoading: false,
      connectionStatus: ConnectionStatus.disconnected,
      errorMessage: null,
    );
  }

  RideState copyWith({
    RideStatus? status,
    RideModel? ride,
    bool? isLoading,
    String? errorMessage,
    ConnectionStatus? connectionStatus,
  }) {
    return RideState(
      status: status ?? this.status,
      ride: ride ?? this.ride,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      connectionStatus: connectionStatus ?? this.connectionStatus,
    );
  }
}
