'use client';

// On-device storage for the personal map: saved places and recent routes stay usable without internet.
import type { LatLng } from './maps';

export type SavedPlace = { id: string; kind: 'home' | 'work' | 'fav'; name: string; lat: number; lng: number; at: number };
export type SavedTrip = { id: string; from: LatLng; to: LatLng; toName: string; path: [number, number][]; km: number; min: number; at: number };

const PLACES = 'kap_places_v1';
const TRIPS = 'kap_trips_v1';

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works online */
  }
}

export const places = {
  all: () => read<SavedPlace[]>(PLACES, []),
  save(p: Omit<SavedPlace, 'id' | 'at'> & { id?: string }) {
    const list = places.all().filter((x) => (p.kind === 'fav' ? x.id !== p.id : x.kind !== p.kind));
    const item: SavedPlace = { ...p, id: p.id ?? `${p.kind}-${Date.now()}`, at: Date.now() };
    write(PLACES, [item, ...list].slice(0, 50));
    return item;
  },
  remove(id: string) {
    write(PLACES, places.all().filter((x) => x.id !== id));
  },
};

export const trips = {
  all: () => read<SavedTrip[]>(TRIPS, []),
  save(t: Omit<SavedTrip, 'id' | 'at'>) {
    const key = `${t.to.lat.toFixed(4)},${t.to.lng.toFixed(4)}`;
    const list = trips.all().filter((x) => `${x.to.lat.toFixed(4)},${x.to.lng.toFixed(4)}` !== key);
    const item: SavedTrip = { ...t, id: `t-${Date.now()}`, at: Date.now() };
    // keep paths light: at most ~400 points per route
    const step = Math.max(1, Math.ceil(item.path.length / 400));
    item.path = item.path.filter((_, i) => i % step === 0 || i === item.path.length - 1);
    write(TRIPS, [item, ...list].slice(0, 20));
    return item;
  },
  remove(id: string) {
    write(TRIPS, trips.all().filter((x) => x.id !== id));
  },
};

// ---------------------------------------------------------------- offline area download
function lon2x(lon: number, z: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function lat2y(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

/** Tile URLs covering `radiusKm` around each centre, zoom 8–15 (capped). */
export async function tileUrlsFor(centres: LatLng[], radiusKm = 6, maxTiles = 2500): Promise<string[]> {
  const tj = await fetch('https://tiles.openfreemap.org/planet').then((r) => r.json());
  const template: string = tj.tiles[0];
  const urls = new Set<string>();
  for (let z = 8; z <= 15; z++) {
    for (const c of centres) {
      const dLat = radiusKm / 111;
      const dLng = radiusKm / (111 * Math.cos((c.lat * Math.PI) / 180));
      const x0 = lon2x(c.lng - dLng, z), x1 = lon2x(c.lng + dLng, z);
      const y0 = lat2y(c.lat + dLat, z), y1 = lat2y(c.lat - dLat, z);
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++) {
          urls.add(template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
          if (urls.size >= maxTiles) return [...urls];
        }
    }
  }
  return [...urls];
}

/** Ask the service worker to keep those tiles; reports progress. */
export async function downloadArea(centres: LatLng[], onProgress: (done: number, total: number) => void, radiusKm = 6) {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.active) throw new Error('no_sw');
  const urls = await tileUrlsFor(centres, radiusKm);
  return new Promise<{ total: number; failed: number }>((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => {
      onProgress(e.data.done, e.data.total);
      if (e.data.finished) resolve({ total: e.data.total, failed: e.data.failed });
    };
    reg.active!.postMessage({ type: 'kap-prefetch', urls }, [ch.port2]);
  });
}

export async function storageEstimate() {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usedMb: Math.round((e.usage ?? 0) / 1048576), quotaMb: Math.round((e.quota ?? 0) / 1048576) } : null;
  } catch {
    return null;
  }
}
