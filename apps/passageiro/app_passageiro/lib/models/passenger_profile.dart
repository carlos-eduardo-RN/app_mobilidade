class PassengerProfile {
  final String id;
  final String name;
  final String email;
  final String phone;

  const PassengerProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
  });

  factory PassengerProfile.fromJson(Map<String, dynamic> json) {
    return PassengerProfile(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
    );
  }
}
