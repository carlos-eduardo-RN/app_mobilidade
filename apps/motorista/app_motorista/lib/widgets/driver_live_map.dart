import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../helpers/map_helper.dart';
import '../models/ride_model.dart';

enum MapRouteType {
  none,
  toPickup,
  toDropoff,
}

class DriverLiveMap extends StatefulWidget {
  const DriverLiveMap({
    super.key,
    required this.driverLocation,
    required this.driverHeading,
    this.isMapFollowing,
    this.targetPosition,
    this.routeType = MapRouteType.none,
    this.zoom = 15,
    this.animationDuration = const Duration(milliseconds: 800),
  });

  final ValueListenable<LatLngModel> driverLocation;
  final ValueListenable<double> driverHeading;
  final ValueListenable<bool>? isMapFollowing;
  final LatLng? targetPosition;
  final MapRouteType routeType;
  final double zoom;
  final Duration animationDuration;

  @override
  State<DriverLiveMap> createState() => _DriverLiveMapState();
}

class _DriverLiveMapState extends State<DriverLiveMap>
    with SingleTickerProviderStateMixin {
  GoogleMapController? _mapController;
  late AnimationController _markerController;
  Animation<LatLng>? _markerAnimation;
  late LatLng _animatedPosition;

  @override
  void initState() {
    super.initState();
    _animatedPosition = _toLatLng(widget.driverLocation.value);
    _markerController = AnimationController(
      vsync: this,
      duration: widget.animationDuration,
    )..addListener(_onMarkerTick);
    widget.driverLocation.addListener(_onLocationChanged);
    widget.driverHeading.addListener(_onHeadingChanged);
  }

  @override
  void didUpdateWidget(covariant DriverLiveMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.driverLocation != widget.driverLocation) {
      oldWidget.driverLocation.removeListener(_onLocationChanged);
      widget.driverLocation.addListener(_onLocationChanged);
    }
    if (oldWidget.driverHeading != widget.driverHeading) {
      oldWidget.driverHeading.removeListener(_onHeadingChanged);
      widget.driverHeading.addListener(_onHeadingChanged);
    }
  }

  @override
  void dispose() {
    widget.driverLocation.removeListener(_onLocationChanged);
    widget.driverHeading.removeListener(_onHeadingChanged);
    _markerController
      ..removeListener(_onMarkerTick)
      ..dispose();
    _mapController?.dispose();
    super.dispose();
  }

  void _onMarkerTick() {
    final position = _markerAnimation?.value;
    if (position == null) return;
    setState(() {
      _animatedPosition = position;
    });
  }

  void _onLocationChanged() {
    final nextPosition = _toLatLng(widget.driverLocation.value);
    if (_animatedPosition == nextPosition) return;

    _markerController.stop();
    _markerAnimation = LatLngTween(
      begin: _animatedPosition,
      end: nextPosition,
    ).animate(CurvedAnimation(
      parent: _markerController,
      curve: Curves.easeOutCubic,
    ));
    _markerController.forward(from: 0);

    if (_shouldFollowMap()) {
      _animateCameraTo(nextPosition);
    }
  }

  void _onHeadingChanged() {
    setState(() {});
  }

  bool _shouldFollowMap() {
    final followNotifier = widget.isMapFollowing;
    if (followNotifier == null) return true;
    return followNotifier.value;
  }

  void _animateCameraTo(LatLng position) {
    final controller = _mapController;
    if (controller == null) return;

    final camera = CameraPosition(
      target: position,
      zoom: widget.zoom,
      bearing: widget.driverHeading.value,
      tilt: 0,
    );
    controller.animateCamera(CameraUpdate.newCameraPosition(camera));
  }

  Set<Marker> _buildMarkers() {
    final markers = <Marker>{
      MapHelper.createDriverMarker(
        position: _animatedPosition,
        heading: widget.driverHeading.value,
      ),
    };

    final target = widget.targetPosition;
    if (target != null) {
      final targetModel = LatLngModel(
        latitude: target.latitude,
        longitude: target.longitude,
      );
      switch (widget.routeType) {
        case MapRouteType.toPickup:
          markers.add(MapHelper.createPickupMarker(targetModel));
          break;
        case MapRouteType.toDropoff:
          markers.add(MapHelper.createDropoffMarker(targetModel));
          break;
        case MapRouteType.none:
          break;
      }
    }

    return markers;
  }

  Set<Polyline> _buildPolylines() {
    final target = widget.targetPosition;
    if (target == null) return {};

    final targetModel = LatLngModel(
      latitude: target.latitude,
      longitude: target.longitude,
    );

    switch (widget.routeType) {
      case MapRouteType.toPickup:
        return {
          MapHelper.createToPickupPolyline(
            driverPosition: _animatedPosition,
            pickupLocation: targetModel,
          ),
        };
      case MapRouteType.toDropoff:
        return {
          MapHelper.createToDropoffPolyline(
            driverPosition: _animatedPosition,
            dropoffLocation: targetModel,
          ),
        };
      case MapRouteType.none:
        return {};
    }
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: _animatedPosition,
        zoom: widget.zoom,
      ),
      onMapCreated: (controller) {
        _mapController = controller;
        if (_shouldFollowMap()) {
          _animateCameraTo(_animatedPosition);
        }
      },
      markers: _buildMarkers(),
      polylines: _buildPolylines(),
      myLocationEnabled: false,
      myLocationButtonEnabled: false,
      compassEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
    );
  }
}

class LatLngTween extends Tween<LatLng> {
  LatLngTween({required LatLng begin, required LatLng end})
      : super(begin: begin, end: end);

  @override
  LatLng lerp(double t) {
    final begin = this.begin;
    final end = this.end;
    if (begin == null || end == null) {
      return const LatLng(0, 0);
    }

    final lat = begin.latitude + (end.latitude - begin.latitude) * t;
    final lng = begin.longitude + (end.longitude - begin.longitude) * t;
    return LatLng(lat, lng);
  }
}

LatLng _toLatLng(LatLngModel source) {
  return LatLng(source.latitude, source.longitude);
}
