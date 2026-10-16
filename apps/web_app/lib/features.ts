// Everything the super admin can switch on or off, in one list.
// A switch that has no row in feature_flags yet uses `def` (so new features ship in a known state).
// `server` notes where the database also enforces it, not only the screens.

import type { Flags } from '@/lib/hooks';

export type FeatureGroup = 'services' | 'home' | 'ordering' | 'maps' | 'partners' | 'system';

export type Feature = {
  key: string;
  group: FeatureGroup;
  def: boolean;
  ar: string;
  en: string;
  arSub: string;
  enSub: string;
  server?: boolean;
  /** shown to customers as "coming soon" until the service is built */
  soon?: boolean;
  danger?: boolean;
};

export const FEATURES: Feature[] = [
  // services on the home screen
  { key: 'RIDE', group: 'services', def: true, server: true, ar: 'تكسي', en: 'Taxi', arSub: 'طلب سيارة أو دراجة مع كابتن.', enSub: 'Book a car or bike with a captain.' },
  { key: 'DELIVERY', group: 'services', def: true, server: true, ar: 'توصيل طرود', en: 'Parcel delivery', arSub: 'إرسال الأغراض من الباب إلى الباب.', enSub: 'Send items door to door.' },
  { key: 'FOOD', group: 'services', def: true, server: true, ar: 'مطاعم', en: 'Restaurants', arSub: 'مطاعم ومقاهٍ وحلويات.', enSub: 'Restaurants, cafés and sweets.' },
  { key: 'MARKET', group: 'services', def: true, server: true, ar: 'متاجر', en: 'Stores', arSub: 'بقالة وصيدليات وورود. إيقافه يوقف الصيدليات والهدايا أيضًا.', enSub: 'Grocery, pharmacies and flowers. Turning it off also hides pharmacies and gifts.' },
  { key: 'PHARMACY', group: 'services', def: true, ar: 'صيدليات', en: 'Pharmacies', arSub: 'مربع الصيدليات في الرئيسية.', enSub: 'The pharmacies tile on the home screen.' },
  { key: 'GIFTS', group: 'services', def: true, ar: 'هدايا وورود', en: 'Gifts & flowers', arSub: 'مربع الهدايا في الرئيسية (محلات الورد).', enSub: 'The gifts tile on the home screen (flower shops).' },
  { key: 'HOME_SERVICES', group: 'services', def: false, soon: true, ar: 'خدمات منزلية', en: 'Home services', arSub: 'تظهر للزبون بعلامة «قريبًا» حتى تُطلق الخدمة.', enSub: 'Shown as “coming soon” until the service launches.' },
  { key: 'CAR_SERVICES', group: 'services', def: false, soon: true, ar: 'خدمات السيارات', en: 'Car services', arSub: 'تظهر للزبون بعلامة «قريبًا» حتى تُطلق الخدمة.', enSub: 'Shown as “coming soon” until the service launches.' },

  // home screen sections
  { key: 'HOME_HERO', group: 'home', def: true, ar: 'الشريط المتحرك', en: 'Hero carousel', arSub: 'البطاقات الكبيرة المتحركة أعلى الرئيسية.', enSub: 'The large sliding cards at the top of home.' },
  { key: 'OFFERS', group: 'home', def: true, ar: 'العروض', en: 'Offers', arSub: 'بطاقة العروض وتبويب «العروض» وصفحتها.', enSub: 'The offers card, the Offers tab and its page.' },
  { key: 'HOME_STORES', group: 'home', def: true, ar: 'مطاعم قريبة منك', en: 'Nearby restaurants', arSub: 'قائمة المطاعم القريبة أسفل الرئيسية.', enSub: 'The nearby restaurants list on home.' },

  // ordering
  { key: 'COUPONS', group: 'ordering', def: true, server: true, ar: 'أكواد الخصم', en: 'Promo codes', arSub: 'خانة الكود عند الطلب. عند الإيقاف يرفض النظام أي كود.', enSub: 'The code field at checkout. When off, the system rejects every code.' },
  { key: 'RATINGS', group: 'ordering', def: true, ar: 'التقييم بعد الطلب', en: 'Ratings', arSub: 'النجوم والتعليق بعد انتهاء الرحلة أو الطلب.', enSub: 'Stars and a comment after a trip or order.' },

  // maps
  { key: 'MY_MAP', group: 'maps', def: true, ar: 'خرائطي والتوجيه', en: 'My map & navigation', arSub: 'الخريطة الشخصية والتوجيه إلى البيت والعمل.', enSub: 'Personal map and directions to home and work.' },
  { key: 'NAV_REPORTS', group: 'maps', def: true, ar: 'بلاغات الطريق', en: 'Road reports', arSub: 'زر الإبلاغ عن الزحام والحوادث والشرطة.', enSub: 'Reporting traffic, crashes and police.' },
  { key: 'VOICE_SEARCH', group: 'maps', def: true, ar: 'الأوامر الصوتية', en: 'Voice commands', arSub: 'زر الميكروفون في الخريطة.', enSub: 'The microphone button on the map.' },

  // partners
  { key: 'DRIVER_SIGNUP', group: 'partners', def: true, server: true, ar: 'تسجيل الكباتن', en: 'Captain sign-up', arSub: 'استقبال طلبات انضمام كباتن جدد. الكباتن الحاليون لا يتأثرون.', enSub: 'Accepting new captain applications. Existing captains are not affected.' },
  { key: 'STORE_DEVICE', group: 'partners', def: true, ar: 'شاشة المطعم', en: 'Store screen', arSub: 'شاشة استقبال الطلبات والطباعة على أجهزة المطاعم.', enSub: 'The order screen and printing on store devices.' },

  // system
  { key: 'TOUR', group: 'system', def: true, ar: 'الجولة التعريفية', en: 'Welcome tour', arSub: 'الشرح الذي يظهر للمستخدم الجديد.', enSub: 'The walkthrough new users see.' },
  { key: 'DEMO_MODE', group: 'system', def: false, server: true, danger: true, ar: 'وضع التجربة', en: 'Demo mode', arSub: 'كباتن ومطاعم وهميون يقبلون الطلبات تلقائيًا. أوقفه عند الإطلاق.', enSub: 'Fake captains and stores accept orders automatically. Turn off for launch.' },
];

export const GROUPS: { key: FeatureGroup; ar: string; en: string }[] = [
  { key: 'services', ar: 'الخدمات', en: 'Services' },
  { key: 'home', ar: 'الشاشة الرئيسية', en: 'Home screen' },
  { key: 'ordering', ar: 'الطلب والدفع', en: 'Ordering' },
  { key: 'maps', ar: 'الخرائط', en: 'Maps' },
  { key: 'partners', ar: 'الكباتن والمطاعم', en: 'Captains & stores' },
  { key: 'system', ar: 'النظام', en: 'System' },
];

const DEFAULTS: Record<string, boolean> = Object.fromEntries(FEATURES.map((f) => [f.key, f.def]));

/** On/off for a switch. While flags are still loading, defaults are used so screens don't flicker. */
export function isOn(flags: Flags | null | undefined, key: string) {
  if (flags && key in flags) return !!flags[key];
  return DEFAULTS[key] ?? true;
}
