class DriverModel {
  final String id;
  final String name;
  final double? rating;
  final String? photoUrl;

  const DriverModel({
    required this.id,
    required this.name,
    this.rating,
    this.photoUrl,
  });
}
