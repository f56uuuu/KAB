import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/components/kab_states.dart';
import 'package:kab_core/auth/auth_provider.dart';

enum _Range { today, week, month }

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  _Range _range = _Range.today;

  DateTime get _rangeStart {
    final now = DateTime.now();
    switch (_range) {
      case _Range.today:
        return DateTime(now.year, now.month, now.day);
      case _Range.week:
        return now.subtract(Duration(days: now.weekday - 1));
      case _Range.month:
        return DateTime(now.year, now.month, 1);
    }
  }

  Future<List<Map<String, dynamic>>> _fetchTransactions() async {
    final client = ref.read(supabaseClientProvider);
    final driverId = ref.read(authRepositoryProvider).currentUser?.id;
    if (driverId == null) return [];

    final wallet = await client
        .from('wallets')
        .select('id')
        .eq('owner_type', 'driver')
        .eq('owner_id', driverId)
        .maybeSingle();
    if (wallet == null) return [];

    final rows = await client
        .from('wallet_transactions')
        .select()
        .eq('wallet_id', wallet['id'])
        .gte('created_at', _rangeStart.toIso8601String())
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(rows);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: _Range.values.map((r) {
                final selected = r == _range;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _range = r),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: selected ? KabColors.accent : Colors.transparent,
                        border: Border.all(color: selected ? KabColors.accent : KabColors.lightBorder),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        r.name[0].toUpperCase() + r.name.substring(1),
                        style: TextStyle(
                          color: selected ? KabColors.onAccent : KabColors.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              key: ValueKey(_range),
              future: _fetchTransactions(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const KabLoadingView();
                }
                final txs = snapshot.data ?? [];
                if (txs.isEmpty) {
                  return const KabEmptyView(title: 'No earnings in this period yet', icon: Icons.wallet_outlined);
                }

                final total = txs.fold<double>(0, (sum, t) => sum + (t['amount'] as num).toDouble());

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: Text('Total: ${total.toStringAsFixed(2)}',
                          style: Theme.of(context).textTheme.headlineSmall),
                    ),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: txs.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final t = txs[i];
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(t['type']),
                            subtitle: Text(t['created_at'].toString()),
                            trailing: Text(
                              '${t['amount']}',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: (t['amount'] as num) < 0 ? KabColors.danger : KabColors.success,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
