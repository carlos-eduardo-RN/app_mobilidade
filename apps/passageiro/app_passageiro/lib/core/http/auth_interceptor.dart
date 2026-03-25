import 'package:app_passageiro/controllers/session_controller.dart';
import 'package:http/http.dart' as http;

class AuthInterceptor extends http.BaseClient {
  final http.Client _inner;

  AuthInterceptor(this._inner);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final token = SessionController.instance.accessToken.value;
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    return _inner.send(request);
  }
}
