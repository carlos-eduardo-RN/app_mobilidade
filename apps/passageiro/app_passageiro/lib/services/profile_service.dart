import 'dart:convert';

import 'package:app_passageiro/core/config/app_config.dart';
import 'package:app_passageiro/models/passenger_profile.dart';
import 'package:http/http.dart' as http;

class ProfileService {
  ProfileService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _client;
  final String _baseUrl;

  Future<PassengerProfile> getProfile({required String token}) async {
    final uri = Uri.parse('$_baseUrl/passenger/profile');
    final response = await _client.get(uri, headers: _headers(token));

    if (response.statusCode == 401) {
      throw UnauthorizedException();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'ProfileService: HTTP ${response.statusCode} - ${response.body}',
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return PassengerProfile.fromJson(json);
  }

  Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };
}

class UnauthorizedException implements Exception {
  @override
  String toString() => 'UnauthorizedException';
}
