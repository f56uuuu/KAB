import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_design_system/colors.dart';
import 'otp_verification_screen.dart';

/// One field, one button — the entire first screen of account creation.
/// No name, no email, no password: phone + OTP is the whole flow (matches
/// the target markets' expectations and removes every field that could
/// make sign-up feel like a chore).
class PhoneEntryScreen extends ConsumerStatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  ConsumerState<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends ConsumerState<PhoneEntryScreen> {
  final _controller = TextEditingController();
  String _countryCode = '+964'; // Iraq default — matches the priority country list

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final digits = _controller.text.trim();
    if (digits.isEmpty) return;
    final e164 = '$_countryCode$digits';
    await ref.read(otpFlowProvider.notifier).sendOtp(e164);
    final state = ref.read(otpFlowProvider);
    if (state.step == OtpStep.enterCode && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const OtpVerificationScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final otpState = ref.watch(otpFlowProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              Text('Enter your phone number', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(
                'We\'ll send you a verification code',
                style: TextStyle(color: KabColors.lightTextSecondary),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  _CountryCodePicker(
                    value: _countryCode,
                    onChanged: (v) => setState(() => _countryCode = v),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      keyboardType: TextInputType.phone,
                      autofocus: true,
                      decoration: const InputDecoration(hintText: 'Phone number'),
                    ),
                  ),
                ],
              ),
              if (otpState.errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(otpState.errorMessage!, style: const TextStyle(color: KabColors.danger)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: otpState.isLoading ? null : _submit,
                child: otpState.isLoading
                    ? const SizedBox(
                        height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                      )
                    : const Text('Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Just the three priority countries for now (section 20/128 says the
/// architecture must support any country — this list grows without a
/// rebuild once Country Configuration (STEP admin) reads from the DB
/// instead of this hardcoded list).
class _CountryCodePicker extends StatelessWidget {
  const _CountryCodePicker({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  static const _codes = {'+964': '🇮🇶', '+971': '🇦🇪', '+963': '🇸🇾'};

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      height: 56,
      decoration: BoxDecoration(
        border: Border.all(color: KabColors.lightBorder),
        borderRadius: BorderRadius.circular(14),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          items: _codes.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text('${e.value} ${e.key}')))
              .toList(),
          onChanged: (v) => v != null ? onChanged(v) : null,
        ),
      ),
    );
  }
}
