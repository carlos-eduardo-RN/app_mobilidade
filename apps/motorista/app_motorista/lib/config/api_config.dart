class ApiConfig {
  static const String baseUrl = 'http://192.168.1.70:3000';

  static String get wsBaseUrl {
    if (baseUrl.startsWith('https://')) {
      return baseUrl.replaceFirst('https://', 'wss://');
    }

    return baseUrl.replaceFirst('http://', 'ws://');
  }

  static Uri buildUri(String path) => Uri.parse('$baseUrl$path');

  static void logRequest(String path) {
    print('API REQUEST → $baseUrl$path');
  }
}
