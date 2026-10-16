import { useId } from 'react';
import { glyphInner, glyphKey } from '@/lib/glyphs';

type Props = {
  /** a glyph name, an emoji saved in the database, or a category key */
  name?: string | null;
  fallback?: string;
  className?: string;
  size?: number;
  /** spoken label; without it the glyph is decorative */
  label?: string;
};

/** One KAP illustration. Replaces system emoji so every phone shows the same picture. */
export function Glyph({ name, fallback, className, size, label }: Props) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: glyphInner(glyphKey(name, fallback), id) }}
    />
  );
}

/** A glyph on a soft rounded tile — the standard look for list rows, stores and products. */
export function GlyphTile({ name, fallback, className = 'w-12 h-12 rounded-2xl', glyph = 'w-[70%] h-[70%]', tint }: Props & { glyph?: string; tint?: string }) {
  return (
    <span className={`${className} ${tint ? '' : 'bg-surface'} flex items-center justify-center shrink-0`} style={tint ? { background: tint } : undefined}>
      <Glyph name={name} fallback={fallback} className={glyph} />
    </span>
  );
}
