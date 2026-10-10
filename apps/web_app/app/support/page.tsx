'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { LegalPage } from '@/components/LegalPage';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { legalLang } from '@/lib/legal';

const TXT = {
  ar: {
    title: 'الدعم والتواصل', call: 'اتصال', whatsapp: 'واتساب', email: 'البريد', none: 'قنوات التواصل قيد الإعداد. حاول لاحقًا.',
    faq: [
      ['كيف أطلب رحلة؟', 'من الرئيسية اختر "رحلة"، حدّد الوجهة، راجع السعر ثم أكّد.'],
      ['هل يعمل التطبيق دون إنترنت؟', 'نعم، "خرائطي" تعمل دون إنترنت للمناطق التي فتحتها أو حفظتها، مع البيت والعمل والمسارات الأخيرة. طلب الرحلات يحتاج إنترنت.'],
      ['نسيت شيئًا في السيارة', 'تواصل معنا مع رقم الرحلة من صفحة "نشاطي" وسنصلك بالكابتن.'],
      ['كيف أصبح كابتن؟', 'من الرئيسية اختر "اعمل معنا" وأكمل التسجيل؛ يراجع فريقنا طلبك.'],
    ],
  },
  en: {
    title: 'Support and contact', call: 'Call', whatsapp: 'WhatsApp', email: 'Email', none: 'Contact channels are being set up. Please try later.',
    faq: [
      ['How do I book a ride?', 'On Home choose Ride, set your destination, check the price and confirm.'],
      ['Does the app work offline?', 'Yes. My map works offline for areas you opened or saved, with home, work and recent routes. Booking needs internet.'],
      ['I left something in the car', 'Contact us with the trip number from Activity and we will put you in touch with the captain.'],
      ['How do I become a captain?', 'On Home choose Drive with us and complete the sign-up; our team reviews it.'],
    ],
  },
};

export default function SupportPage() {
  const { lang } = useI18n();
  const tx = TXT[legalLang(lang)];
  const [c, setC] = useState<Record<string, string>>({});

  useEffect(() => {
    sb()
      .from('settings')
      .select('key,value')
      .in('key', ['support_phone', 'support_whatsapp', 'support_email'])
      .then(({ data }) => setC(Object.fromEntries((data ?? []).map((r: any) => [r.key, String(r.value ?? '').trim()]))));
  }, []);

  const wa = (c.support_whatsapp || '').replace(/[^\d]/g, '');
  const items = [
    c.support_phone && { href: `tel:${c.support_phone}`, Icon: Phone, label: tx.call, v: c.support_phone },
    wa && { href: `https://wa.me/${wa}`, Icon: MessageCircle, label: tx.whatsapp, v: c.support_whatsapp },
    c.support_email && { href: `mailto:${c.support_email}`, Icon: Mail, label: tx.email, v: c.support_email },
  ].filter(Boolean) as { href: string; Icon: typeof Phone; label: string; v: string }[];

  return (
    <LegalPage doc="deletion" title={tx.title} hideBody>
      <div className="mt-6 flex flex-col gap-2">
        {items.length === 0 && <p className="text-muted">{tx.none}</p>}
        {items.map(({ href, Icon, label, v }) => (
          <a key={href} href={href} className="h-16 rounded-2xl bg-surface px-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-ink text-accent flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="block font-extrabold">{label}</span>
              <span className="block text-sm text-muted" dir="ltr">
                {v}
              </span>
            </span>
          </a>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3">
        {tx.faq.map(([q, a]) => (
          <details key={q} className="rounded-2xl border border-border p-4">
            <summary className="font-extrabold cursor-pointer">{q}</summary>
            <p className="mt-2 leading-7 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </LegalPage>
  );
}
