// Shared brand surfaces so promos look the same on home, offers and the store pages.
export function goldBg(dir: string) {
  // dark where the text sits (the start side), gold toward the picture
  const to = dir === 'rtl' ? 'to left' : 'to right';
  return `linear-gradient(${to}, #15120A 0%, #2E2408 38%, #8A6A00 78%, #D9A800 100%)`;
}

/** Perceived brightness 0–255 of a #rrggbb colour (used to pick text colour on admin colours). */
export function luminance(hex?: string | null) {
  const h = (hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16) || 0;
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}
