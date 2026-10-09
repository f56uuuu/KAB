// Map provider abstraction. Default provider: OpenStreetMap (Nominatim geocoding +
// OSRM routing) — free, no API key, covers Iraq / UAE / Syria. Another provider
// (Google, Mapbox, HERE…) can be added by implementing MapProvider.

export type LatLng = { lat: number; lng: number };
export type Place = { label: string; point: LatLng };
export type Route = { distanceKm: number; durationMin: number; path: [number, number][] };

export interface MapProvider {
  search(query: string, near?: LatLng): Promise<Place[]>;
  reverse(point: LatLng): Promise<string | null>;
  route(from: LatLng, to: LatLng): Promise<Route | null>;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';

function shortLabel(displayName: string) {
  return displayName.split(',').slice(0, 3).join('،').trim();
}

export const osmProvider: MapProvider = {
  async search(query, near) {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '6',
      'accept-language': 'ar',
      countrycodes: 'iq,ae,sy',
    });
    if (near) {
      const d = 0.6; // ~60 km box, preferred but not strict
      params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
    }
    const res = await fetch(`${NOMINATIM}/search?${params}`);
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    return rows.map((r) => ({ label: shortLabel(r.display_name), point: { lat: +r.lat, lng: +r.lon } }));
  },

  async reverse({ lat, lng }) {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&accept-language=ar&lat=${lat}&lon=${lng}`);
    if (!res.ok) return null;
    const r = await res.json();
    return r?.display_name ? shortLabel(r.display_name) : null;
  },

  async route(from, to) {
    const res = await fetch(
      `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.routes?.[0];
    if (!r) return null;
    return {
      distanceKm: r.distance / 1000,
      durationMin: Math.max(1, Math.ceil(r.duration / 60)),
      path: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
    };
  },
};

export const mapProvider: MapProvider = osmProvider;

// Leaflet is bundled with the app (no CDN, no API key): it loads even when
// third-party script hosts are blocked or slow on the user's network.
let leafletPromise: Promise<any> | null = null;
export function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (!leafletPromise) {
    leafletPromise = import('leaflet')
      .then((m: any) => {
        const L = m.default ?? m;
        (window as any).L = L;
        return L;
      })
      .catch((e) => {
        leafletPromise = null;
        throw e;
      });
  }
  return leafletPromise;
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
