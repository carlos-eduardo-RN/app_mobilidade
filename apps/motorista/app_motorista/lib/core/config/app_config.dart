class AppConfig {
  static const String _devHost = '192.168.1.70';
  static const String _prodHost = 'api.voudemoto.com';
  static const String _port = '3000';
  static const String _hostOverride = String.fromEnvironment('VDM_API_HOST');
  static const bool _useProdHost = bool.fromEnvironment(
    'VDM_USE_PROD',
    defaultValue: false,
  );

  static String get serverBaseUrl {
    final host = _getHost();
    final protocol = 'http';
    return '$protocol://$host:$_port';
  }

  static String get apiBaseUrl => '$serverBaseUrl/api';

  static String get wsBaseUrl {
    final host = _getHost();
    final protocol = 'ws';
    return '$protocol://$host:$_port';
  }

  static String _getHost() {
    if (_hostOverride.isNotEmpty) return _hostOverride;
    if (_useProdHost) return _prodHost;
    return _devHost;
  }
}
