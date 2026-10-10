'use client';

import { useEffect, useState } from 'react';
import { getCurrentPosition, mapProvider, DEFAULT_CENTER, type LatLng } from './maps';

type Loc = { point: LatLng; approximate: boolean; address: string | null; ready: boolean };

let cache: Loc | null = null;
let inflight: Promise<Loc> | null = null;

async function resolve(): Promise<Loc> {
  const { point, approximate } = await getCurrentPosition();
  const address = await mapProvider.reverse(point).catch(() => null);
  cache = { point, approximate, address, ready: true };
  return cache;
}

/** Shared current-location hook: one GPS fix + one reverse-geocode per visit. */
export function useMyLocation() {
  const [loc, setLoc] = useState<Loc>(cache ?? { point: DEFAULT_CENTER, approximate: true, address: null, ready: false });
  useEffect(() => {
    if (cache) return;
    inflight ??= resolve().finally(() => (inflight = null));
    let alive = true;
    inflight.then((l) => alive && setLoc(l));
    return () => {
      alive = false;
    };
  }, []);
  return loc;
}

export function refreshMyLocation() {
  cache = null;
}
