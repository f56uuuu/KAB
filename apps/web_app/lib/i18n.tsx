'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { en, type Key } from './locales/en';
import { ar } from './locales/ar';
import { ku } from './locales/ku';
import { tr } from './locales/tr';

import { LANGS, isLang, langInfo, prefersArabicScript, type Lang } from './langs';
export { LANGS, isLang, langInfo, prefersArabicScript, type Lang };

const DICTS: Record<Lang, Partial<Record<Key, string>>> = { en, ar, ku, tr };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let s = DICTS[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

type Ctx = {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  locale: string;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
  /** Pick the Arabic or English variant of DB content */
  pick: (arText: string | null | undefined, enText: string | null | undefined) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    writeCookie('kap_lang', l);
    const info = langInfo(l);
    document.documentElement.lang = l;
    document.documentElement.dir = info.dir;
    setLangState(l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const info = langInfo(lang);
    return {
      lang,
      dir: info.dir,
      locale: info.locale,
      t: (key, vars) => translate(lang, key, vars),
      setLang,
      pick: (a, e) => (prefersArabicScript(lang) ? a || e || '' : e || a || ''),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
