import 'package:flutter/material.dart';

import '../../controllers/auth_controller.dart';
import '../../widgets/driver_state_router.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DriverStateRouter(onLogout: AuthController.instance.logout);
  }
}
