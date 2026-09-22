import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_repository.dart';

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});

/// True once we know for certain whether the user is logged in.
/// The splash/onboarding flow watches this instead of guessing from a timer.
final authStateProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges;
});

final isLoggedInProvider = Provider<bool>((ref) {
  final auth = ref.watch(authStateProvider).valueOrNull;
  return auth?.session != null;
});

/// OTP flow state — kept simple on purpose (section 26 principle applies
/// beyond driver matching: don't build a complex state machine before it's needed).
enum OtpStep { enterPhone, enterCode, done }

class OtpFlowState {
  const OtpFlowState({
    this.step = OtpStep.enterPhone,
    this.phoneE164,
    this.isLoading = false,
    this.errorMessage,
  });

  final OtpStep step;
  final String? phoneE164;
  final bool isLoading;
  final String? errorMessage;

  OtpFlowState copyWith({
    OtpStep? step,
    String? phoneE164,
    bool? isLoading,
    String? errorMessage,
  }) {
    return OtpFlowState(
      step: step ?? this.step,
      phoneE164: phoneE164 ?? this.phoneE164,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class OtpFlowNotifier extends StateNotifier<OtpFlowState> {
  OtpFlowNotifier(this._repo) : super(const OtpFlowState());
  final AuthRepository _repo;

  Future<void> sendOtp(String phoneE164) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repo.sendOtp(phoneE164: phoneE164);
      state = state.copyWith(
        step: OtpStep.enterCode,
        phoneE164: phoneE164,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapError(e));
    }
  }

  Future<void> verifyCode(String code) async {
    if (state.phoneE164 == null) return;
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repo.verifyOtp(phoneE164: state.phoneE164!, code: code);
      state = state.copyWith(step: OtpStep.done, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapError(e));
    }
  }

  // Every error becomes a short, human, translatable message — never a raw
  // exception string on screen (violates "Fast. Simple. Clear." principle).
  String _mapError(Object e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('rate limit')) return 'errors.otp_rate_limited';
    if (msg.contains('invalid')) return 'errors.otp_invalid_code';
    if (msg.contains('network') || msg.contains('socket')) {
      return 'errors.network_unreachable';
    }
    return 'errors.generic';
  }
}

final otpFlowProvider =
    StateNotifierProvider<OtpFlowNotifier, OtpFlowState>((ref) {
  return OtpFlowNotifier(ref.watch(authRepositoryProvider));
});
