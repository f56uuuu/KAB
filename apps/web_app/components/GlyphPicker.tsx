'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Glyph } from '@/components/Glyph';
import { PICKABLE, glyphKey } from '@/lib/glyphs';

/** Choose one of the KAP glyphs for a store, product or banner. Saves the glyph name. */
export function GlyphPicker({ value, onChange, label, compact }: { value?: string | null; onChange: (name: string) => void; label: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = glyphKey(value, 'plate');
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        aria-label={label}
        aria-expanded={open}
        className={`${compact ? 'h-11 w-full justify-center' : 'h-12 w-full px-3 justify-between'} rounded-xl border border-border bg-background flex items-center gap-2`}
      >
        <Glyph name={current} className="w-8 h-8" />
        {!compact && <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="absolute z-30 mt-2 start-0 w-[300px] max-w-[85vw] rounded-2xl border border-border bg-raised shadow-float p-2 grid grid-cols-6 gap-1 max-h-72 overflow-y-auto">
          {PICKABLE.map((n) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={n === current}
              aria-label={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={`aspect-square rounded-xl flex items-center justify-center hover:bg-surface ${n === current ? 'bg-accent/20 ring-2 ring-accent' : ''}`}
            >
              <Glyph name={n} className="w-8 h-8" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
