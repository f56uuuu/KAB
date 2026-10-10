// Language metadata — plain module so server components (layout) can use it too.
export type Lang = 'ar' | 'en' | 'ku' | 'tr';

// New languages are added here + one dictionary file — no other code changes.
export const LANGS: { code: Lang; name: string; dir: 'rtl' | 'ltr'; locale: string; hello: string }[] = [
  { code: 'ar', name: 'العربية', dir: 'rtl', locale: 'ar-IQ', hello: 'مرحبًا' },
  { code: 'en', name: 'English', dir: 'ltr', locale: 'en-GB', hello: 'Hello' },
  { code: 'ku', name: 'کوردی', dir: 'rtl', locale: 'ckb-IQ', hello: 'سڵاو' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', locale: 'tr-TR', hello: 'Merhaba' },
];

export function isLang(v: unknown): v is Lang {
  return v === 'ar' || v === 'en' || v === 'ku' || v === 'tr';
}

export function langInfo(lang: Lang) {
  return LANGS.find((l) => l.code === lang) ?? LANGS[0];
}

/** Content stored in Arabic + English only (store names, banners…) picks the closest script. */
export function prefersArabicScript(lang: Lang) {
  return lang === 'ar' || lang === 'ku';
}

