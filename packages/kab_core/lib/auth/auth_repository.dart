import 'package:supabase_flutter/supabase_flutter.dart';

/// Single source of truth for authentication.
/// The UI never talks to Supabase directly — only through this repository,
/// so auth logic (retry, error mapping, device registration) lives in one place.
class AuthRepository {
  AuthRepository(this._client);
  final SupabaseClient _client;

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  User? get currentUser => _client.auth.currentUser;

  bool get isLoggedIn => currentUser != null;

  /// Step 1 of phone auth: send OTP.
  /// Returns nothing on success; throws AuthException on failure (mapped upstream to user-facing text).
  Future<void> sendOtp({required String phoneE164}) async {
    await _client.auth.signInWithOtp(phone: phoneE164);
  }

  /// Step 2 of phone auth: verify the code the user typed.
  Future<void> verifyOtp({
    required String phoneE164,
    required String code,
    String? preferredLanguage,
    String? currencyCode,
  }) async {
    await _client.auth.verifyOTP(
      phone: phoneE164,
      token: code,
      type: OtpType.sms,
      // Passed through to handle_new_auth_user() trigger on first signup only.
      // Ignored by Supabase on subsequent logins for an existing user.
    );
  }

  /// Registers/updates this device for push notifications + "logout all devices" support.
  Future<void> registerDevice({
    required String deviceId,
    required String platform,
    String? pushToken,
    String? appVersion,
  }) async {
    final userId = currentUser?.id;
    if (userId == null) return;
    await _client.from('user_devices').upsert({
      'user_id': userId,
      'device_id': deviceId,
      'platform': platform,
      'push_token': pushToken,
      'app_version': appVersion,
      'last_seen_at': DateTime.now().toIso8601String(),
    }, onConflict: 'user_id,device_id');
  }

  Future<List<Map<String, dynamic>>> listDevices() async {
    final userId = currentUser?.id;
    if (userId == null) return [];
    final res = await _client
        .from('user_devices')
        .select()
        .eq('user_id', userId)
        .order('last_seen_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  /// Logs out just the current device.
  Future<void> signOut() => _client.auth.signOut();

  /// Logs out every device (section 85: "Logout All Devices").
  /// Supabase's global sign-out revokes all refresh tokens for this user.
  Future<void> signOutAllDevices() =>
      _client.auth.signOut(scope: SignOutScope.global);
}
