import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/components/kab_states.dart';
import 'package:kab_core/auth/auth_provider.dart';

const _statusColor = {
  'PENDING': KabColors.warning,
  'APPROVED': KabColors.success,
  'REJECTED': KabColors.danger,
  'EXPIRED': KabColors.danger,
  'RE_UPLOAD_REQUIRED': KabColors.warning,
};

class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.watch(supabaseClientProvider);
    final driverId = ref.watch(authRepositoryProvider).currentUser?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: FutureBuilder(
        future: driverId == null
            ? Future.value(<Map<String, dynamic>>[])
            : client.from('driver_documents').select().eq('driver_id', driverId),
        builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
          if (!snapshot.hasData) return const KabLoadingView();
          final docs = snapshot.data!;
          if (docs.isEmpty) {
            return const KabEmptyView(title: 'No documents uploaded yet', icon: Icons.description_outlined);
          }
          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: docs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final doc = docs[i] as Map<String, dynamic>;
              final color = _statusColor[doc['status']] ?? KabColors.lightTextSecondary;
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: KabColors.lightBorder),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(doc['doc_type'], style: const TextStyle(fontWeight: FontWeight.w600)),
                          if (doc['expires_at'] != null) ...[
                            const SizedBox(height: 4),
                            Text('Expires ${doc['expires_at']}', style: TextStyle(color: KabColors.lightTextSecondary, fontSize: 12)),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
                      child: Text(doc['status'], style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
