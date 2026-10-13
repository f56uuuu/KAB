'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Check, Printer, Settings2, Store as StoreIcon, Volume2, VolumeX, WifiOff, X } from 'lucide-react';
import { KMark } from '@/components/Logo';
import { Button, Spinner, Switch, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb, useStickyState } from '@/lib/hooks';
import { money, timeAgo } from '@/lib/format';
import { itemName, merchantTxt, receiptFor, testReceipt, type MerchantOrder, type MerchantStore } from '@/lib/merchant';
import { printReceipt, type PaperWidth, type PrintMethod } from '@/lib/receipt';

type Settings = { width: PaperWidth; method: PrintMethod; autoPrint: boolean; copies: number; sound: boolean };
const DEFAULTS: Settings = { width: 58, method: 'rawbt', autoPrint: true, copies: 1, sound: true };
const NEW = ['PLACED'];
const ACTIVE = ['PREPARING', 'DRIVER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'];

function readSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('kap_merchant_settings') || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export default function MerchantPage() {
  const { lang, locale, dir } = useI18n();
  const tx = merchantTxt(lang);
  const { toast, toastNode } = useToast();
  const [stores, setStores] = useState<MerchantStore[] | null>(null);
  const [storeId, setStoreId] = useStickyState<number | null>('merchant.store', null);
  const [orders, setOrders] = useState<MerchantOrder[] | null>(null);
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const [settings, setSettingsState] = useState<Settings>(DEFAULTS);
  const [showSettings, setShowSettings] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<MerchantOrder | null>(null);
  const [online, setOnline] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => setSettingsState(readSettings()), []);
  const setSettings = (p: Partial<Settings>) =>
    setSettingsState((s) => {
      const n = { ...s, ...p };
      try {
        localStorage.setItem('kap_merchant_settings', JSON.stringify(n));
      } catch {
        /* private mode */
      }
      return n;
    });

  const loadStores = useCallback(async () => {
    const { data, error } = await sb().rpc('merchant_stores');
    if (error) {
      setStores([]);
      return;
    }
    const list = (data ?? []) as MerchantStore[];
    setStores(list);
    if (list.length && !list.some((s) => s.id === storeId)) setStoreId(list[0].id);
  }, [storeId, setStoreId]);
  useEffect(() => {
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = stores?.find((s) => s.id === storeId) ?? null;

  // ---------- polling ----------
  const load = useCallback(async () => {
    if (!store) return;
    const { data, error } = await sb().rpc('merchant_orders', { p_store: store.id });
    if (error) {
      setOnline(typeof navigator === 'undefined' ? false : navigator.onLine);
      return;
    }
    setOnline(true);
    setOrders((data ?? []) as MerchantOrder[]);
  }, [store]);
  useEffect(() => {
    if (!store) return;
    load();
    const iv = setInterval(() => document.visibilityState === 'visible' && load(), 5000);
    const vis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', vis);
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => {
      clearInterval(iv);
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [store, load]);

  // ---------- sound + screen on ----------
  const audio = useRef<AudioContext | null>(null);
  const wake = useRef<any>(null);
  async function start() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audio.current = new AC();
      await audio.current.resume();
    } catch {
      /* no audio */
    }
    try {
      wake.current = await (navigator as any).wakeLock?.request('screen');
    } catch {
      /* not supported */
    }
    setStarted(true);
  }
  useEffect(() => {
    const again = async () => {
      if (started && document.visibilityState === 'visible') {
        try {
          wake.current = await (navigator as any).wakeLock?.request('screen');
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener('visibilitychange', again);
    return () => document.removeEventListener('visibilitychange', again);
  }, [started]);

  const newOrders = useMemo(() => (orders ?? []).filter((o) => NEW.includes(o.status)), [orders]);
  const activeOrders = useMemo(() => (orders ?? []).filter((o) => ACTIVE.includes(o.status)), [orders]);
  const doneOrders = useMemo(() => (orders ?? []).filter((o) => !NEW.includes(o.status) && !ACTIVE.includes(o.status)), [orders]);

  useEffect(() => {
    if (!started || !settings.sound || newOrders.length === 0) return;
    const ring = () => {
      const ctx = audio.current;
      if (!ctx) return;
      [0, 0.22, 0.44].forEach((at, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + at);
        o.stop(ctx.currentTime + at + 0.2);
      });
      navigator.vibrate?.([200, 100, 200]);
    };
    ring();
    const iv = setInterval(ring, 3000);
    return () => clearInterval(iv);
  }, [started, settings.sound, newOrders.length]);

  // jump to the new tab when an order arrives
  const seen = useRef<Set<number>>(new Set());
  useEffect(() => {
    const fresh = newOrders.filter((o) => !seen.current.has(o.id));
    newOrders.forEach((o) => seen.current.add(o.id));
    if (fresh.length && orders) setTab('new');
  }, [newOrders, orders]);

  // ---------- actions ----------
  async function print(o: MerchantOrder) {
    if (!store) return;
    await printReceipt(receiptFor(o, store, tx, lang, locale), { width: settings.width, method: settings.method, dir, copies: settings.copies });
  }
  async function act(o: MerchantOrder, action: 'accept' | 'reject' | 'ready', reason?: string) {
    setBusy(o.id);
    const { error } = await sb().rpc('merchant_order_action', { p_order: o.id, p_action: action, p_reason: reason ?? null });
    setBusy(null);
    if (error) {
      toast(/too_late/.test(error.message) ? tx.tooLate : tx.failed);
      load();
      return;
    }
    if (action === 'accept' && settings.autoPrint) await print(o);
    if (action === 'accept') setTab('active');
    load();
  }
  async function toggleOpen(v: boolean) {
    if (!store) return;
    const { error } = await sb().rpc('merchant_set_open', { p_store: store.id, p_open: v });
    if (error) return toast(tx.failed);
    setStores((l) => (l ?? []).map((s) => (s.id === store.id ? { ...s, is_open: v } : s)));
  }

  // ---------- screens ----------
  if (stores === null) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Spinner />
      </main>
    );
  }
  if (stores.length === 0) return <PairScreen onDone={loadStores} />;

  const list = tab === 'new' ? newOrders : tab === 'active' ? activeOrders : doneOrders;
  const empty = tab === 'new' ? tx.emptyNew : tab === 'active' ? tx.emptyActive : tx.emptyDone;

  return (
    <main className="min-h-[100dvh] bg-surface">
      <header className="sticky top-0 z-30 bg-ink text-white safe-top">
        <div className="max-w-3xl mx-auto px-4 pt-2 pb-3 flex items-center gap-3">
          <KMark size={40} className="rounded-xl" />
          <div className="flex-1 min-w-0">
            {stores.length > 1 ? (
              <select
                value={store?.id ?? ''}
                onChange={(e) => setStoreId(Number(e.target.value))}
                className="bg-transparent text-lg font-semibold max-w-full truncate"
                aria-label={tx.title}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' || lang === 'ku' ? s.name_ar : s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-lg font-semibold truncate">{store ? (lang === 'ar' || lang === 'ku' ? store.name_ar : store.name) : ''}</p>
            )}
            <p className={`text-xs ${store?.is_open ? 'text-accent' : 'text-white/60'}`}>{store?.is_open ? tx.open : tx.closed}</p>
          </div>
          {store && <Switch checked={store.is_open} onChange={toggleOpen} label={store.is_open ? tx.open : tx.closed} />}
          <button
            onClick={() => setSettings({ sound: !settings.sound })}
            aria-label={tx.sound}
            className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
          >
            {settings.sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-white/60" />}
          </button>
          <button onClick={() => setShowSettings(true)} aria-label={tx.settings} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
        <nav className="max-w-3xl mx-auto px-4 pb-3 grid grid-cols-3 gap-2" role="tablist">
          {(
            [
              ['new', tx.tabNew, newOrders.length],
              ['active', tx.tabActive, activeOrders.length],
              ['done', tx.tabDone, doneOrders.length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`h-12 rounded-2xl text-[15px] font-semibold whitespace-nowrap flex items-center justify-center gap-2 ${
                tab === k ? 'bg-accent text-ink' : 'bg-white/10 text-white'
              }`}
            >
              {label}
              {n > 0 && (
                <span className={`min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center ${k === 'new' && tab !== k ? 'bg-danger text-white' : tab === k ? 'bg-ink text-accent' : 'bg-white/20'}`}>
                  {n}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {!online && (
        <p role="status" className="bg-danger text-white text-sm px-4 py-2 flex items-center gap-2 justify-center">
          <WifiOff className="w-4 h-4" />
          {tx.offline}
        </p>
      )}

      <section className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-10">
        {orders === null ? (
          <div className="py-20 flex justify-center">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-muted flex flex-col items-center gap-3">
            <BellRing className="w-10 h-10" />
            <p className="max-w-xs leading-relaxed">{empty}</p>
          </div>
        ) : (
          list.map((o) => (
            <OrderCard
              key={o.id}
              o={o}
              tx={tx}
              lang={lang}
              locale={locale}
              busy={busy === o.id}
              onAccept={() => act(o, 'accept')}
              onReject={() => setRejecting(o)}
              onReady={() => act(o, 'ready')}
              onPrint={() => print(o)}
              autoPrint={settings.autoPrint}
            />
          ))
        )}
      </section>

      {!started && (
        <div className="fixed inset-0 z-50 bg-ink/95 text-white flex flex-col items-center justify-center gap-5 p-8 text-center">
          <KMark size={72} className="rounded-2xl" />
          <p className="text-2xl font-semibold">{store ? (lang === 'ar' || lang === 'ku' ? store.name_ar : store.name) : tx.title}</p>
          <p className="text-white/70 max-w-xs leading-relaxed">{tx.startSub}</p>
          <button onClick={start} className="h-16 px-8 rounded-[20px] bg-accent text-ink text-lg font-semibold flex items-center gap-3">
            <BellRing className="w-6 h-6" />
            {tx.start}
          </button>
        </div>
      )}

      {rejecting && (
        <Sheet title={tx.rejectTitle} onClose={() => setRejecting(null)} dir={dir} closeLabel={tx.close}>
          <div className="flex flex-col gap-2">
            {tx.rejectReasons.map((r) => (
              <button
                key={r}
                disabled={busy === rejecting.id}
                onClick={async () => {
                  const o = rejecting;
                  setRejecting(null);
                  await act(o, 'reject', r);
                }}
                className="h-14 rounded-2xl border-[1.5px] border-border px-4 text-start font-medium hover:border-fg"
              >
                {r}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {showSettings && (
        <Sheet title={tx.settings} onClose={() => setShowSettings(false)} dir={dir} closeLabel={tx.close}>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold mb-2">{tx.method}</p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ['rawbt', tx.rawbt, tx.rawbtSub],
                    ['system', tx.system, tx.systemSub],
                  ] as const
                ).map(([k, label, sub]) => (
                  <button
                    key={k}
                    onClick={() => setSettings({ method: k })}
                    aria-pressed={settings.method === k}
                    className={`rounded-2xl border-[1.5px] p-3.5 text-start flex gap-3 ${settings.method === k ? 'border-fg bg-surface' : 'border-border'}`}
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${settings.method === k ? 'border-fg bg-fg' : 'border-border'}`}>
                      {settings.method === k && <Check className="w-3 h-3 text-background" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-xs text-muted leading-relaxed mt-0.5">{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold mb-2">{tx.paper}</p>
                <div className="flex gap-2">
                  {([58, 80] as const).map((w) => (
                    <button key={w} onClick={() => setSettings({ width: w })} className={`flex-1 h-11 rounded-xl border-[1.5px] font-semibold ${settings.width === w ? 'border-fg bg-surface' : 'border-border'}`}>
                      <bdi dir="ltr">{w} mm</bdi>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">{tx.copies}</p>
                <div className="flex gap-2">
                  {[1, 2].map((n) => (
                    <button key={n} onClick={() => setSettings({ copies: n })} className={`flex-1 h-11 rounded-xl border-[1.5px] font-semibold ${settings.copies === n ? 'border-fg bg-surface' : 'border-border'}`}>
                      {n.toLocaleString(locale)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="font-medium">{tx.auto}</span>
              <Switch checked={settings.autoPrint} onChange={(v) => setSettings({ autoPrint: v })} label={tx.auto} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="font-medium">{tx.sound}</span>
              <Switch checked={settings.sound} onChange={(v) => setSettings({ sound: v })} label={tx.sound} />
            </label>
            <Button
              variant="dark"
              full
              onClick={() => printReceipt(testReceipt(store, tx, lang, locale), { width: settings.width, method: settings.method, dir, copies: 1 })}
            >
              <Printer className="w-5 h-5" />
              {tx.test}
            </Button>
          </div>
        </Sheet>
      )}
      {toastNode}
    </main>
  );
}

function OrderCard({
  o,
  tx,
  lang,
  locale,
  busy,
  onAccept,
  onReject,
  onReady,
  onPrint,
  autoPrint,
}: {
  o: MerchantOrder;
  tx: ReturnType<typeof merchantTxt>;
  lang: string;
  locale: string;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onReady: () => void;
  onPrint: () => void;
  autoPrint: boolean;
}) {
  const isNew = o.status === 'PLACED';
  const preparing = o.status === 'PREPARING' || o.status === 'DRIVER_ASSIGNED';
  const finished = o.status === 'DELIVERED' || o.status === 'CANCELLED';
  return (
    <article className={`rounded-[24px] bg-background border-[1.5px] overflow-hidden ${isNew ? 'border-accent shadow-[0_0_0_3px_rgb(255_209_0/0.35)]' : 'border-border'}`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${isNew ? 'bg-accent text-ink' : 'bg-surface'}`}>
        <span className="text-2xl font-bold">#{o.id}</span>
        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${isNew ? 'bg-ink text-accent' : o.status === 'CANCELLED' ? 'bg-danger/15 text-danger' : 'bg-ink/10 dark:bg-white/10'}`}>
          {tx.st[o.status] ?? o.status}
        </span>
        <span className="ms-auto text-sm opacity-75">{timeAgo(o.created_at, locale)}</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {o.customer && (
          <p className="text-sm text-muted">
            {tx.customer}: <span className="text-fg font-medium">{o.customer}</span>
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {o.items.map((it, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="min-w-9 h-9 px-2 rounded-xl bg-ink text-accent dark:bg-accent dark:text-ink font-bold flex items-center justify-center shrink-0">{it.qty.toLocaleString(locale)}×</span>
              <span className="flex-1 text-lg font-medium leading-snug pt-1">{itemName(it.name, lang)}</span>
              <span className="text-sm text-muted pt-1.5 whitespace-nowrap">{money(Number(it.price) * it.qty, o.currency, locale)}</span>
            </li>
          ))}
        </ul>
        {o.notes && (
          <p className="rounded-2xl bg-accent/20 border-[1.5px] border-accent px-3.5 py-2.5 text-[15px] leading-relaxed">
            <span className="font-semibold">{tx.notes}: </span>
            {o.notes}
          </p>
        )}
        <div className="flex items-center justify-between border-t-[1.5px] border-dashed border-border pt-3">
          <span className="text-sm text-muted">{tx.cash}</span>
          <span className="text-xl font-bold">{money(o.total, o.currency, locale)}</span>
        </div>
        {preparing && <p className="text-sm text-muted">{o.ready_at ? tx.isReady : o.driver_assigned ? tx.captain : tx.noCaptain}</p>}

        {isNew && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button onClick={onAccept} loading={busy} full className="!h-16 !text-base whitespace-nowrap !px-3">
              {autoPrint ? <Printer className="w-6 h-6" /> : <Check className="w-6 h-6" />}
              {autoPrint ? tx.acceptPrint : tx.accept}
            </Button>
            <Button variant="outline" onClick={onReject} disabled={busy} className="!h-16 !px-4">
              <X className="w-5 h-5" />
              {tx.reject}
            </Button>
          </div>
        )}
        {preparing && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button variant="dark" onClick={onReady} loading={busy} disabled={!!o.ready_at} full className="!h-14">
              <Check className="w-5 h-5" />
              {o.ready_at ? tx.isReady : tx.ready}
            </Button>
            <Button variant="outline" onClick={onPrint} className="!h-14 px-5" aria-label={tx.print}>
              <Printer className="w-5 h-5" />
            </Button>
          </div>
        )}
        {!isNew && !preparing && !finished && (
          <Button variant="outline" onClick={onPrint} className="!h-12" full>
            <Printer className="w-5 h-5" />
            {tx.print}
          </Button>
        )}
      </div>
    </article>
  );
}

function Sheet({ title, onClose, children, dir, closeLabel }: { title: string; onClose: () => void; children: React.ReactNode; dir: string; closeLabel: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" dir={dir} role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label={closeLabel} onClick={onClose} className="absolute inset-0 bg-black/50 animate-tour-fade" />
      <div className="relative w-full max-w-md bg-background rounded-t-[28px] sm:rounded-[28px] safe-bottom p-5 animate-slide-up max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label={closeLabel} className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PairScreen({ onDone }: { onDone: () => void }) {
  const { lang } = useI18n();
  const tx = merchantTxt(lang);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function pair(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await sb().rpc('merchant_pair', { p_code: code, p_label: label || null });
    setBusy(false);
    if (error) return setErr(/too_many/.test(error.message) ? tx.pairMany : tx.pairBad);
    onDone();
  }
  return (
    <main className="min-h-[100dvh] bg-ink text-white flex flex-col">
      <div className="flex-1 flex flex-col justify-end px-6 pt-[max(env(safe-area-inset-top),40px)] pb-8 gap-4">
        <span className="w-16 h-16 rounded-2xl bg-accent text-ink flex items-center justify-center">
          <StoreIcon className="w-8 h-8" />
        </span>
        <h1 className="text-3xl font-semibold leading-snug">{tx.pairTitle}</h1>
        <p className="text-white/70 leading-relaxed">{tx.pairSub}</p>
      </div>
      <form onSubmit={pair} className="bg-background text-fg rounded-t-[32px] px-6 pt-7 safe-bottom flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{tx.pairCode}</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!err}
            className="h-16 rounded-[18px] border-[1.5px] border-border bg-background text-center text-3xl font-semibold tracking-[0.4em] outline-none focus:border-fg aria-[invalid=true]:border-danger"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{tx.pairLabel}</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tx.pairLabelPh} className={inputCls} maxLength={60} />
        </label>
        {err && (
          <p role="alert" className="text-danger text-sm">
            {err}
          </p>
        )}
        <Button type="submit" variant="dark" full loading={busy} disabled={code.length !== 6} className="mb-4">
          {tx.pairBtn}
        </Button>
      </form>
    </main>
  );
}
