import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_design_system/colors.dart';
import '../home/home_screen.dart';

class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  final _controller = TextEditingController();
  int _resendCooldown = 30;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  void _startCooldown() {
    _resendCooldown = 30;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendCooldown <= 1) {
        t.cancel();
      }
      if (mounted) setState(() => _resendCooldown--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_controller.text.trim().length < 4) return;
    await ref.read(otpFlowProvider.notifier).verifyCode(_controller.text.trim());
    final state = ref.read(otpFlowProvider);
    if (state.step == OtpStep.done && mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    }
  }

  Future<void> _resend() async {
    final phone = ref.read(otpFlowProvider).phoneE164;
    if (phone == null) return;
    await ref.read(otpFlowProvider.notifier).sendOtp(phone);
    _startCooldown();
  }

  @override
  Widget build(BuildContext context) {
    final otpState = ref.watch(otpFlowProvider);

    return Scaffold(
      appBar: AppBar(),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Enter the code we sent you', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              otpState.phoneE164 ?? '',
              style: TextStyle(color: KabColors.lightTextSecondary),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _controller,
              keyboardType: TextInputType.number,
              autofocus: true,
              textAlign: TextAlign.center,
              maxLength: 6,
              style: const TextStyle(fontSize: 28, letterSpacing: 8, fontWeight: FontWeight.w700),
              decoration: const InputDecoration(counterText: '', hintText: '••••••'),
            ),
            if (otpState.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(otpState.errorMessage!, style: const TextStyle(color: KabColors.danger), textAlign: TextAlign.center),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: otpState.isLoading ? null : _verify,
              child: otpState.isLoading
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                    )
                  : const Text('Verify'),
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                onPressed: _resendCooldown <= 0 ? _resend : null,
                child: Text(_resendCooldown > 0 ? 'Resend code in ${_resendCooldown}s' : 'Resend code'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
