'use client';

import { isOn } from '@/lib/features';
import { useFlags } from '@/lib/hooks';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { LatLng } from '@/lib/maps';
import { REPORT_KINDS, reportTxt, submitReport, type ReportKind } from '@/lib/reports';

/** The yellow "report" button that sits at the bottom of the map. */
function ReportButtonInner({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const { lang } = useI18n();
  return (
    <button
      onClick={onClick}
      aria-label={reportTxt(lang).report}
      className={`w-16 h-16 rounded-[22px] bg-accent text-ink shadow-float flex items-center justify-center active:scale-95 transition-transform ${className}`}
    >
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M17 3.5 31.5 29a1.6 1.6 0 0 1-1.4 2.4H3.9A1.6 1.6 0 0 1 2.5 29L17 3.5Z" fill="#FFD100" stroke="#0D0D0F" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M17 13.5v10M12 18.5h10" stroke="#0D0D0F" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** "What do you see?" — one tap files a report at the user's position. */
export function ReportSheet({ open, at, onClose, onDone }: { open: boolean; at: LatLng | null; onClose: () => void; onDone: (msg: string, kind?: ReportKind) => void }) {
  const { lang, dir } = useI18n();
  const tx = reportTxt(lang);
  const [busy, setBusy] = useState<ReportKind | null>(null);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);

  if (!open) return null;

  async function pick(kind: ReportKind) {
    if (!at || busy) return;
    setBusy(kind);
    const r = await submitReport(kind, at);
    setBusy(null);
    onDone(r === 'sent' ? tx.thanks : r === 'queued' ? tx.queued : r === 'login' ? tx.login : tx.failed, r === 'sent' || r === 'queued' ? kind : undefined);
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center" dir={dir} role="dialog" aria-modal="true" aria-label={tx.title}>
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/40 animate-tour-fade" />
      <div className="relative w-full max-w-md bg-background rounded-t-sheet shadow-sheet safe-bottom animate-slide-up max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1.5 rounded-full bg-border mx-auto mt-2.5" />
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <h2 className="text-2xl font-black">{tx.title}</h2>
          <button onClick={onClose} aria-label="close" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-5 px-4 pt-4 pb-6">
          {REPORT_KINDS.map(({ kind, emoji }) => (
            <button key={kind} onClick={() => pick(kind)} disabled={!!busy} className="flex flex-col items-center gap-2 group disabled:opacity-60">
              <span
                className={`w-[84px] h-[84px] max-w-full aspect-square rounded-full bg-surface flex items-center justify-center text-[40px] leading-none transition-transform group-active:scale-90 ${
                  busy === kind ? 'animate-pulse ring-4 ring-accent' : ''
                }`}
              >
                {emoji}
              </span>
              <span className="text-sm font-bold text-center leading-tight">{tx.kinds[kind]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hidden when the super admin switches NAV_REPORTS off. */
export function ReportButton(props: React.ComponentProps<typeof ReportButtonInner>) {
  const flags = useFlags();
  if (!isOn(flags, 'NAV_REPORTS')) return null;
  return <ReportButtonInner {...props} />;
}
