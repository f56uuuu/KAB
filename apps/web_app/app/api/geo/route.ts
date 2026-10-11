import { NextResponse, type NextRequest } from 'next/server';

// Server-side gateway to the map services (geocoding + routing).
// - Browsers never call third-party map APIs directly, so CORS / CDN-cache quirks
//   on those services can't break the app.
// - Sends an identifying User-Agent, as Nominatim's usage policy requires.
// - One place to swap or add providers (Google, Mapbox, HERE…) later.
// - Responses are cached at Vercel's edge to cut latency and upstream load.

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';
const UA = 'KAP-WebApp/1.0 (https://kab-amber.vercel.app)';
const COUNTRIES = 'iq,ae,sy';

function num(v: string | null, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

async function upstream(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ar,en' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res.json();
}

function json(data: unknown, maxAge: number) {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` },
  });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const type = p.get('type');

  try {
    if (type === 'search') {
      const q = (p.get('q') ?? '').trim().slice(0, 120);
      if (q.length < 2) return json([], 60);
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        limit: '6',
        'accept-language': 'ar',
        countrycodes: COUNTRIES,
      });
      const lat = num(p.get('lat'), -90, 90);
      const lng = num(p.get('lng'), -180, 180);
      if (lat !== null && lng !== null) {
        const d = 0.6; // ~60 km preferred box, not strict
        params.set('viewbox', `${lng - d},${lat + d},${lng + d},${lat - d}`);
      }
      const rows: any[] = await upstream(`${NOMINATIM}/search?${params}`);
      return json(
        rows.map((r) => ({ name: r.display_name as string, lat: +r.lat, lng: +r.lon })),
        3600,
      );
    }

    if (type === 'reverse') {
      const lat = num(p.get('lat'), -90, 90);
      const lng = num(p.get('lng'), -180, 180);
      if (lat === null || lng === null) return NextResponse.json({ error: 'bad_point' }, { status: 400 });
      // ~11 m rounding: better cache hits, no meaningful loss of accuracy for an address label
      const r = await upstream(
        `${NOMINATIM}/reverse?format=jsonv2&accept-language=ar&zoom=18&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`,
      );
      return json({ name: (r?.display_name as string) ?? null }, 86400);
    }

    if (type === 'route') {
      const fLat = num(p.get('fromLat'), -90, 90);
      const fLng = num(p.get('fromLng'), -180, 180);
      const tLat = num(p.get('toLat'), -90, 90);
      const tLng = num(p.get('toLng'), -180, 180);
      if (fLat === null || fLng === null || tLat === null || tLng === null) {
        return NextResponse.json({ error: 'bad_point' }, { status: 400 });
      }
      const data = await upstream(
        `${OSRM}/route/v1/driving/${fLng},${fLat};${tLng},${tLat}?overview=full&geometries=geojson&steps=true`,
      );
      const r = data?.routes?.[0];
      if (!r) return json(null, 300);
      return json(
        {
          distanceKm: r.distance / 1000,
          durationMin: Math.max(1, Math.ceil(r.duration / 60)),
          path: r.geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo]),
          // turn-by-turn steps for in-app navigation
          steps: (r.legs?.[0]?.steps ?? []).map((s: any) => ({
            type: String(s.maneuver?.type ?? ''),
            modifier: s.maneuver?.modifier ? String(s.maneuver.modifier) : undefined,
            exit: s.maneuver?.exit ?? undefined,
            name: String(s.name || s.ref || ''),
            km: Math.round((s.distance ?? 0)) / 1000,
            loc: [s.maneuver?.location?.[1], s.maneuver?.location?.[0]],
          })),
        },
        300,
      );
    }

    return NextResponse.json({ error: 'unknown_type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'map_service_unavailable' }, { status: 502 });
  }
}
