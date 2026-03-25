import 'package:flutter/material.dart';

import '../../screens/auth/login_screen.dart';
import '../../screens/auth/register_screen.dart';
import '../../widgets/auth_gate.dart';
import '../../screens/profile/driver_profile_page.dart';

class AppRoutes {
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';

  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());

      case register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());

      case home:
        return MaterialPageRoute(builder: (_) => const AuthGate());

      case DriverProfilePage.routeName:
        final args = settings.arguments;
        if (args is DriverProfilePageArgs) {
          return MaterialPageRoute(
            builder: (_) => DriverProfilePage(
              driverName: args.driverName,
              accountBalance: args.accountBalance,
              rides: args.rides,
              onLogout: args.onLogout,
            ),
          );
        }

        return MaterialPageRoute(
          builder: (_) => DriverProfilePage(
            driverName: 'Motorista',
            accountBalance: 0,
            rides: const [],
            onLogout: () {},
          ),
        );
    }

    return null;
  }
}
