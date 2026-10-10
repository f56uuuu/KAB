'use client';

import { useEffect, useRef, useState } from 'react';
import { loadLeaflet, DEFAULT_CENTER, type LatLng } from '@/lib/maps';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

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

// Minimal grey basemaps (no API key): a plain base plus a separate street-name layer.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const TILES = {
  light: [`${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
  dark: [`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
};
const ATTR = 'Esri, HERE, Garmin, © OpenStreetMap';

function carSvg(color: string) {
  return `<svg width="34" height="34" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0D0D0F" stroke="#fff" stroke-width="2"/>
  <rect x="13" y="8" width="14" height="24" rx="5" fill="${color}"/><rect x="15" y="12" width="10" height="5" rx="1.5" fill="#0D0D0F" opacity=".85"/>
  <rect x="15" y="24" width="10" height="4" rx="1.5" fill="#0D0D0F" opacity=".7"/></svg>`;
}

function iconHtml(m: MapMarker) {
  switch (m.kind) {
    case 'pickup':
      return { html: `<div style="position:relative;width:26px;height:26px"><div style="position:absolute;inset:0;border-radius:50%;background:#FFD100;border:5px solid #0D0D0F;box-shadow:0 3px 10px rgba(0,0,0,.35)"></div></div>`, size: 26 };
    case 'dropoff':
      return { html: `<div style="width:24px;height:24px;border-radius:7px;background:#0D0D0F;border:4px solid #FFD100;box-shadow:0 3px 10px rgba(0,0,0,.35)"></div>`, size: 24 };
    case 'car':
      return { html: carSvg('#FFD100'), size: 34 };
    case 'bike':
      return { html: `<div style="width:34px;height:34px;border-radius:50%;background:#0D0D0F;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:17px">🛵</div>`, size: 34 };
    case 'store':
      return { html: `<div style="width:38px;height:38px;border-radius:12px;background:#fff;border:2px solid #0D0D0F;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(0,0,0,.25)">${m.emoji ?? '🏪'}</div>`, size: 38 };
    case 'job':
      return { html: `<div style="width:30px;height:30px;border-radius:50%;background:#FFD100;border:3px solid #0D0D0F;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 10px rgba(0,0,0,.3)">${m.emoji ?? '•'}</div>`, size: 30 };
    case 'me':
    default:
      return { html: `<div style="position:relative;width:20px;height:20px"><span style="position:absolute;inset:-10px;border-radius:50%;background:rgba(66,133,244,.25)"></span><span style="position:absolute;inset:0;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></span></div>`, size: 20 };
  }
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
  const tileRef = useRef<any>(null);
  const layers = useRef<Map<string, any>>(new Map());
  const routeRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { dark } = useTheme();
  const { t } = useI18n();
  const cbs = useRef({ onDragEnd, onClick });
  cbs.current = { onDragEnd, onClick };

  // init
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !el.current || mapRef.current) return;
        const c = center ?? DEFAULT_CENTER;
        const map = L.map(el.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          touchZoom: interactive,
        }).setView([c.lat, c.lng], zoom);
        map.attributionControl.setPrefix(false);
        map.on('click', (e: any) => cbs.current.onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layers.current.clear();
      tileRef.current = null;
      routeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tiles follow the theme
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    tileRef.current?.remove();
    const [base, labels] = dark ? TILES.dark : TILES.light;
    tileRef.current = L.layerGroup([
      L.tileLayer(base, { maxZoom: 19, maxNativeZoom: 16, attribution: ATTR }),
      L.tileLayer(labels, { maxZoom: 19, maxNativeZoom: 16 }),
    ]).addTo(map);
  }, [ready, dark]);

  // markers
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const seen = new Set<string>();
    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
      seen.add(m.id);
      const existing = layers.current.get(m.id);
      const { html, size } = iconHtml(m);
      const key = `${m.kind}|${m.emoji ?? ''}|${m.dim ? 1 : 0}`;
      if (existing && existing._kapKey === key) {
        const cur = existing.getLatLng();
        if (cur.lat !== m.lat || cur.lng !== m.lng) existing.setLatLng([m.lat, m.lng]);
        continue;
      }
      existing?.remove();
      const icon = L.divIcon({
        className: m.kind === 'car' || m.kind === 'bike' ? 'kap-marker' : '',
        html: m.dim ? `<div style="opacity:.45">${html}</div>` : html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const mk = L.marker([m.lat, m.lng], { icon, draggable: !!m.draggable, keyboard: false, title: m.label });
      if (m.draggable) {
        mk.on('dragend', () => {
          const ll = mk.getLatLng();
          cbs.current.onDragEnd?.(m.id, { lat: ll.lat, lng: ll.lng });
        });
      }
      mk._kapKey = key;
      mk.addTo(map);
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
    const L = (window as any).L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    routeRef.current?.remove();
    routeRef.current = null;
    if (route && route.length > 1) {
      routeRef.current = L.layerGroup([
        L.polyline(route, { color: dark ? '#000000' : '#0D0D0F', weight: 9, opacity: 0.25 }),
        L.polyline(route, { color: '#FFD100', weight: 5, opacity: 1 }),
      ]).addTo(map);
    }
  }, [ready, route, dark]);

  // fit
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const pts: [number, number][] = [];
    markers.forEach((m) => Number.isFinite(m.lat) && pts.push([m.lat, m.lng]));
    (route ?? []).forEach((p) => pts.push(p));
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), {
        paddingTopLeft: [padding[0], padding[1]],
        paddingBottomRight: [padding[0], padding[1] + bottomInset],
        maxZoom: 16,
      });
    } else if (pts.length === 1) {
      map.setView(pts[0], Math.max(map.getZoom(), 15));
    } else if (center) {
      map.setView([center.lat, center.lng], zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`}>
      <div ref={el} className="absolute inset-0 z-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted bg-surface px-8 text-center">
          {failed ? t('map.unavailable') : t('map.loading')}
        </div>
      )}
    </div>
  );
}
