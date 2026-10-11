'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Clock, Eye, FileUp, Lock, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Button, inputCls } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { currentUser, sb } from '@/lib/hooks';

export type DocType = 'selfie' | 'national_id_front' | 'national_id_back' | 'driving_license' | 'vehicle_registration' | 'insurance' | 'vehicle_photo';

const META: Record<DocType, { emoji: string; number?: boolean; expiry?: boolean; selfie?: boolean }> = {
  selfie: { emoji: '🤳', selfie: true },
  national_id_front: { emoji: '🪪', number: true },
  national_id_back: { emoji: '🪪' },
  driving_license: { emoji: '🚘', number: true, expiry: true },
  vehicle_registration: { emoji: '📄', number: true, expiry: true },
  insurance: { emoji: '🛡️', number: true, expiry: true },
  vehicle_photo: { emoji: '📸' },
};

const L = {
  ar: {
    title: 'المستمسكات', sub: 'صور واضحة بدون انعكاس. تُحفظ بشكل مشفّر ولا يراها إلا فريق المراجعة.',
    docs: {
      selfie: ['صورة شخصية', 'التقط صورة لوجهك الآن — بدون نظارات شمسية أو قبعة'],
      national_id_front: ['الهوية — الوجه الأمامي', 'البطاقة الوطنية أو جواز السفر'],
      national_id_back: ['الهوية — الوجه الخلفي', ''],
      driving_license: ['إجازة السوق', 'سارية المفعول'],
      vehicle_registration: ['سنوية المركبة', 'باسمك أو مع تخويل'],
      insurance: ['تأمين المركبة', ''],
      vehicle_photo: ['صورة المركبة', 'من الأمام وتظهر اللوحة إن وجدت'],
    } as Record<DocType, [string, string]>,
    status: { missing: 'مطلوب', pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض', expired: 'منتهي الصلاحية', re_upload_required: 'أعد الرفع' } as Record<string, string>,
    take: 'التقط صورة', upload: 'ارفع صورة أو PDF', replace: 'استبدال', number: 'رقم المستمسك', expiry: 'تاريخ الانتهاء', send: 'إرسال للمراجعة', cancel: 'إلغاء',
    uploading: 'جارٍ الرفع الآمن…', tooBig: 'الملف كبير جدًا (الحد 10MB)', expiredErr: 'هذا المستمسك منتهي — ارفع نسخة سارية', failed: 'تعذّر الرفع، حاول مرة أخرى',
    progress: (a: number, b: number) => `${a} من ${b} مقبولة`, done: 'كل المستمسكات مرفوعة — سنراجعها ونبلغك قريبًا', reason: 'سبب الرفض:',
    private: 'محمي — لا يظهر لأي مستخدم',
  },
  en: {
    title: 'Documents', sub: 'Clear photos, no glare. Stored encrypted and seen only by our review team.',
    docs: {
      selfie: ['Selfie', 'Take a photo of your face now — no sunglasses or hat'],
      national_id_front: ['ID — front', 'National ID or passport'],
      national_id_back: ['ID — back', ''],
      driving_license: ['Driving licence', 'Must be valid'],
      vehicle_registration: ['Vehicle registration', 'In your name or with authorisation'],
      insurance: ['Vehicle insurance', ''],
      vehicle_photo: ['Vehicle photo', 'From the front, plate visible if any'],
    } as Record<DocType, [string, string]>,
    status: { missing: 'Required', pending: 'In review', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', re_upload_required: 'Upload again' } as Record<string, string>,
    take: 'Take photo', upload: 'Upload photo or PDF', replace: 'Replace', number: 'Document number', expiry: 'Expiry date', send: 'Send for review', cancel: 'Cancel',
    uploading: 'Uploading securely…', tooBig: 'File too large (max 10MB)', expiredErr: 'This document has expired — upload a valid one', failed: 'Upload failed, try again',
    progress: (a: number, b: number) => `${a} of ${b} approved`, done: 'All documents sent — we’ll review them and let you know soon', reason: 'Reason:',
    private: 'Private — never shown to customers',
  },
};
export function docTxt(lang: string) {
  return lang === 'ar' || lang === 'ku' ? L.ar : L.en;
}

/** Re-encode photos (max 1800px, JPEG) — sharp enough to read, small enough for weak networks; also strips location data. */
async function prepare(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.88));
  } catch {
    return file;
  }
}

const TONE: Record<string, string> = {
  approved: 'bg-success/10 text-success',
  pending: 'bg-accent/25 text-fg',
  rejected: 'bg-danger/10 text-danger',
  expired: 'bg-danger/10 text-danger',
  re_upload_required: 'bg-danger/10 text-danger',
  missing: 'bg-surface text-muted',
};
function StatusIcon({ s }: { s: string }) {
  if (s === 'approved') return <CheckCircle2 className="w-4 h-4" />;
  if (s === 'pending') return <Clock className="w-4 h-4" />;
  if (s === 'missing') return <FileUp className="w-4 h-4" />;
  return <XCircle className="w-4 h-4" />;
}

/** The captain's checklist: every required paper with its review state and an upload button. */
export function DriverDocs({ me, onChange }: { me: any; onChange: (d: any) => void }) {
  const { lang, dir } = useI18n();
  const tx = docTxt(lang);
  const required: DocType[] = me?.required_docs ?? [];
  const docs: Record<string, any> = Object.fromEntries((me?.docs ?? []).map((d: any) => [d.type, d]));
  const approved = required.filter((r) => docs[r]?.status === 'approved').length;
  const sent = required.filter((r) => docs[r] && docs[r].status !== 'rejected' && docs[r].status !== 're_upload_required' && docs[r].status !== 'expired').length;
  const [open, setOpen] = useState<DocType | null>(null);

  return (
    <section className="flex flex-col gap-3 w-full" dir={dir}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">{tx.title}</h2>
          <span className="text-xs font-bold text-muted">{tx.progress(approved, required.length)}</span>
        </div>
        <p className="text-sm text-muted mt-0.5 flex items-start gap-1.5">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          {tx.sub}
        </p>
        <div className="h-1.5 rounded-full bg-surface mt-3 overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${required.length ? (approved / required.length) * 100 : 0}%` }} />
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {required.map((type) => {
          const d = docs[type];
          const s = d?.status ?? 'missing';
          const [label, hint] = tx.docs[type] ?? [type, ''];
          return (
            <li key={type} className="rounded-2xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center text-2xl shrink-0">{META[type]?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold truncate">{label}</p>
                  {hint && s === 'missing' && <p className="text-xs text-muted truncate">{hint}</p>}
                  {d?.expiry && <p className="text-xs text-muted" dir="ltr">{d.expiry}</p>}
                </div>
                <span className={`text-[11px] font-black h-7 px-2.5 rounded-full flex items-center gap-1 shrink-0 ${TONE[s] ?? TONE.missing}`}>
                  <StatusIcon s={s} />
                  {tx.status[s] ?? s}
                </span>
              </div>
              {d?.reason && (s === 'rejected' || s === 're_upload_required') && (
                <p className="text-sm text-danger mt-2 rounded-xl bg-danger/5 px-3 py-2">
                  {tx.reason} {d.reason}
                </p>
              )}
              {s !== 'approved' && s !== 'pending' && open !== type && (
                <button onClick={() => setOpen(type)} className="mt-3 w-full h-11 rounded-xl bg-ink text-white font-bold text-sm flex items-center justify-center gap-2">
                  {META[type]?.selfie ? <Camera className="w-4 h-4 text-accent" /> : <FileUp className="w-4 h-4 text-accent" />}
                  {s === 'missing' ? (META[type]?.selfie ? tx.take : tx.upload) : tx.replace}
                </button>
              )}
              {s === 'pending' && open !== type && (
                <button onClick={() => setOpen(type)} className="mt-2 text-xs font-bold text-muted flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {tx.replace}
                </button>
              )}
              {open === type && <Uploader type={type} onCancel={() => setOpen(null)} onDone={(m) => (setOpen(null), onChange(m))} />}
            </li>
          );
        })}
      </ul>
      {sent === required.length && approved < required.length && (
        <p className="rounded-2xl bg-surface p-4 text-sm font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          {tx.done}
        </p>
      )}
    </section>
  );
}

function Uploader({ type, onCancel, onDone }: { type: DocType; onCancel: () => void; onDone: (me: any) => void }) {
  const { lang } = useI18n();
  const tx = docTxt(lang);
  const meta = META[type];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.click();
  }, []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setErr(tx.tooBig);
    setErr(null);
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  async function send() {
    if (!file) return input.current?.click();
    if (meta.expiry && expiry && new Date(expiry) < new Date(new Date().toDateString())) return setErr(tx.expiredErr);
    setBusy(true);
    setErr(null);
    try {
      const user = await currentUser();
      if (!user) throw new Error('auth');
      const blob = await prepare(file);
      const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type.startsWith('image/heic') ? 'heic' : 'jpg';
      const path = `${user.id}/${type}-${Date.now()}.${ext}`;
      const up = await sb().storage.from('driver-docs').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false, cacheControl: '0' });
      if (up.error) throw up.error;
      const { data, error } = await sb().rpc('driver_doc_submit', { p_type: type, p_path: path, p_number: number || null, p_expiry: expiry || null });
      if (error) throw error;
      onDone(data);
    } catch (e: any) {
      setErr(/expired/.test(String(e?.message)) ? tx.expiredErr : tx.failed);
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        accept={meta.selfie ? 'image/*' : 'image/*,application/pdf'}
        {...(meta.selfie ? { capture: 'user' as const } : {})}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className={`w-full max-h-64 object-contain rounded-xl bg-surface ${meta.selfie ? 'aspect-square object-cover max-w-[220px] mx-auto rounded-full' : ''}`} />
      ) : file ? (
        <p className="rounded-xl bg-surface px-3 py-3 text-sm font-bold truncate">📄 {file.name}</p>
      ) : (
        <button onClick={() => input.current?.click()} className="h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-sm font-bold text-muted">
          {meta.selfie ? <Camera className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
          {meta.selfie ? tx.take : tx.upload}
        </button>
      )}
      {(meta.number || meta.expiry) && (
        <div className="grid grid-cols-2 gap-2">
          {meta.number && <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={tx.number} className={`${inputCls} ${meta.expiry ? "" : "col-span-2"}`} dir="ltr" />}
          {meta.expiry && (
            <label className="flex flex-col">
              <span className="sr-only">{tx.expiry}</span>
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label={tx.expiry} className={inputCls} dir="ltr" />
            </label>
          )}
        </div>
      )}
      {err && <p role="alert" className="text-sm text-danger font-bold">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button size="md" variant="soft" onClick={onCancel} disabled={busy}>
          {tx.cancel}
        </Button>
        <Button size="md" loading={busy} onClick={send}>
          {busy ? tx.uploading : tx.send}
        </Button>
      </div>
      <p className="text-[11px] text-muted flex items-center gap-1">
        <Lock className="w-3 h-3" />
        {tx.private}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ admin review */
const A = {
  ar: { docs: 'المستمسكات', phoneOk: 'رقم الهاتف مؤكَّد', phoneNo: 'رقم الهاتف غير مؤكَّد', view: 'عرض', approve: 'قبول', reject: 'رفض', reupload: 'طلب إعادة رفع', reason: 'اكتب السبب (يظهر للسائق)', none: 'لم يُرفع بعد', logged: 'كل فتح لمستمسك يُسجَّل في سجل التدقيق' },
  en: { docs: 'Documents', phoneOk: 'Phone verified', phoneNo: 'Phone not verified', view: 'View', approve: 'Approve', reject: 'Reject', reupload: 'Ask to re-upload', reason: 'Reason (shown to the driver)', none: 'Not uploaded yet', logged: 'Every document opening is written to the audit log' },
};

export function AdminDriverDocs({ driverId, onChanged }: { driverId: number; onChanged?: () => void }) {
  const { lang } = useI18n();
  const tx = docTxt(lang);
  const a = lang === 'ar' || lang === 'ku' ? A.ar : A.en;
  const [data, setData] = useState<any>(null);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    sb()
      .rpc('admin_driver_docs', { p_driver: driverId })
      .then(({ data, error }) => (error ? setErr(error.message) : setData(data)));
  }, [driverId]);

  async function view(d: any) {
    const { data: s, error } = await sb().storage.from('driver-docs').createSignedUrl(d.path, 120);
    if (error || !s) return setErr(error?.message ?? 'error');
    sb().rpc('admin_doc_viewed', { p_doc: d.id });
    setUrls((u) => ({ ...u, [d.id]: s.signedUrl }));
  }

  async function review(d: any, status: string) {
    setBusy(`${d.id}${status}`);
    setErr(null);
    const { data: res, error } = await sb().rpc('admin_review_doc', { p_doc: d.id, p_status: status, p_reason: reason[d.id] || null });
    setBusy(null);
    if (error) return setErr(error.message === 'reason_required' ? a.reason : error.message);
    setData(res);
    onChanged?.();
  }

  if (!data) return <p className="text-sm text-muted">{err ?? '…'}</p>;
  const docs: Record<string, any> = Object.fromEntries((data.docs ?? []).map((d: any) => [d.type, d]));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black">{a.docs}</p>
        <span className={`text-xs font-bold ${data.phone_verified_at ? 'text-success' : 'text-muted'}`}>{data.phone_verified_at ? `✓ ${a.phoneOk}` : a.phoneNo}</span>
      </div>
      {(data.required ?? []).map((type: DocType) => {
        const d = docs[type];
        const s = d?.status ?? 'missing';
        return (
          <div key={type} className="rounded-xl border border-border p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{META[type]?.emoji}</span>
              <p className="font-bold flex-1 min-w-0 truncate">{tx.docs[type]?.[0] ?? type}</p>
              <span className={`text-[11px] font-black h-6 px-2 rounded-full flex items-center gap-1 ${TONE[s] ?? TONE.missing}`}>{d ? tx.status[s] ?? s : a.none}</span>
            </div>
            {d && (
              <>
                {(d.number || d.expiry) && (
                  <p className="text-xs text-muted" dir="ltr">
                    {d.number} {d.expiry ? `· ${d.expiry}` : ''}
                  </p>
                )}
                {urls[d.id] ? (
                  /\.pdf$/i.test(d.path) ? (
                    <a href={urls[d.id]} target="_blank" rel="noreferrer" className="text-sm font-bold underline">PDF</a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a href={urls[d.id]} target="_blank" rel="noreferrer"><img src={urls[d.id]} alt="" className="w-full max-h-72 object-contain rounded-lg bg-surface" /></a>
                  )
                ) : (
                  <button onClick={() => view(d)} className="h-9 rounded-lg bg-surface text-sm font-bold flex items-center justify-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {a.view}
                  </button>
                )}
                {s !== 'approved' && (
                  <input value={reason[d.id] ?? ''} onChange={(e) => setReason((r) => ({ ...r, [d.id]: e.target.value }))} placeholder={a.reason} className={`${inputCls} h-9 text-sm`} />
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  <Button size="sm" loading={busy === `${d.id}approved`} disabled={s === 'approved'} onClick={() => review(d, 'approved')}>
                    {a.approve}
                  </Button>
                  <Button size="sm" variant="soft" loading={busy === `${d.id}re_upload_required`} onClick={() => review(d, 're_upload_required')}>
                    {a.reupload}
                  </Button>
                  <Button size="sm" variant="danger" loading={busy === `${d.id}rejected`} onClick={() => review(d, 'rejected')}>
                    {a.reject}
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}
      {err && <p className="text-sm text-danger font-bold">{err}</p>}
      <p className="text-[11px] text-muted">{a.logged}</p>
    </div>
  );
}
