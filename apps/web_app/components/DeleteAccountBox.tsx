'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { legalLang } from '@/lib/legal';

const TXT = {
  ar: {
    signin: 'سجّل الدخول لحذف حسابك', delete: 'حذف حسابي', sure: 'هذا نهائي. سيتم حذف بياناتك الشخصية وتسجيل خروجك من كل الأجهزة.',
    reason: 'سبب الحذف (اختياري)', confirm: 'نعم، احذف الحساب', cancel: 'تراجع', done: 'تم حذف حسابك.',
    active_job: 'لديك رحلة أو طلب قيد التنفيذ. أنهِه أو ألغِه ثم أعد المحاولة.', admin_account: 'حسابات الإدارة تُحذف من لوحة السوبر أدمن.', error: 'تعذّر الحذف. حاول مجددًا أو تواصل مع الدعم.',
  },
  en: {
    signin: 'Sign in to delete your account', delete: 'Delete my account', sure: 'This is permanent. Your personal data will be deleted and you will be signed out on every device.',
    reason: 'Reason (optional)', confirm: 'Yes, delete my account', cancel: 'Cancel', done: 'Your account has been deleted.',
    active_job: 'You have a trip or order in progress. Finish or cancel it, then try again.', admin_account: 'Admin accounts are removed from the super admin panel.', error: 'Couldn’t delete. Try again or contact support.',
  },
};

/** Account deletion control: used on /delete-account and on the Account page. */
export function DeleteAccountBox({ compact = false }: { compact?: boolean }) {
  const { lang } = useI18n();
  const tx = TXT[legalLang(lang)];
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    sb()
      .auth.getUser()
      .then(({ data }) => setSignedIn(!!data.user))
      .catch(() => setSignedIn(false));
  }, []);

  async function run() {
    setBusy(true);
    setMsg(null);
    const { error } = await sb().rpc('delete_my_account', { p_reason: reason.trim() || null });
    if (error) {
      const code = (error.message || '').match(/active_job|admin_account/)?.[0] as 'active_job' | 'admin_account' | undefined;
      setMsg(code ? tx[code] : tx.error);
      setBusy(false);
      return;
    }
    try {
      ['kap_places_v1', 'kap_trips_v1', 'kap_city'].forEach((k) => localStorage.removeItem(k));
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('kap-map')).map((k) => caches.delete(k)));
    } catch {
      /* nothing stored */
    }
    await sb().auth.signOut().catch(() => {});
    setMsg(tx.done);
    setTimeout(() => window.location.assign('/welcome'), 1500);
  }

  if (signedIn === null) return null;
  return (
    <div className={compact ? '' : 'mt-6 rounded-2xl border border-border p-4'}>
      {!signedIn ? (
        <Link href="/login?next=/delete-account" className="h-12 rounded-xl bg-ink text-white font-bold flex items-center justify-center">
          {tx.signin}
        </Link>
      ) : !open ? (
        <button onClick={() => setOpen(true)} className="w-full h-12 rounded-xl border-2 border-danger text-danger font-bold flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" />
          {tx.delete}
        </button>
      ) : (
        <div className="rounded-2xl bg-danger/10 p-4 flex flex-col gap-3">
          <p className="text-sm font-bold">{tx.sure}</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tx.reason} maxLength={300} className="h-11 rounded-xl border border-border bg-background px-3 outline-none" />
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 h-11 rounded-xl bg-surface font-bold text-sm">
              {tx.cancel}
            </button>
            <button onClick={run} disabled={busy} className="flex-1 h-11 rounded-xl bg-danger text-white font-bold text-sm disabled:opacity-60">
              {tx.confirm}
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p role="status" className="mt-3 text-sm font-bold">
          {msg}
        </p>
      )}
    </div>
  );
}
