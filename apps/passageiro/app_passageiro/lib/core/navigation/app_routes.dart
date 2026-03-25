import 'package:flutter/material.dart';
import 'package:app_passageiro/controllers/auth_controller.dart';
import 'package:app_passageiro/controllers/profile_controller.dart';
import 'package:app_passageiro/controllers/ride_controller.dart';
import 'package:app_passageiro/features/auth/login_page.dart';
import 'package:app_passageiro/features/auth/register_page.dart';
import 'package:app_passageiro/features/profile/profile_page.dart';
import 'package:app_passageiro/features/ride/ride_flow.dart';
import 'package:app_passageiro/features/splash/splash_page.dart';
import 'package:app_passageiro/screens/home/home_page.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class AppRoutes {
  static const splash = '/';
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';
  static const profile = '/profile';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => const SplashPage());

      case login:
        return MaterialPageRoute(builder: (_) => const LoginPage());

      case register:
        return MaterialPageRoute(builder: (_) => const RegisterPage());

      case home:
        return MaterialPageRoute(
          builder: (context) => Stack(
            children: [
              ValueListenableBuilder(
                valueListenable: ProfileController.instance.profile,
                builder: (_, profile, __) {
                  ProfileController.instance.ensureLoaded();
                  return HomePage(
                    fallbackPosition: const LatLng(-23.5505, -46.6333),
                    userName: profile?.name ?? 'Passageiro',
                    userEmail: profile?.email ?? 'carregando...',
                    onOpenProfile: () {
                      Navigator.pushNamed(context, AppRoutes.profile);
                    },
                    onLogout: () async {
                      await AuthController.instance.logout();
                      RideController.instance.clearRide();
                      if (context.mounted) {
                        Navigator.of(context).pushNamedAndRemoveUntil(
                          AppRoutes.login,
                          (_) => false,
                        );
                      }
                    },
                  );
                },
              ),
              const RideFlow(),
            ],
          ),
        );

      case profile:
        return MaterialPageRoute(builder: (_) => const ProfilePage());

      default:
        return MaterialPageRoute(
          builder: (_) =>
              const Scaffold(body: Center(child: Text('Rota não encontrada'))),
        );
    }
  }
}
