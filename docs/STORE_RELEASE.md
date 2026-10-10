# KAP — Store release and production checklist

Live web app: https://kab-amber.vercel.app
Public pages the stores ask for (no sign-in needed):

| Requirement | URL |
|---|---|
| Privacy policy | https://kab-amber.vercel.app/privacy |
| Terms of use | https://kab-amber.vercel.app/terms |
| Account deletion (web link) | https://kab-amber.vercel.app/delete-account |
| Support / contact | https://kab-amber.vercel.app/support |

In-app account deletion: Account → Delete my account (RPC `delete_my_account`, migration v6).
Personal data is wiped and sign-in is blocked; trip/order/payment rows stay without identity.

---

## 1. Before any store submission (do these once)

- [ ] **Turn DEMO_MODE off**: Super admin → System. Demo mode must be off in production.
- [ ] **Fill the public contact details**: Super admin → System → settings
  `support_email`, `support_phone`, `support_whatsapp`, `company_name`.
  Both stores reject apps without a working support contact.
- [ ] **Remove test data** (rides 1–5, order 1, open delivery 1, "Test Driver") from Supabase.
- [ ] **Review admin accounts**: keep one `super_admin`; check the extra `admin` account.
- [ ] **Enable 2FA** on GitHub, Vercel and Supabase accounts that own the project.
- [ ] **Supabase Auth → SMS provider** (Twilio / MessageBird / Vonage) for real phone OTP, with rate limits.
- [ ] **Supabase backups**: enable Point-in-Time Recovery (Pro plan) or daily backups.
- [ ] **Custom domain** (e.g. `kap.iq`) on Vercel, then update the URLs in this file and in Supabase Auth → URL configuration.
- [ ] Re-check the Privacy and Terms text with a local lawyer for Iraq / UAE / Syria (the texts are a solid base, not legal advice).

## 2. Google Play (Android)

The app ships to Play as a **Trusted Web Activity** (TWA): the same web app, full screen, no browser bar.

### Build
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://kab-amber.vercel.app/manifest.webmanifest
#   package id: app.kap.iq     (choose once — it can never change)
#   app name: KAP — كاب        launcher name: KAP
#   theme/background: #0D0D0F  start url: /
#   enable "Location delegation" (yes) and "Notification delegation" (yes)
bubblewrap build            # produces app-release-bundle.aab
```
Keep the generated `android.keystore` and its passwords in a password manager. Losing it means you cannot update the app.

### Digital Asset Links (removes the browser bar)
1. In Play Console → App integrity → App signing, copy the **SHA-256 certificate fingerprint**.
2. Create `apps/web_app/public/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": { "namespace": "android_app", "package_name": "app.kap.iq",
              "sha256_cert_fingerprints": ["AA:BB:...:ZZ"] }
}]
```
3. Deploy, then check https://kab-amber.vercel.app/.well-known/assetlinks.json opens.

### Play Console answers
- **App category**: Maps & Navigation (or Travel & Local).
- **Target audience**: 18+ only. Not designed for children.
- **Content rating (IARC)**: no violence/sexual content; users can interact (chat with captain/support) → answer "Yes, users can interact"; shares location → "Yes".
- **Ads**: No ads.
- **Data safety** form:

| Data type | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Precise location | Yes | Yes (with the assigned captain only) | App functionality | Required for rides |
| Phone number | Yes | Yes (masked to captain where available) | Account management | Required |
| Name | Yes | Yes (first name to captain) | App functionality | Optional |
| Photos/files (captains' documents) | Yes | No | Verification / fraud prevention | Captains only |
| Purchase history (trips/orders) | Yes | No | App functionality | Required |
| App interactions, crash logs | Yes | No | Analytics / diagnostics | Required |

  Data is encrypted in transit: **Yes**. Users can request deletion: **Yes** → give the `/delete-account` URL.
- **Location permission**: foreground only for customers. Captains share location only while "online" in the open app. Do **not** request `ACCESS_BACKGROUND_LOCATION`. If you add background tracking for captains later, you must fill the background-location declaration and record a video.
- **App access**: give reviewers a demo phone number + fixed OTP (Supabase Auth → Phone → test numbers), and say where to find the captain flow.
- **Financial features declaration**: "None" while payment is cash only.
- **Store listing**: name (≤30 chars), short description (≤80), full description (≤4000), icon 512×512, feature graphic 1024×500, at least 2 phone screenshots (1080×1920 recommended). Arabic and English listings.
- **Testing**: new personal developer accounts must run a closed test with **12+ testers for 14 days** before production access.

## 3. Apple App Store (iOS)

Apple rejects plain website wrappers (guideline 4.2), so the iOS app should be a **Capacitor** shell that uses native features: GPS, push notifications, the offline map, share sheet.

### Build (on a Mac with Xcode)
```bash
cd apps/web_app
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/geolocation @capacitor/push-notifications
npx cap init KAP app.kap.iq --web-dir=out
# server.url = https://kab-amber.vercel.app in capacitor.config.ts (or build a static export)
npx cap add ios && npx cap open ios
```
Info.plist purpose strings (Arabic + English):
- `NSLocationWhenInUseUsageDescription`: "KAP uses your location to set your pickup point, show nearby captains and track your trip."
- `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (captains uploading documents): "To upload your licence and vehicle documents for verification."
- `ITSAppUsesNonExemptEncryption` = `NO` (only standard HTTPS) — answers the export-compliance question.

### App Store Connect answers
- **Account deletion** (guideline 5.1.1(v)): in-app at Account → Delete my account. ✔
- **Sign in with Apple**: not required because the app only uses phone-number sign-in (no Google/Facebook login). If you add social login, you must add Sign in with Apple too.
- **Privacy nutrition labels**: Location (precise), Contact info (phone, name), Purchases, Identifiers (user ID), Diagnostics — all "Linked to you", **not** used for tracking. No third-party advertising.
- **App Privacy policy URL**: `/privacy`. **Support URL**: `/support`.
- **Age rating**: 17+ is not needed; answer "None" to all content questions → 4+, but set the service in the description as 18+ users.
- **Review notes**: demo phone number + OTP, a test captain account, and a sentence that payment is cash to the driver (no in-app purchases of digital goods, so Apple IAP does not apply — rides and food are physical services, guideline 3.1.3(e)).
- Screenshots: 6.7" (1290×2796) and 6.5" (1242×2688), at least 3 each.

## 4. Copyright and licences in the app

- KAP name, logo and design: owned by the operator (add a trademark registration in Iraq/UAE when possible).
- Map data: © OpenStreetMap contributors, ODbL — attribution is shown on every map and in Terms. Required; don't hide it.
- Map tiles: OpenFreeMap (free, commercial use allowed, no key). Routing: OSRM demo server and Nominatim — **for heavy production traffic, self-host OSRM/Nominatim or switch to a paid provider** (Nominatim's public server allows max 1 request/second and forbids bulk use).
- Fonts: Tajawal (SIL Open Font License). Icons: lucide (ISC). Emoji: system emoji.
- Do not use the Waze or Google Maps logos inside the app; the "Open in Waze/Google Maps" buttons use text only, which is allowed.

## 5. Offline maps — what works without internet

- The app shell, **My map** (`/map`), saved home/work/favourites and the last 20 routes open with no connection.
- Map areas you've viewed are cached automatically; "Save this area for offline use" downloads ~6 km around you and your saved places (zoom 8–15, up to ~2,500 tiles).
- Booking rides, orders and search need internet (prices and captains are live).
- Turn-by-turn voice navigation is handed to Waze / Google Maps.

## 6. Production go-live checklist

- [ ] DEMO_MODE off; test data removed; support contacts filled.
- [ ] Real SMS provider live; OTP rate limit set.
- [ ] Prices checked per city in Super admin → Pricing.
- [ ] At least one verified captain per launch city.
- [ ] Maintenance mode tested on/off.
- [ ] Privacy, Terms, Delete-account, Support pages open on a phone without sign-in.
- [ ] Offline test: open /map, save the area, turn on airplane mode, reopen the app.
- [ ] Play: closed test done, Data safety saved, assetlinks.json live.
- [ ] Apple: Capacitor build, purpose strings, demo account in review notes.
