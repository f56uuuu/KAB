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
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-tajawal min-h-screen">
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
