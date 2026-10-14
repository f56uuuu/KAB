// Receipt printing for store devices (Android POS terminals with a built-in 58/80 mm thermal printer).
// Thermal printers cannot shape Arabic text, so the receipt is drawn on a canvas by the browser
// (correct Arabic joining and RTL) and sent to the printer as a 1-bit ESC/POS raster image.
//
// Two ways to reach the printer from a web page:
//  - 'rawbt':  the free RawBT app (Play Store) receives the ESC/POS bytes through an Android intent and
//              prints on the built-in printer, a Bluetooth printer or a USB printer.
//  - 'system': Android's own print dialog (works when the device ships a print service for its printer,
//              or with the RawBT print service).

export type PaperWidth = 58 | 80;
export type PrintMethod = 'rawbt' | 'system';

export type ReceiptLine =
  | { kind: 'title'; text: string }
  | { kind: 'center'; text: string; size?: number; bold?: boolean }
  | { kind: 'row'; right: string; left?: string; bold?: boolean; size?: number }
  | { kind: 'text'; text: string; size?: number; bold?: boolean; boxed?: boolean }
  | { kind: 'rule'; dashed?: boolean }
  | { kind: 'space'; h?: number };

const DOTS: Record<PaperWidth, number> = { 58: 384, 80: 576 };
const FONT = '"Readex Pro", Tahoma, sans-serif';

/** Draws the receipt on a white canvas sized for the paper. */
export async function renderReceipt(lines: ReceiptLine[], opts: { width: PaperWidth; dir: 'rtl' | 'ltr' }) {
  const W = DOTS[opts.width];
  const k = W / 384; // scale fonts for 80 mm paper
  const pad = Math.round(10 * k);
  try {
    await Promise.all([document.fonts.load(`400 ${24 * k}px ${FONT}`), document.fonts.load(`700 ${24 * k}px ${FONT}`)]);
  } catch {
    /* system font fallback */
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const rtl = opts.dir === 'rtl';
  const set = (size: number, bold?: boolean) => {
    ctx.font = `${bold ? 700 : 400} ${Math.round(size * k)}px ${FONT}`;
  };
  const wrap = (text: string, max: number) => {
    const out: string[] = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const tryLine = line ? line + ' ' + word : word;
        if (ctx.measureText(tryLine).width <= max || !line) line = tryLine;
        else {
          out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  };

  // two passes: measure, then draw
  type Op = (y: number) => void;
  const ops: { h: number; draw: Op }[] = [];
  for (const l of lines) {
    if (l.kind === 'space') {
      ops.push({ h: Math.round((l.h ?? 10) * k), draw: () => {} });
    } else if (l.kind === 'rule') {
      ops.push({
        h: Math.round(16 * k),
        draw: (y) => {
          ctx.fillStyle = '#000';
          const yy = y + Math.round(7 * k);
          if (l.dashed) for (let x = pad; x < W - pad; x += Math.round(12 * k)) ctx.fillRect(x, yy, Math.round(7 * k), Math.max(2, Math.round(2 * k)));
          else ctx.fillRect(pad, yy, W - pad * 2, Math.max(2, Math.round(2 * k)));
        },
      });
    } else if (l.kind === 'title' || l.kind === 'center') {
      const size = l.kind === 'title' ? 40 : l.size ?? 22;
      const bold = l.kind === 'title' ? true : l.bold;
      set(size, bold);
      const rows = wrap(l.text, W - pad * 2);
      const lh = Math.round(size * 1.45 * k);
      ops.push({
        h: lh * rows.length,
        draw: (y) => {
          set(size, bold);
          ctx.textAlign = 'center';
          rows.forEach((r, i) => ctx.fillText(r, W / 2, y + lh * i + lh * 0.75));
        },
      });
    } else if (l.kind === 'text') {
      const size = l.size ?? 22;
      set(size, l.bold);
      const inner = l.boxed ? pad * 2 : 0;
      const rows = wrap(l.text, W - pad * 2 - inner * 2);
      const lh = Math.round(size * 1.5 * k);
      const extra = l.boxed ? Math.round(16 * k) : 0;
      ops.push({
        h: lh * rows.length + extra,
        draw: (y) => {
          if (l.boxed) {
            ctx.lineWidth = Math.max(2, Math.round(2 * k));
            ctx.strokeRect(pad, y + 2, W - pad * 2, lh * rows.length + extra - 4);
          }
          set(size, l.bold);
          ctx.textAlign = rtl ? 'right' : 'left';
          const x = rtl ? W - pad - inner : pad + inner;
          rows.forEach((r, i) => ctx.fillText(r, x, y + extra / 2 + lh * i + lh * 0.75));
        },
      });
    } else if (l.kind === 'row') {
      const size = l.size ?? 22;
      set(size, l.bold);
      const leftW = l.left ? ctx.measureText(l.left).width + Math.round(14 * k) : 0;
      const rows = wrap(l.right, W - pad * 2 - leftW);
      const lh = Math.round(size * 1.5 * k);
      ops.push({
        h: lh * rows.length,
        draw: (y) => {
          set(size, l.bold);
          ctx.textAlign = rtl ? 'right' : 'left';
          rows.forEach((r, i) => ctx.fillText(r, rtl ? W - pad : pad, y + lh * i + lh * 0.75));
          if (l.left) {
            ctx.textAlign = rtl ? 'left' : 'right';
            ctx.fillText(l.left, rtl ? pad : W - pad, y + lh * 0.75);
          }
        },
      });
    }
  }

  const H = ops.reduce((s, o) => s + o.h, 0) + pad * 2;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.direction = opts.dir;
  let y = pad;
  for (const o of ops) {
    ctx.direction = opts.dir;
    ctx.fillStyle = '#000';
    o.draw(y);
    y += o.h;
  }
  return canvas;
}

/** ESC/POS bytes: init, the canvas as raster bands (GS v 0), then feed the paper out. */
export function escposFromCanvas(canvas: HTMLCanvasElement, feedLines = 4) {
  const W = canvas.width;
  const H = canvas.height;
  const px = canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
  const bytesPerRow = Math.ceil(W / 8);
  const out: number[] = [0x1b, 0x40];
  const BAND = 128;
  for (let y0 = 0; y0 < H; y0 += BAND) {
    const h = Math.min(BAND, H - y0);
    out.push(0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff);
    for (let y = y0; y < y0 + h; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let b = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          if (x >= W) continue;
          const i = (y * W + x) * 4;
          const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (lum < 150) b |= 0x80 >> bit;
        }
        out.push(b);
      }
    }
  }
  out.push(0x1b, 0x64, feedLines);
  return new Uint8Array(out);
}

function toBase64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Hands the job to RawBT. If the app is missing, Android opens its Play Store page instead. */
export function printWithRawBT(bytes: Uint8Array) {
  const url = `intent:base64,${toBase64(bytes)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  // lets diagnostics (and tests) see the job; cancelling the event skips the hand-off
  if (!window.dispatchEvent(new CustomEvent('kap-print', { detail: url, cancelable: true }))) return;
  window.location.href = url;
}

/** Android print dialog with the receipt image sized to the paper width. */
export function printWithSystem(canvas: HTMLCanvasElement, width: PaperWidth) {
  const src = canvas.toDataURL('image/png');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${width}mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:${width}mm;height:auto;image-rendering:pixelated}</style></head><body><img id="r" src="${src}"></body></html>`,
  );
  doc.close();
  const img = doc.getElementById('r') as HTMLImageElement;
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  if (img.complete) go();
  else img.onload = go;
}

type NativePrinter = { print: (b64: string) => string; info: () => string; version: () => string };

/** The KAP store app (Android) exposes the terminal's own printer to the page. */
export function nativePrinter(): NativePrinter | null {
  if (typeof window === 'undefined') return null;
  const p = (window as any).KapPrinter;
  return p && typeof p.print === 'function' ? (p as NativePrinter) : null;
}

/** Prints and reports how: 'ok:<way>' or 'error:<reason>'. */
export async function printReceipt(lines: ReceiptLine[], o: { width: PaperWidth; method: PrintMethod; dir: 'rtl' | 'ltr'; copies?: number }): Promise<string> {
  const canvas = await renderReceipt(lines, { width: o.width, dir: o.dir });
  const one = escposFromCanvas(canvas);
  const n = Math.max(1, Math.min(3, o.copies ?? 1));
  const all = new Uint8Array(one.length * n);
  for (let i = 0; i < n; i++) all.set(one, i * one.length);

  const native = nativePrinter();
  if (native) {
    try {
      return String(native.print(toBase64(all)));
    } catch (e) {
      return 'error:' + String(e);
    }
  }
  if (o.method === 'system') {
    printWithSystem(canvas, o.width);
    return 'ok:system';
  }
  printWithRawBT(all);
  return 'ok:rawbt';
}
