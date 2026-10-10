'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { mapProvider, type LatLng, type Place } from '@/lib/maps';
import { useI18n } from '@/lib/i18n';

/** Debounced place search; renders results as a tappable list. */
export function usePlaceSearch(query: string, near?: LatLng | null) {
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await mapProvider.search(q, near ?? undefined));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, near?.lat, near?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return { results, loading, searched };
}

export function PlaceResults({
  results,
  loading,
  searched,
  onPick,
}: {
  results: Place[];
  loading: boolean;
  searched: boolean;
  onPick: (p: Place) => void;
}) {
  const { t } = useI18n();
  if (loading)
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  if (searched && results.length === 0) return <p className="text-sm text-muted py-4">{t('map.no_results')}</p>;
  return (
    <ul className="divide-y divide-border">
      {results.map((r, i) => (
        <li key={i}>
          <button onClick={() => onPick(r)} className="w-full flex items-center gap-3 py-3.5 text-start">
            <span className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium leading-snug">{r.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
