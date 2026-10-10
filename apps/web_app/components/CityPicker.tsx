'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { flag, groupCities, useCities, type City } from '@/lib/cities';

// Picker strings live here so the picker stays self-contained.
const TXT: Record<string, { choose: string; search: string; none: string }> = {
  ar: { choose: 'اختر مدينتك', search: 'ابحث عن مدينة', none: 'لا توجد مدينة بهذا الاسم.' },
  en: { choose: 'Choose your city', search: 'Search cities', none: 'No city matches that name.' },
  ku: { choose: 'شارەکەت هەڵبژێرە', search: 'گەڕان بۆ شار', none: 'هیچ شارێک بەم ناوە نییە.' },
  tr: { choose: 'Şehrini seç', search: 'Şehir ara', none: 'Bu isimde bir şehir yok.' },
};

/** Opens a sheet listing each country with its cities in a fixed, readable order (with search). */
export function CityPicker({
  value,
  onChange,
  label,
  className = '',
  variant = 'inline',
}: {
  value: number | null;
  onChange: (id: number, city: City) => void;
  label?: string;
  className?: string;
  variant?: 'inline' | 'field';
}) {
  const { t, pick, locale, lang } = useI18n();
  const tx = TXT[lang] ?? TXT.en;
  const cities = useCities();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = cities.find((c) => c.id === value);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? cities.filter((c) => `${c.name} ${c.name_ar ?? ''}`.toLowerCase().includes(needle)) : cities;
    return groupCities(list, pick, locale);
  }, [cities, q, pick, locale]);

  const text = current ? `${flag(current.countries?.code)} ${pick(current.name_ar, current.name)}` : tx.choose;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ?? t('food.change_city')}
        className={
          variant === 'field'
            ? `w-full h-12 rounded-xl border border-border bg-background px-4 flex items-center gap-2 text-start ${className}`
            : `inline-flex items-center gap-1 font-extrabold ${className}`
        }
      >
        {variant === 'field' && <MapPin className="w-4 h-4 text-muted shrink-0" />}
        <span className={`truncate ${variant === 'field' ? 'flex-1' : ''} ${current ? '' : 'text-muted'}`}>{text}</span>
        <ChevronDown className="w-4 h-4 text-muted shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[3000] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tx.choose}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[85vh] bg-background rounded-t-sheet sm:rounded-3xl flex flex-col animate-slide-up"
          >
            <div className="p-5 pb-3 flex items-center gap-3">
              <h2 className="text-xl font-black flex-1">{tx.choose}</h2>
              <button onClick={() => setOpen(false)} aria-label={t('common.close')} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pb-3">
              <div className="h-11 rounded-xl bg-surface flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx.search} className="flex-1 bg-transparent outline-none text-sm font-medium" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto px-5 pb-6 safe-bottom">
              {groups.length === 0 && <p className="text-sm text-muted py-6 text-center">{tx.none}</p>}
              {groups.map((g) => (
                <section key={g.country.id} className="mb-4">
                  <h3 className="sticky top-0 bg-background py-2 text-sm font-extrabold text-muted flex items-center gap-2">
                    <span className="text-lg">{flag(g.country.code)}</span>
                    {pick(g.country.name_ar, g.country.name)}
                    <span className="font-medium">({g.cities.length})</span>
                  </h3>
                  <ul className="grid grid-cols-2 gap-2">
                    {g.cities.map((c) => {
                      const on = c.id === value;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onChange(c.id, c);
                              setOpen(false);
                              setQ('');
                            }}
                            className={`w-full h-11 rounded-xl px-3 flex items-center gap-2 text-sm font-bold border-2 ${on ? 'border-fg bg-surface' : 'border-transparent bg-surface/60'}`}
                          >
                            <span className="flex-1 truncate text-start">{pick(c.name_ar, c.name)}</span>
                            {on && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** For plain <select> elements (admin forms): countries as option groups in the same order. */
export function CityOptions({ cities }: { cities: City[] }) {
  const { pick, locale } = useI18n();
  return (
    <>
      {groupCities(cities, pick, locale).map((g) => (
        <optgroup key={g.country.id} label={`${flag(g.country.code)} ${pick(g.country.name_ar, g.country.name)}`}>
          {g.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(c.name_ar, c.name)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
