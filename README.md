# KAP Monorepo

Package/folder names still say `kab_*` internally (renaming every identifier
is pure churn with zero user-facing value) — but every user-facing string,
the app icon, and the color palette are the official **KAP** brand from the
brand book (`assets/brand/`).

## Brand
- Colors: Primary Yellow `#FFD100`, Deep Black `#0D0D0F`, Neutral Gray `#A1A1A1`, White `#FFFFFF`
- Typeface: Tajawal
- Tagline: "TAXI & DELIVERY" / "سرعة .. أمان .. ثقة"
- App icon source: `assets/brand/app_icon.png` (also copied into each app's `assets/icon/`)

To generate real Android/iOS launcher icons from it, in each Flutter app:
```
dart run flutter_launcher_icons
```

## Structure
- `apps/customer_app` — Flutter customer app (Android/iOS)
- `apps/driver_app` — Flutter driver app (Android/iOS)
- `apps/web_app` — **real customer-facing web app (installable PWA)**, Next.js, talks directly to the live Supabase backend and real Google Maps — deployable TODAY (see below), independently of the Flutter apps
- `apps/admin_dashboard` — **External** Next.js Super Admin web dashboard (separate deployment, e.g. `admin.kab.app`) — not bundled with the mobile apps
- `packages/kab_core` — auth, permissions, language persistence
- `packages/kab_design_system` — colors, typography, theme, buttons, cards, loading/empty/error states, phone breakpoints
- `packages/kab_localization` — ARB translations (ar/en so far), RTL/LTR directionality, dynamic CMS translations
- `packages/kab_maps` — map provider abstraction, Google Maps implementation, periodic offline cache refresh
- `supabase/functions` — Edge Functions (verify-driver-arrival, auto-refund-sweep)
- `supabase_migrations/` (repo root, sibling to `kab/`) — all SQL, run in order 001 → 011

## Launching `web_app` today
This is a normal Next.js site (not a sandboxed Claude Artifact), so it can call your live Supabase project and load the real Google Maps JS API directly — no platform restrictions here.

1. Apply every file in `supabase_migrations/` (001 → 011) to your Supabase project, in order, if you haven't already.
2. In [Google Cloud Console], create a **browser-restricted** Maps JavaScript API key (HTTP referrer restriction = your deployed domain — never ship an unrestricted key, section 105).
3. ```
   cd apps/web_app
   npm install
   cp .env.example .env.local   # fill in Supabase + Maps values
   npm run dev                  # verify locally first
   ```
4. Deploy: push this repo to GitHub, import `apps/web_app` as the root directory in [Vercel](https://vercel.com/new), set the same three env vars in the Vercel project settings, and deploy. That's a live, public HTTPS URL within minutes — same day.
5. On a phone, opening that URL and choosing "Add to Home Screen" (iOS Safari) or the automatic install prompt (Android Chrome) installs it like a native app — the manifest (`app/manifest.ts`) and service worker (`public/sw.js`) are already wired for this.

What `web_app` covers today: phone/OTP login, Home services grid, full ride request flow (real Places autocomplete, real driving-distance pricing from `pricing_rules`, ride creation), and live ride tracking (realtime status + driver info via the secure `get_driver_public_profile` RPC). Delivery, Marketplace, Gifts etc. follow the same pattern in later passes.

## Running the database
Apply `supabase_migrations/001_core_schema.sql` through `008_admin_seed.sql` in order, in the Supabase SQL editor or via `supabase db push`. Then deploy the two Edge Functions and register the cron schedule in `007_scheduled_jobs.sql` (replace `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` first).

## Running the customer app
```
cd apps/customer_app
flutter pub get
flutter run --dart-define=SUPABASE_URL=https://<ref>.supabase.co --dart-define=SUPABASE_ANON_KEY=<anon-key>
```

## Running the admin dashboard
```
cd apps/admin_dashboard
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```
The first Super Admin must be promoted manually once — see the comment at the bottom of `supabase_migrations/008_admin_seed.sql`.

## Why the admin dashboard is a separate Next.js app, not Flutter Web
A data-heavy, table/chart-driven admin panel loads and updates faster as a server-rendered Next.js app than as a Flutter Web bundle, and it deploys independently from the mobile app release cycle — Super Admin can ship a fix to the dashboard without touching the customer/driver apps at all.
