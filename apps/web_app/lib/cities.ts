'use client';

import { useEffect, useState } from 'react';
import { sb } from './hooks';

export type City = {
  id: number;
  name: string;
  name_ar: string | null;
  country_id: number;
  sort: number | null;
  latitude: number;
  longitude: number;
  is_active?: boolean;
  countries?: { id: number; code: string; name: string; name_ar: string | null; currency_code: string } | null;
};
export type CountryGroup = { country: NonNullable<City['countries']>; cities: City[] };

let cache: City[] | null = null;
let inflight: Promise<City[]> | null = null;

function load(all = false): Promise<City[]> {
  if (!all && cache) return Promise.resolve(cache);
  if (!all && inflight) return inflight;
  let q = sb()
    .from('cities')
    .select('id,name,name_ar,country_id,sort,latitude,longitude,is_active,countries(id,code,name,name_ar,currency_code)')
    .order('country_id')
    .order('sort')
    .order('name');
  if (!all) q = q.eq('is_active', true);
  const p = Promise.resolve(q).then(({ data }) => (data ?? []) as unknown as City[]);
  if (!all) {
    inflight = p.then((d) => (cache = d)).finally(() => (inflight = null));
    return inflight;
  }
  return p;
}

/** Active cities (cached for the visit); pass all=true in the admin to include switched-off ones. */
export function useCities(all = false) {
  const [cities, setCities] = useState<City[]>(all ? [] : cache ?? []);
  useEffect(() => {
    load(all).then(setCities);
  }, [all]);
  return cities;
}

export function flag(code?: string | null) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Countries in a fixed order, each with its cities: main cities first, then alphabetical in the reader's language. */
export function groupCities(cities: City[], pick: (ar: string | null | undefined, en: string | null | undefined) => string, locale: string): CountryGroup[] {
  const groups = new Map<number, CountryGroup>();
  for (const c of cities) {
    if (!c.countries) continue;
    if (!groups.has(c.country_id)) groups.set(c.country_id, { country: c.countries, cities: [] });
    groups.get(c.country_id)!.cities.push(c);
  }
  const out = [...groups.values()].sort((a, b) => a.country.id - b.country.id);
  for (const g of out)
    g.cities.sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100) || pick(a.name_ar, a.name).localeCompare(pick(b.name_ar, b.name), locale));
  return out;
}
