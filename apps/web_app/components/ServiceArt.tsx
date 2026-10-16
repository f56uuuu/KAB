// Service illustrations now come from the shared KAP glyph set, so the home tiles match
// every other picture in the app.
import { Glyph } from '@/components/Glyph';

export type ArtKind = 'taxi' | 'scooter' | 'burger' | 'bags' | 'pharmacy' | 'gift' | 'home' | 'car';

const NAME: Record<ArtKind, string> = { taxi: 'taxi', scooter: 'scooter', burger: 'burger', bags: 'bag', pharmacy: 'pharmacy', gift: 'gift', home: 'homefix', car: 'carfix' };

export function ServiceArt({ kind, className }: { kind: ArtKind; className?: string; uid?: string }) {
  return <Glyph name={NAME[kind]} className={className} />;
}
