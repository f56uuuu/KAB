import './globals.css';
import { cookies } from 'next/headers';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { MaintenanceGate } from '@/components/MaintenanceGate';
import { OfflineBanner } from '@/components/OfflineBanner';
import { I18nProvider } from '@/lib/i18n';
import { isLang, langInfo, type Lang } from '@/lib/langs';
import { ThemeProvider, type ThemePref } from '@/lib/theme';
import { themeBootScript } from '@/lib/theme-boot';

export const metadata = {
  title: 'KAP — كاب',
  description: 'سرعة .. أمان .. ثقة — رحلات، توصيل، طعام ومتجر في تطبيق واحد.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'KAP' },
  authors: [{ name: 'Ahmed Ihsan Hussein' }],
  creator: 'Ahmed Ihsan Hussein',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = cookies();
  const langCookie = c.get('kap_lang')?.value;
  const lang: Lang = isLang(langCookie) ? langCookie : 'ar';
  const themeCookie = c.get('kap_theme')?.value;
  const theme: ThemePref = themeCookie === 'light' || themeCookie === 'dark' ? themeCookie : 'system';

  return (
    <html lang={lang} dir={langInfo(lang).dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preload" as="image" href="/brand/kap-icon-512.webp" type="image/webp" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-kap min-h-screen">
        {/* opening animation: plays once per app launch (skipped by the boot script on later page loads) */}
        <div id="kap-splash" aria-hidden="true">
          <div className="kap-splash-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/kap-icon-512.webp" alt="" width={124} height={124} fetchPriority="high" />
            <span className="kap-splash-shine" />
          </div>
          <span className="kap-splash-bar" />
        </div>
        <ThemeProvider initialPref={theme}>
          <I18nProvider initialLang={lang}>
            <ServiceWorkerRegistration />
            <MaintenanceGate />
            <OfflineBanner />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
