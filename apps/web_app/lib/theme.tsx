'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { writeCookie } from './i18n';

export type ThemePref = 'light' | 'dark' | 'system';

type Ctx = { pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void };
const ThemeContext = createContext<Ctx | null>(null);

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Switch the whole page between light and dark in one frame.
 * Safari (and to a lesser degree Firefox) can leave stale colours behind when CSS variables change while
 * colour transitions are running, or when composited layers (fixed/sticky bars, maps) skip a repaint.
 * So: freeze transitions, flip the class + color-scheme together, force a style flush and a repaint.
 */
export function applyTheme(d: boolean) {
  const root = document.documentElement;
  if (root.classList.contains('dark') === d && root.style.colorScheme === (d ? 'dark' : 'light')) return;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', d);
  root.style.colorScheme = d ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', d ? '#0D0D0F' : '#FFFFFF'));
  void root.offsetHeight; // flush styles with transitions disabled
  const body = document.body;
  body.style.transform = 'translateZ(0)'; // re-raster composited layers (WebKit)
  requestAnimationFrame(() => {
    body.style.transform = '';
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
  });
}

export function ThemeProvider({ initialPref, children }: { initialPref: ThemePref; children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(initialPref);
  const [dark, setDark] = useState(initialPref === 'dark');

  useEffect(() => {
    const apply = () => {
      const d = pref === 'dark' || (pref === 'system' && systemDark());
      applyTheme(d);
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
