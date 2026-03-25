import 'package:app_motorista/core/constants/ui_constants.dart';
import 'package:app_motorista/services/driver_service.dart';
import 'package:flutter/material.dart';

class EarningsPage extends StatefulWidget {
  const EarningsPage({super.key});

  @override
  State<EarningsPage> createState() => _EarningsPageState();
}

class _EarningsPageState extends State<EarningsPage> {
  final DriverService _driverService = DriverService();
  late Future<DriverEarningsSummary> _summaryFuture;

  @override
  void initState() {
    super.initState();
    _summaryFuture = _driverService.getEarningsSummary();
  }

  Future<void> _reload() async {
    setState(() {
      _summaryFuture = _driverService.getEarningsSummary();
    });
    await _summaryFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ganhos'),
      ),
      body: FutureBuilder<DriverEarningsSummary>(
        future: _summaryFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 40),
                    const SizedBox(height: 12),
                    const Text(
                      'Nao foi possivel carregar ganhos',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      snapshot.error.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: UiConstants.secondaryText),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _reload,
                      child: const Text('Tentar novamente'),
                    ),
                  ],
                ),
              ),
            );
          }

          final summary = snapshot.data ??
              const DriverEarningsSummary(today: 0, week: 0, rides: []);

          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                _AmountCard(
                  title: 'Ganhos de hoje',
                  amount: summary.today,
                  icon: Icons.today_outlined,
                ),
                const SizedBox(height: 12),
                _AmountCard(
                  title: 'Ganhos da semana',
                  amount: summary.week,
                  icon: Icons.date_range_outlined,
                ),
                const SizedBox(height: 20),
                const Text(
                  'Historico de corridas',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: UiConstants.primaryText,
                  ),
                ),
                const SizedBox(height: 10),
                if (summary.rides.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text(
                        'Nenhuma corrida registrada ainda.',
                        style: TextStyle(color: UiConstants.secondaryText),
                      ),
                    ),
                  )
                else
                  ...summary.rides.map(
                    (ride) => Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text('${ride.pickup} -> ${ride.destination}'),
                        subtitle: Text(
                          '${ride.status.toUpperCase()} • ${_formatDate(ride.date)}',
                        ),
                        trailing: Text(
                          _formatCurrency(ride.amount),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  static String _formatCurrency(double value) {
    final cents = (value * 100).round();
    final units = cents ~/ 100;
    final decimals = cents % 100;
    final unitsText = units
        .toString()
        .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
    return 'R\$ $unitsText,${decimals.toString().padLeft(2, '0')}';
  }

  static String _formatDate(DateTime value) {
    return '${value.day.toString().padLeft(2, '0')}/'
        '${value.month.toString().padLeft(2, '0')}/'
        '${value.year}';
  }
}

class _AmountCard extends StatelessWidget {
  final String title;
  final double amount;
  final IconData icon;

  const _AmountCard({
    required this.title,
    required this.amount,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: UiConstants.surface,
        borderRadius: BorderRadius.circular(UiConstants.cardRadius),
        boxShadow: const [UiConstants.cardShadow],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: UiConstants.surfaceMuted,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: UiConstants.accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: UiConstants.secondaryText,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _EarningsPageState._formatCurrency(amount),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: UiConstants.primaryText,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
