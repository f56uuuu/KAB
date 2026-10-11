'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, Send, XCircle } from 'lucide-react';
import { Panel, cellInput } from '@/components/admin';
import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

const T = {
  ar: {
    title: 'رسائل التحقق (SMS)', on: 'مفعّل — الدخول برمز يصل للهاتف', off: 'غير مفعّل — الدخول بدون رمز (وضع التجربة)',
    provider: 'طريقة الإرسال', none: 'إيقاف', smsgate: 'هاتف أندرويد (مجاني — SMS Gateway)', telegram: 'Telegram Gateway (0.01$ للرمز)',
    howSmsgate: 'ثبّت تطبيق SMS Gateway for Android على هاتف فيه شريحة، فعّل Cloud server، وانسخ اسم المستخدم وكلمة السر من التطبيق هنا. الرسائل تُرسل من شريحة الهاتف.',
    howTelegram: 'أنشئ حسابًا في gateway.telegram.org وانسخ الـ API token هنا. الرمز يصل للمستخدم داخل تيليغرام.',
    user: 'اسم المستخدم (Username)', pass: 'كلمة السر (Password)', token: 'API token', keep: 'محفوظ — اتركه فارغًا للإبقاء عليه',
    save: 'حفظ', test: 'إرسال رسالة تجربة إلى', send: 'إرسال', log: 'آخر الرسائل', empty: 'لا توجد رسائل بعد', saved: 'تم الحفظ', err: 'خطأ: ',
    only: 'هذه الإعدادات للمدير العام فقط.',
  },
  en: {
    title: 'Verification texts (SMS)', on: 'On — sign-in with a code sent to the phone', off: 'Off — sign-in without a code (testing mode)',
    provider: 'Delivery', none: 'Off', smsgate: 'Android phone (free — SMS Gateway)', telegram: 'Telegram Gateway ($0.01 per code)',
    howSmsgate: 'Install “SMS Gateway for Android” on a phone with a SIM, turn on Cloud server, and copy the username and password from the app here. Texts are sent from that SIM.',
    howTelegram: 'Create an account at gateway.telegram.org and paste the API token here. Codes arrive inside Telegram.',
    user: 'Username', pass: 'Password', token: 'API token', keep: 'Saved — leave empty to keep',
    save: 'Save', test: 'Send a test message to', send: 'Send', log: 'Latest messages', empty: 'No messages yet', saved: 'Saved', err: 'Error: ',
    only: 'Only the super admin can change these settings.',
  },
};

export function SmsSettings() {
  const { lang } = useI18n();
  const tx = lang === 'ar' || lang === 'ku' ? T.ar : T.en;
  const [st, setSt] = useState<any>(null);
  const [provider, setProvider] = useState('off');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('+964');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () =>
    sb()
      .rpc('admin_sms_status')
      .then(({ data, error }) => {
        if (error) return setMsg(tx.err + error.message);
        setSt(data);
        setProvider((data as any)?.provider ?? 'off');
      });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc('admin_set_sms', { p_provider: provider, p_user: user || null, p_pass: pass || null, p_token: token || null });
    setBusy(false);
    if (error) return setMsg(error.message === 'forbidden' ? tx.only : tx.err + error.message);
    setSt(data);
    setUser('');
    setPass('');
    setToken('');
    setMsg(tx.saved);
  }
  async function test() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc('admin_sms_test', { p_phone: phone.replace(/[^\d+]/g, '') });
    setBusy(false);
    if (error) return setMsg(tx.err + error.message);
    setSt(data);
    setTimeout(load, 4000);
  }

  return (
    <Panel title={tx.title} className="mt-4">
      <div className="px-5 pb-5 flex flex-col gap-4">
        <div className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${st?.ready ? 'bg-success/10 text-success' : 'bg-surface text-muted'}`}>
          {st?.ready ? <CheckCircle2 className="w-5 h-5" /> : <MessageSquareText className="w-5 h-5" />}
          {st?.ready ? tx.on : tx.off}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">{tx.provider}</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={cellInput}>
            <option value="off">{tx.none}</option>
            <option value="smsgate">{tx.smsgate}</option>
            <option value="telegram">{tx.telegram}</option>
          </select>
        </label>
        {provider === 'smsgate' && (
          <>
            <p className="text-sm text-muted leading-6">
              {tx.howSmsgate}{' '}
              <a href="https://sms-gate.app" target="_blank" rel="noreferrer" className="underline font-bold text-fg">
                sms-gate.app
              </a>
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={user} onChange={(e) => setUser(e.target.value)} placeholder={st?.has_smsgate ? tx.keep : tx.user} className={cellInput} dir="ltr" autoComplete="off" />
              <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder={st?.has_smsgate ? tx.keep : tx.pass} type="password" className={cellInput} dir="ltr" autoComplete="new-password" />
            </div>
          </>
        )}
        {provider === 'telegram' && (
          <>
            <p className="text-sm text-muted leading-6">
              {tx.howTelegram}{' '}
              <a href="https://gateway.telegram.org" target="_blank" rel="noreferrer" className="underline font-bold text-fg">
                gateway.telegram.org
              </a>
            </p>
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder={st?.has_telegram ? tx.keep : tx.token} type="password" className={cellInput} dir="ltr" autoComplete="off" />
          </>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="dark" loading={busy} onClick={save}>
            {tx.save}
          </Button>
        </div>
        {st?.ready && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">{tx.test}</span>
            <div className="flex gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={cellInput} dir="ltr" inputMode="tel" />
              <Button size="sm" variant="soft" loading={busy} onClick={test}>
                <Send className="w-4 h-4" />
                {tx.send}
              </Button>
            </div>
          </div>
        )}
        {msg && <p className="text-sm font-bold">{msg}</p>}
        <div>
          <p className="text-sm font-bold mb-2">{tx.log}</p>
          {!st?.log?.length ? (
            <p className="text-sm text-muted">{tx.empty}</p>
          ) : (
            <ul className="text-xs divide-y divide-border border border-border rounded-xl overflow-hidden">
              {st.log.map((l: any, i: number) => (
                <li key={i} className="px-3 py-2 flex items-center gap-2" dir="ltr">
                  {l.status_code && l.status_code < 300 ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <XCircle className="w-4 h-4 text-danger shrink-0" />}
                  <span className="font-bold">{l.phone_masked}</span>
                  <span className="text-muted">{l.provider} · {l.purpose} · {l.status_code ?? '…'}</span>
                  <span className="text-muted truncate ms-auto">{new Date(l.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
