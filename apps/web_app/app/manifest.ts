import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'KAP — التنقل والتوصيل',
    short_name: 'KAP',
    description: 'سرعة .. أمان .. ثقة — رحلات، توصيل، طعام ومتجر، وخرائط تعمل بدون إنترنت.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0D0D0F',
    theme_color: '#0D0D0F',
    lang: 'ar',
    dir: 'rtl',
    categories: ['travel', 'navigation', 'food', 'shopping', 'lifestyle'],
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'اطلب رحلة', short_name: 'رحلة', url: '/ride/new', icons: [{ src: '/icon-512.png', sizes: '512x512' }] },
      { name: 'خرائطي', short_name: 'خرائطي', url: '/map', icons: [{ src: '/icon-512.png', sizes: '512x512' }] },
      { name: 'أرسل طلبًا', short_name: 'توصيل', url: '/send', icons: [{ src: '/icon-512.png', sizes: '512x512' }] },
    ],
  };
}
