// Locale-aware formatting (numbers, money, dates) — section 126.

export function money(amount: number | string | null | undefined, currency: string | null | undefined, locale: string) {
  const n = Number(amount ?? 0);
  const cur = currency || 'IQD';
  const whole = cur === 'IQD' || cur === 'SYP';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      currencyDisplay: 'symbol',
      maximumFractionDigits: whole ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString(locale)} ${cur}`;
  }
}

export function num(n: number | string | null | undefined, locale: string, digits = 0) {
  return Number(n ?? 0).toLocaleString(locale, { maximumFractionDigits: digits });
}

export function timeAgo(iso: string | null | undefined, locale: string) {
  if (!iso) return '';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function dateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Server error codes (RAISE EXCEPTION 'code') → message key */
export function errorCode(err: unknown): string {
  const m = (err as any)?.message ?? String(err ?? '');
  const known = [
    'active_ride_exists', 'service_disabled', 'no_city', 'vehicle_unavailable', 'store_closed', 'store_not_found',
    'product_unavailable', 'below_minimum', 'empty_cart', 'driver_not_approved', 'already_on_a_job', 'forbidden',
    'not_authenticated', 'missing_fields', 'bad_vehicle',
  ];
  return known.find((k) => m.includes(k)) ?? 'generic';
}
