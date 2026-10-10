'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { writeCookie } from './i18n';

export type ThemePref = 'light' | 'dark' | 'system';

type Ctx = { pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void };
const ThemeContext = createContext<Ctx | null>(null);

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ initialPref, children }: { initialPref: ThemePref; children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(initialPref);
  const [dark, setDark] = useState(initialPref === 'dark');

  useEffect(() => {
    const apply = () => {
      const d = pref === 'dark' || (pref === 'system' && systemDark());
      document.documentElement.classList.toggle('dark', d);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', d ? '#0D0D0F' : '#FFFFFF');
      setDark(d);
    };
    apply();
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    writeCookie('kap_theme', p);
    setPrefState(p);
  }, []);

  return <ThemeContext.Provider value={{ pref, dark, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme outside ThemeProvider');
  return ctx;
}

/** Runs before first paint so there's no light flash on dark devices. */
