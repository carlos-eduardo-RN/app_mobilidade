import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class RideInProgressPage extends StatefulWidget {
  final LatLng driverPosition;
  final LatLng passengerPosition;
  final LatLng destinationPosition;
  final String statusText;
  final String etaText;
  final List<LatLng> polyline;
  final List<LatLng> approachPolyline;
  final bool isDriverArriving;

  const RideInProgressPage({
    super.key,
    required this.driverPosition,
    required this.passengerPosition,
    required this.destinationPosition,
    required this.statusText,
    required this.etaText,
    required this.polyline,
    required this.approachPolyline,
    required this.isDriverArriving,
  });

  @override
  State<RideInProgressPage> createState() => _RideInProgressPageState();
}

class _RideInProgressPageState extends State<RideInProgressPage>
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
  void didUpdateWidget(covariant RideInProgressPage oldWidget) {
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

    final tween = LatLngTween(begin: _animatedDriverPosition, end: target);
    _animation = tween.animate(CurvedAnimation(
      parent: _animationController!,
      curve: Curves.easeInOut,
    ))
      ..addListener(() {
        setState(() {
          _animatedDriverPosition = _animation!.value;
        });
        _animateCamera(_animatedDriverPosition);
      });

    _animationController?.forward();
  }

  void _animateCamera(LatLng target) {
    if (_mapController == null) return;
    _mapController!.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: 15),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          _buildMap(),
          Positioned(
            left: 16,
            right: 16,
            bottom: 32,
            child: _buildInfoCard(),
          ),
        ],
      ),
    );
  }

  Widget _buildMap() {
    final centerLat = (widget.driverPosition.latitude +
            widget.passengerPosition.latitude +
            widget.destinationPosition.latitude) /
        3;
    final centerLng = (widget.driverPosition.longitude +
            widget.passengerPosition.longitude +
            widget.destinationPosition.longitude) /
        3;

    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: LatLng(centerLat, centerLng),
        zoom: 14,
      ),
      onMapCreated: (controller) => _mapController = controller,
      markers: _buildMarkers(),
      polylines: _buildPolylines(),
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
    );
  }

  Set<Marker> _buildMarkers() {
    return {
      Marker(
        markerId: const MarkerId('driver'),
        position: _animatedDriverPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: const InfoWindow(title: 'Motorista'),
      ),
      Marker(
        markerId: const MarkerId('passenger'),
        position: widget.passengerPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: 'Voce'),
      ),
      Marker(
        markerId: const MarkerId('destination'),
        position: widget.destinationPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Destino'),
      ),
    };
  }

  Set<Polyline> _buildPolylines() {
    final activePolyline =
        widget.isDriverArriving ? widget.approachPolyline : widget.polyline;
    if (activePolyline.isEmpty) {
      return {
        Polyline(
          polylineId: const PolylineId('route'),
          points: [
            widget.driverPosition,
            widget.passengerPosition,
            widget.destinationPosition,
          ],
          color: Colors.blue,
          width: 4,
        ),
      };
    }

    return {
      Polyline(
        polylineId: const PolylineId('route'),
        points: activePolyline,
        color: Colors.blue,
        width: 4,
      ),
    };
  }

  Widget _buildInfoCard() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.statusText,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.access_time,
                  size: 18,
                  color: Colors.black54,
                ),
                const SizedBox(width: 8),
                Text(
                  widget.etaText,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class LatLngTween extends Tween<LatLng> {
  LatLngTween({required LatLng begin, required LatLng end})
      : super(begin: begin, end: end);

  @override
  LatLng lerp(double t) {
    final lat = begin!.latitude + (end!.latitude - begin!.latitude) * t;
    final lng = begin!.longitude + (end!.longitude - begin!.longitude) * t;
    return LatLng(lat, lng);
  }
}
