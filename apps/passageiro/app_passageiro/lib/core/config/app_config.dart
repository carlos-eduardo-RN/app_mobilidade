class AppConfig {
  // IP do backend local para desenvolvimento.
  static const String _devHost = '192.168.1.70';
  static const String _prodHost = 'api.voudemoto.com';
  static const String _port = '3000';

  // Overrides opcionais via dart-define:
  // --dart-define=VDM_API_HOST=192.168.1.70
  // --dart-define=VDM_USE_PROD=true
  static const String _hostOverride = String.fromEnvironment('VDM_API_HOST');
  static const bool _useProdHost = bool.fromEnvironment(
    'VDM_USE_PROD',
    defaultValue: false,
  );

  static String get apiBaseUrl {
    final host = _getHost();
    const protocol = 'http';
    return '$protocol://$host:$_port/api';
  }

  static String get wsBaseUrl {
    final host = _getHost();
    const protocol = 'ws';
    return '$protocol://$host:$_port';
  }

  static String _getHost() {
    if (_hostOverride.isNotEmpty) return _hostOverride;
    if (_useProdHost) return _prodHost;
    return _devHost;
  }
}
