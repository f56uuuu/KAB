import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export const metadata = {
  title: 'KAP — التنقل والتوصيل',
  description: 'سرعة .. أمان .. ثقة — كل خدمات النقل والتوصيل في تطبيق واحد.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KAP',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-tajawal">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
