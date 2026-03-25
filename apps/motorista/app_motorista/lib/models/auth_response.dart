class AuthResponse {
  final String token;
  final Map<String, dynamic> user;
  final String tokenField;
  final String userField;

  AuthResponse({
    required this.token,
    required this.user,
    required this.tokenField,
    required this.userField,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final directToken = _firstStringEntry(json, const [
      'accessToken',
      'token',
      'jwt',
    ]);
    final nestedTokens = _mapValue(json['tokens']);
    final nestedToken = nestedTokens == null
        ? null
        : _firstStringEntry(nestedTokens, const [
            'accessToken',
            'token',
            'jwt',
          ]);
    final resolvedToken = directToken?.value ?? nestedToken?.value;

    if (resolvedToken == null || resolvedToken.isEmpty) {
      throw const FormatException('Token não encontrado na resposta');
    }

    final directUser = _mapValue(json['user']);
    final directDriver = _mapValue(json['driver']);

    return AuthResponse(
      token: resolvedToken,
      tokenField: directToken?.key ?? 'tokens.${nestedToken!.key}',
      user: directUser ?? directDriver ?? <String, dynamic>{},
      userField: directUser != null
          ? 'user'
          : directDriver != null
          ? 'driver'
          : 'none',
    );
  }

  static MapEntry<String, String>? _firstStringEntry(
    Map<String, dynamic> json,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = json[key];
      final text = value?.toString();
      if (text != null && text.isNotEmpty) {
        return MapEntry(key, text);
      }
    }
    return null;
  }

  static Map<String, dynamic>? _mapValue(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return null;
  }
}
