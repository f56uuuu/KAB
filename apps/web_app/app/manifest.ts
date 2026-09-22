import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KAP — التنقل والتوصيل',
    short_name: 'KAP',
    description: 'سرعة .. أمان .. ثقة — كل خدمات النقل والتوصيل في تطبيق واحد.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0D0F',
    theme_color: '#0D0D0F',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
