import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:app_passageiro/widgets/map_view.dart';

class DestinationSelection {
  final String label;
  final LatLng location;

  const DestinationSelection({
    required this.label,
    required this.location,
  });
}

class DestinationSearchScreen extends StatefulWidget {
  final LatLng currentLocation;
  final String initialQuery;

  const DestinationSearchScreen({
    super.key,
    required this.currentLocation,
    this.initialQuery = '',
  });

  @override
  State<DestinationSearchScreen> createState() => _DestinationSearchScreenState();
}

class _DestinationSearchScreenState extends State<DestinationSearchScreen> {
  late final TextEditingController _searchController;
  late LatLng _selectedDestination;
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.initialQuery);
    _selectedDestination = LatLng(
      widget.currentLocation.latitude + 0.004,
      widget.currentLocation.longitude + 0.004,
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onMapTap(LatLng destination) {
    setState(() {
      _selectedDestination = destination;
    });
  }

  Future<void> _focusCurrentSelection() async {
    if (_mapController == null) return;
    await _mapController!.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: _selectedDestination, zoom: 16),
      ),
    );
  }

  String _buildDestinationLabel() {
    final text = _searchController.text.trim();
    if (text.isNotEmpty) return text;
    return 'Destino (${_selectedDestination.latitude.toStringAsFixed(5)}, '
        '${_selectedDestination.longitude.toStringAsFixed(5)})';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF151515),
        title: const Text(
          'Selecionar destino',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Digite o endereço de destino',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: const Color(0xFFF2F2F2),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                MapView(
                  initialCameraPosition: CameraPosition(
                    target: widget.currentLocation,
                    zoom: 15,
                  ),
                  onMapCreated: (controller) => _mapController = controller,
                  onTap: _onMapTap,
                  markers: {
                    Marker(
                      markerId: const MarkerId('pickup'),
                      position: widget.currentLocation,
                      icon: BitmapDescriptor.defaultMarkerWithHue(
                        BitmapDescriptor.hueGreen,
                      ),
                      infoWindow: const InfoWindow(title: 'Embarque'),
                    ),
                    Marker(
                      markerId: const MarkerId('destination'),
                      position: _selectedDestination,
                      icon: BitmapDescriptor.defaultMarkerWithHue(
                        BitmapDescriptor.hueRed,
                      ),
                      infoWindow: const InfoWindow(title: 'Destino'),
                    ),
                  },
                  polylines: {
                    Polyline(
                      polylineId: const PolylineId('preview-route'),
                      points: [widget.currentLocation, _selectedDestination],
                      width: 4,
                      color: const Color(0xFF111111),
                    ),
                  },
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: FloatingActionButton.small(
                    heroTag: 'focus-destination',
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    onPressed: _focusCurrentSelection,
                    child: const Icon(Icons.my_location),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop(
                      DestinationSelection(
                        label: _buildDestinationLabel(),
                        location: _selectedDestination,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF111111),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'CONFIRMAR DESTINO',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
