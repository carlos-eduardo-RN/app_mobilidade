import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:app_passageiro/widgets/driver_info_card.dart';
import 'package:app_passageiro/widgets/map_view.dart';

class RideTrackingScreen extends StatefulWidget {
  final LatLng driverPosition;
  final LatLng passengerPosition;
  final LatLng destinationPosition;
  final String statusText;
  final String etaText;
  final List<LatLng> polyline;
  final List<LatLng> approachPolyline;
  final bool isDriverArriving;
  final String? driverName;
  final double? driverRating;
  final String? driverVehicle;
  final String? driverPlate;
  final VoidCallback onCancel;

  const RideTrackingScreen({
    super.key,
    required this.driverPosition,
    required this.passengerPosition,
    required this.destinationPosition,
    required this.statusText,
    required this.etaText,
    required this.polyline,
    required this.approachPolyline,
    required this.isDriverArriving,
    required this.driverName,
    required this.driverRating,
    required this.driverVehicle,
    required this.driverPlate,
    required this.onCancel,
  });

  @override
  State<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends State<RideTrackingScreen>
    with SingleTickerProviderStateMixin {
  GoogleMapController? _mapController;
  late LatLng _animatedDriverPosition;
  AnimationController? _animationController;
  Animation<LatLng>? _animation;

  @override
  void initState() {
    super.initState();
    _animatedDriverPosition = widget.driverPosition;
  }

  @override
  void didUpdateWidget(covariant RideTrackingScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.driverPosition != widget.driverPosition) {
      _animateDriverPosition(widget.driverPosition);
    }
  }

  @override
  void dispose() {
    _animationController?.dispose();
    super.dispose();
  }

  void _animateDriverPosition(LatLng target) {
    _animationController?.dispose();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    final tween = _LatLngTween(begin: _animatedDriverPosition, end: target);
    _animation = tween.animate(
      CurvedAnimation(parent: _animationController!, curve: Curves.easeInOut),
    )..addListener(() {
        setState(() {
          _animatedDriverPosition = _animation!.value;
        });
      });

    _animationController?.forward();
  }

  @override
  Widget build(BuildContext context) {
    final center = LatLng(
      (widget.driverPosition.latitude +
              widget.passengerPosition.latitude +
              widget.destinationPosition.latitude) /
          3,
      (widget.driverPosition.longitude +
              widget.passengerPosition.longitude +
              widget.destinationPosition.longitude) /
          3,
    );

    final activePolyline =
        widget.isDriverArriving ? widget.approachPolyline : widget.polyline;

    return Scaffold(
      body: Stack(
        children: [
          MapView(
            initialCameraPosition: CameraPosition(target: center, zoom: 14),
            onMapCreated: (controller) => _mapController = controller,
            markers: {
              Marker(
                markerId: const MarkerId('driver'),
                position: _animatedDriverPosition,
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                infoWindow: const InfoWindow(title: 'Motorista'),
              ),
              Marker(
                markerId: const MarkerId('pickup'),
                position: widget.passengerPosition,
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
                infoWindow: const InfoWindow(title: 'Embarque'),
              ),
              Marker(
                markerId: const MarkerId('destination'),
                position: widget.destinationPosition,
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                infoWindow: const InfoWindow(title: 'Destino'),
              ),
            },
            polylines: {
              if (activePolyline.isNotEmpty)
                Polyline(
                  polylineId: const PolylineId('active-route'),
                  points: activePolyline,
                  width: 5,
                  color: const Color(0xFF111111),
                ),
            },
          ),
          Positioned(
            top: 44,
            right: 12,
            child: FloatingActionButton.small(
              heroTag: 'tracking-center-map',
              backgroundColor: Colors.white,
              foregroundColor: Colors.black87,
              onPressed: () {
                if (_mapController == null) return;
                _mapController!.animateCamera(
                  CameraUpdate.newCameraPosition(
                    CameraPosition(target: _animatedDriverPosition, zoom: 16),
                  ),
                );
              },
              child: const Icon(Icons.navigation),
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 20,
            child: DriverInfoCard(
              driverName: widget.driverName ?? 'Motorista',
              rating: widget.driverRating,
              vehicle: widget.driverVehicle,
              plate: widget.driverPlate,
              status: widget.statusText,
              etaText: widget.etaText,
              onCancel: widget.onCancel,
            ),
          ),
        ],
      ),
    );
  }
}

class _LatLngTween extends Tween<LatLng> {
  _LatLngTween({required LatLng begin, required LatLng end})
      : super(begin: begin, end: end);

  @override
  LatLng lerp(double t) {
    final lat = begin!.latitude + (end!.latitude - begin!.latitude) * t;
    final lng = begin!.longitude + (end!.longitude - begin!.longitude) * t;
    return LatLng(lat, lng);
  }
}
