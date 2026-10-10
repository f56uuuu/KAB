'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { loadMapLibre, DEFAULT_CENTER, type LatLng } from '@/lib/maps';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { prefersArabicScript } from '@/lib/langs';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: 'pickup' | 'dropoff' | 'car' | 'bike' | 'store' | 'me' | 'job';
  label?: string;
  emoji?: string;
  draggable?: boolean;
  dim?: boolean;
};

type Props = {
  markers?: MapMarker[];
  /** [lat, lng] points */
  route?: [number, number][] | null;
  center?: LatLng | null;
  zoom?: number;
  /** change this value to re-fit the view to all markers + route */
  fitKey?: string | number;
  padding?: [number, number];
  /** extra space reserved at the bottom (bottom sheets) */
  bottomInset?: number;
  onDragEnd?: (id: string, p: LatLng) => void;
  onClick?: (p: LatLng) => void;
  className?: string;
  interactive?: boolean;
};

// Vector maps from OpenFreeMap (OpenStreetMap data, free, no API key): sharp at every zoom, GPU-smooth.
// The bright 'liberty' style is used in night mode too: the dark styles are too low-contrast to read streets.
const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/liberty',
};

function carSvg(color: string) {
  return `<svg width="38" height="38" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0D0D0F" stroke="#fff" stroke-width="2.5"/>
  <rect x="13" y="8" width="14" height="24" rx="5" fill="${color}"/><rect x="15" y="12" width="10" height="5" rx="1.5" fill="#0D0D0F" opacity=".85"/>
  <rect x="15" y="24" width="10" height="4" rx="1.5" fill="#0D0D0F" opacity=".7"/></svg>`;
}

function iconHtml(m: MapMarker) {
  switch (m.kind) {
    case 'pickup':
      return `<div style="width:28px;height:28px;border-radius:50%;background:#FFD100;border:6px solid #0D0D0F;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`;
    case 'dropoff':
      return `<div style="width:26px;height:26px;border-radius:8px;background:#0D0D0F;border:5px solid #FFD100;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`;
    case 'car':
      return carSvg('#FFD100');
    case 'bike':
      return `<div style="width:38px;height:38px;border-radius:50%;background:#0D0D0F;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:19px">🛵</div>`;
    case 'store':
      return `<div style="width:42px;height:42px;border-radius:14px;background:#fff;border:2.5px solid #0D0D0F;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 12px rgba(0,0,0,.25)">${m.emoji ?? '🏪'}</div>`;
    case 'job':
      return `<div style="width:34px;height:34px;border-radius:50%;background:#FFD100;border:3px solid #0D0D0F;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.3)">${m.emoji ?? '•'}</div>`;
    case 'me':
    default:
      return `<div style="position:relative;width:22px;height:22px"><span style="position:absolute;inset:-12px;border-radius:50%;background:rgba(66,133,244,.22)"></span><span style="position:absolute;inset:0;border-radius:50%;background:#4285F4;border:3.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></span></div>`;
  }
}

/** Street names in the user's script; keep a clean, uncluttered map. */
function tuneStyle(map: any, arabic: boolean) {
  const name = arabic
    ? ['coalesce', ['get', 'name:ar'], ['get', 'name'], ['get', 'name_en']]
    : ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
  for (const layer of map.getStyle()?.layers ?? []) {
    const id: string = layer.id;
    // fewer distractions: no 3D buildings, no minor points of interest
    if (/building-3d|building_3d/.test(id) || /^poi_r(7|20)/.test(id) || /^poi_transit/.test(id)) {
      map.setLayoutProperty(id, 'visibility', 'none');
      continue;
    }
    const tf = layer.layout?.['text-field'];
    if (!tf) continue;
    const s = JSON.stringify(tf);
    if (s.includes('"ref"') || s.includes('housenumber')) continue;
    try {
      map.setLayoutProperty(id, 'text-field', name);
    } catch {
      /* layer without names */
    }
  }
}

const ROUTE_SRC = 'kap-route';

function addRoute(map: any) {
  if (map.getSource(ROUTE_SRC)) return;
  map.addSource(ROUTE_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'kap-route-casing', type: 'line', source: ROUTE_SRC, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0D0D0F', 'line-width': 10, 'line-opacity': 0.9 } });
  map.addLayer({ id: 'kap-route-line', type: 'line', source: ROUTE_SRC, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFD100', 'line-width': 6 } });
}

function setRouteData(map: any, route?: [number, number][] | null) {
  const src = map.getSource(ROUTE_SRC);
  if (!src) return;
  src.setData({
    type: 'FeatureCollection',
    features: route && route.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.map(([la, ln]) => [ln, la]) } }] : [],
  });
}

export function KapMap({
  markers = [],
  route,
  center,
  zoom = 14,
  fitKey,
  padding = [48, 48],
  bottomInset = 0,
  onDragEnd,
  onClick,
  className = '',
  interactive = true,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mlRef = useRef<any>(null);
  const layers = useRef<Map<string, any>>(new Map());
  const routeRef = useRef(route);
  routeRef.current = route;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { dark } = useTheme();
  const { t, lang } = useI18n();
  const arabic = prefersArabicScript(lang);
  const styleRef = useRef({ dark, arabic });
  styleRef.current = { dark, arabic };
  const cbs = useRef({ onDragEnd, onClick });
  cbs.current = { onDragEnd, onClick };

  // init
  useEffect(() => {
    let cancelled = false;
    loadMapLibre()
      .then((ml) => {
        if (cancelled || !el.current || mapRef.current) return;
        mlRef.current = ml;
        const c = center ?? DEFAULT_CENTER;
        const map = new ml.Map({
          container: el.current,
          style: dark ? STYLE.dark : STYLE.light,
          center: [c.lng, c.lat],
          zoom,
          interactive,
          attributionControl: false,
          pitchWithRotate: false,
          dragRotate: false,
          touchPitch: false,
          fadeDuration: 0,
          maxZoom: 19,
        });
        map.touchZoomRotate?.disableRotation?.();
        map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');
        // keep the canvas matched to its box (bottom sheets, rotation, late layout)
        if (typeof ResizeObserver !== 'undefined' && el.current) {
          const ro = new ResizeObserver(() => map.resize());
          ro.observe(el.current);
          map.once('remove', () => ro.disconnect());
        }
        map.on('click', (e: any) => cbs.current.onClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        map.on('style.load', () => {
          tuneStyle(map, styleRef.current.arabic);
          addRoute(map);
          setRouteData(map, routeRef.current);
          // show the map as soon as the style is in; tiles stream in after
          if (!cancelled) setReady(true);
        });
        map.on('error', (e: any) => {
          // only treat it as fatal if the style itself never arrives
          if (!map.isStyleLoaded() && /style/i.test(String(e?.error?.message ?? ''))) setFailed(true);
        });
        mapRef.current = map;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      layers.current.forEach((m) => m.remove());
      layers.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // theme switch: swap style (markers are DOM and survive; route is re-added on style.load)
  const firstTheme = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    if (STYLE.dark !== STYLE.light) map.setStyle(dark ? STYLE.dark : STYLE.light);
  }, [ready, dark]);

  // language switch: relabel streets
  useEffect(() => {
    const map = mapRef.current;
    if (ready && map?.isStyleLoaded()) tuneStyle(map, arabic);
  }, [ready, arabic]);

  // markers
  useEffect(() => {
    const ml = mlRef.current;
    const map = mapRef.current;
    if (!ready || !ml || !map) return;
    const seen = new Set<string>();
    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
      seen.add(m.id);
      const key = `${m.kind}|${m.emoji ?? ''}|${m.dim ? 1 : 0}|${m.draggable ? 1 : 0}`;
      const existing = layers.current.get(m.id);
      if (existing && existing._kapKey === key) {
        const cur = existing.getLngLat();
        if (cur.lat !== m.lat || cur.lng !== m.lng) existing.setLngLat([m.lng, m.lat]);
        continue;
      }
      existing?.remove();
      const node = document.createElement('div');
      node.innerHTML = iconHtml(m);
      node.style.opacity = m.dim ? '0.45' : '1';
      if (m.kind === 'car' || m.kind === 'bike') node.className = 'kap-marker';
      if (m.label) node.title = m.label;
      const mk = new ml.Marker({ element: node, draggable: !!m.draggable, anchor: 'center' }).setLngLat([m.lng, m.lat]).addTo(map);
      if (m.draggable) {
        mk.on('dragend', () => {
          const ll = mk.getLngLat();
          cbs.current.onDragEnd?.(m.id, { lat: ll.lat, lng: ll.lng });
        });
      }
      mk._kapKey = key;
      layers.current.set(m.id, mk);
    }
    for (const [id, layer] of layers.current) {
      if (!seen.has(id)) {
        layer.remove();
        layers.current.delete(id);
      }
    }
  }, [ready, markers]);

  // route
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (map.isStyleLoaded()) {
      addRoute(map);
      setRouteData(map, route);
    }
  }, [ready, route]);

  // fit
  useEffect(() => {
    const ml = mlRef.current;
    const map = mapRef.current;
    if (!ready || !ml || !map) return;
    const pts: [number, number][] = [];
    markers.forEach((m) => Number.isFinite(m.lat) && pts.push([m.lng, m.lat]));
    (route ?? []).forEach(([la, ln]) => pts.push([ln, la]));
    const pad = { top: padding[1], bottom: padding[1] + bottomInset, left: padding[0], right: padding[0] };
    if (pts.length >= 2) {
      const b = new ml.LngLatBounds(pts[0], pts[0]);
      pts.forEach((p) => b.extend(p));
      map.fitBounds(b, { padding: pad, maxZoom: 16, duration: 600 });
    } else if (pts.length === 1) {
      map.easeTo({ center: pts[0], zoom: Math.max(map.getZoom(), 15), padding: pad, duration: 600 });
    } else if (center) {
      map.easeTo({ center: [center.lng, center.lat], zoom, padding: pad, duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`}>
      {/* inline position: maplibre-gl.css sets .maplibregl-map { position: relative } which would collapse the container */}
      <div ref={el} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted bg-surface px-8 text-center">
          {failed ? t('map.unavailable') : t('map.loading')}
        </div>
      )}
    </div>
  );
}
