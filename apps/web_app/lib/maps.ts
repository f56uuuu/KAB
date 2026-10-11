// Map provider abstraction. Default provider: OpenStreetMap (Nominatim geocoding +
// OSRM routing) — free, no API key, covers Iraq / UAE / Syria. Another provider
// (Google, Mapbox, HERE…) can be added by implementing MapProvider.

export type LatLng = { lat: number; lng: number };
export type Place = { label: string; point: LatLng };
export type RouteStep = { type: string; modifier?: string; exit?: number; name: string; km: number; loc: [number, number] };
export type Route = { distanceKm: number; durationMin: number; path: [number, number][]; steps?: RouteStep[] };

export interface MapProvider {
  search(query: string, near?: LatLng): Promise<Place[]>;
  reverse(point: LatLng): Promise<string | null>;
  route(from: LatLng, to: LatLng): Promise<Route | null>;
}

// All map calls go through our own server route (/api/geo), which talks to the
// providers. The browser never depends on a third party's CORS or CDN behaviour.
const GEO = '/api/geo';

function shortLabel(displayName: string) {
  return displayName.split(',').slice(0, 3).join('،').trim();
}

async function geo(params: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${GEO}?${qs}`);
  if (!res.ok) throw new Error(`geo ${res.status}`);
  return res.json();
}

export const osmProvider: MapProvider = {
  async search(query, near) {
    const rows: { name: string; lat: number; lng: number }[] = await geo({
      type: 'search',
      q: query,
      ...(near ? { lat: near.lat, lng: near.lng } : {}),
    });
    return rows.map((r) => ({ label: shortLabel(r.name), point: { lat: r.lat, lng: r.lng } }));
  },

  async reverse({ lat, lng }) {
    const r = await geo({ type: 'reverse', lat, lng });
    return r?.name ? shortLabel(r.name) : null;
  },

  async route(from, to) {
    return geo({ type: 'route', fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng });
  },
};

export const mapProvider: MapProvider = osmProvider;

// MapLibre GL (vector maps, GPU-rendered) is bundled with the app and loaded only on screens with a map.
let mlPromise: Promise<any> | null = null;
export function loadMapLibre(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (!mlPromise) {
    mlPromise = import('maplibre-gl')
      .then((m: any) => {
        const ml = m.default ?? m;
        // Arabic / Kurdish street names need the RTL shaping plugin (loaded on demand)
        try {
          if (ml.getRTLTextPluginStatus?.() === 'unavailable') ml.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', true);
        } catch {
          /* already set */
        }
        // kapc:// = https fetched on the main thread (cached by the service worker → map works offline)
        try {
          ml.addProtocol('kapc', async (params: { url: string }, ac: AbortController) => {
            const res = await fetch('https://' + params.url.slice(7), { signal: ac.signal });
            if (!res.ok) throw new Error(`tile ${res.status}`);
            return { data: await res.arrayBuffer() };
          });
        } catch {
          /* already registered */
        }
        return ml;
      })
      .catch((e) => {
        mlPromise = null;
        throw e;
      });
  }
  return mlPromise;
}

// Current position, independent of the map: the ride flow keeps working even if map tiles fail.
export function getCurrentPosition(): Promise<{ point: LatLng; approximate: boolean }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve({ point: DEFAULT_CENTER, approximate: true });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          approximate: pos.coords.accuracy > 150,
        }),
      () => resolve({ point: DEFAULT_CENTER, approximate: true }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

export const DEFAULT_CENTER: LatLng = { lat: 33.3152, lng: 44.3661 }; // Baghdad
