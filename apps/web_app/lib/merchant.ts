import { money } from '@/lib/format';
import type { ReceiptLine } from '@/lib/receipt';

export type MerchantStore = { id: number; name: string; name_ar: string; is_open: boolean; address: string | null; currency: string };
export type MerchantOrder = {
  id: number;
  status: string;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  currency: string;
  payment_method: string;
  notes: string | null;
  customer: string | null;
  driver_assigned: boolean;
  items: { name: string; qty: number; price: number }[];
};

const AR = {
  title: 'شاشة المطعم',
  pairTitle: 'اربط هذا الجهاز بمطعمك',
  pairSub: 'اطلب من إدارة كاب رمز الربط المكوّن من 6 أرقام، ثم اكتبه هنا. يصلح الرمز لمدة 30 دقيقة ولمرة واحدة.',
  pairCode: 'رمز الربط',
  pairLabel: 'اسم الجهاز (اختياري)',
  pairLabelPh: 'مثل: جهاز الكاشير',
  pairBtn: 'اربط الجهاز',
  pairBad: 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.',
  pairMany: 'محاولات كثيرة. انتظر 10 دقائق ثم حاول مرة أخرى.',
  start: 'ابدأ استقبال الطلبات',
  startSub: 'يُبقي الشاشة مضاءة ويشغّل صوت التنبيه عند وصول طلب جديد.',
  open: 'مفتوح',
  closed: 'مغلق',
  tabNew: 'جديدة',
  tabActive: 'التحضير',
  tabDone: 'السابقة',
  emptyNew: 'لا توجد طلبات جديدة الآن. سيصدر الجهاز صوتًا عند وصول طلب.',
  emptyActive: 'لا توجد طلبات قيد التحضير.',
  emptyDone: 'لا توجد طلبات منتهية خلال آخر 24 ساعة.',
  order: 'طلب',
  acceptPrint: 'قبول وطباعة',
  accept: 'قبول',
  reject: 'رفض',
  rejectTitle: 'سبب رفض الطلب',
  rejectReasons: ['نفدت بعض المنتجات', 'المطعم مزدحم حاليًا', 'خارج أوقات العمل'],
  rejectConfirm: 'رفض الطلب',
  ready: 'جاهز للاستلام',
  isReady: 'جاهز، بانتظار الكابتن',
  print: 'طباعة',
  notes: 'ملاحظات الزبون',
  subtotal: 'المجموع',
  fee: 'التوصيل',
  discount: 'الخصم',
  total: 'الإجمالي',
  cash: 'الدفع نقدًا عند الاستلام',
  captain: 'تم تعيين كابتن',
  noCaptain: 'بانتظار كابتن',
  st: {
    PLACED: 'جديد',
    PREPARING: 'قيد التحضير',
    DRIVER_ASSIGNED: 'الكابتن في الطريق',
    PICKED_UP: 'استلمه الكابتن',
    ON_THE_WAY: 'في الطريق للزبون',
    DELIVERED: 'تم التوصيل',
    CANCELLED: 'ملغي',
  } as Record<string, string>,
  settings: 'إعدادات الطباعة',
  paper: 'عرض الورق',
  method: 'طريقة الطباعة',
  rawbt: 'تطبيق RawBT',
  rawbtSub: 'الأفضل لطابعة الجهاز المدمجة. ثبّته مرة واحدة من متجر Play واختر فيه الطابعة.',
  system: 'طباعة أندرويد',
  systemSub: 'تفتح نافذة الطباعة في النظام إن كان الجهاز يدعمها.',
  auto: 'اطبع تلقائيًا عند القبول',
  copies: 'عدد النسخ',
  sound: 'صوت تنبيه الطلبات',
  test: 'طباعة تجريبية',
  testTitle: 'طباعة تجريبية',
  testBody: 'إذا ظهرت هذه الورقة بحروف عربية واضحة فالطابعة جاهزة.',
  close: 'إغلاق',
  thanks: 'شكرًا لطلبك من كاب',
  customer: 'الزبون',
  failed: 'تعذّر تنفيذ الطلب. تحقّق من الاتصال وحاول مرة أخرى.',
  tooLate: 'لم يعد بالإمكان رفض هذا الطلب.',
  offline: 'لا يوجد اتصال. ستظهر الطلبات عند عودة الإنترنت.',
  updated: 'آخر تحديث',
};

const EN: typeof AR = {
  title: 'Store screen',
  pairTitle: 'Link this device to your store',
  pairSub: 'Ask KAP for the 6-digit link code and enter it here. A code works once, for 30 minutes.',
  pairCode: 'Link code',
  pairLabel: 'Device name (optional)',
  pairLabelPh: 'e.g. Cashier terminal',
  pairBtn: 'Link device',
  pairBad: 'That code is wrong or has expired. Ask for a new one.',
  pairMany: 'Too many attempts. Wait 10 minutes and try again.',
  start: 'Start receiving orders',
  startSub: 'Keeps the screen on and plays a sound when a new order arrives.',
  open: 'Open',
  closed: 'Closed',
  tabNew: 'New',
  tabActive: 'Preparing',
  tabDone: 'Past',
  emptyNew: 'No new orders right now. The device will sound when one arrives.',
  emptyActive: 'Nothing is being prepared.',
  emptyDone: 'No finished orders in the last 24 hours.',
  order: 'Order',
  acceptPrint: 'Accept and print',
  accept: 'Accept',
  reject: 'Reject',
  rejectTitle: 'Why are you rejecting this order?',
  rejectReasons: ['Some items are sold out', 'The kitchen is too busy', 'Outside opening hours'],
  rejectConfirm: 'Reject order',
  ready: 'Ready for pickup',
  isReady: 'Ready, waiting for the captain',
  print: 'Print',
  notes: 'Customer notes',
  subtotal: 'Subtotal',
  fee: 'Delivery',
  discount: 'Discount',
  total: 'Total',
  cash: 'Cash on delivery',
  captain: 'Captain assigned',
  noCaptain: 'Waiting for a captain',
  st: {
    PLACED: 'New',
    PREPARING: 'Preparing',
    DRIVER_ASSIGNED: 'Captain on the way',
    PICKED_UP: 'Picked up',
    ON_THE_WAY: 'On the way to customer',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  },
  settings: 'Printing settings',
  paper: 'Paper width',
  method: 'Print with',
  rawbt: 'RawBT app',
  rawbtSub: 'Best for the built-in printer. Install it once from Play Store and choose the printer in it.',
  system: 'Android printing',
  systemSub: "Opens the system print dialog, if the device supports it.",
  auto: 'Print automatically on accept',
  copies: 'Copies',
  sound: 'New order sound',
  test: 'Test print',
  testTitle: 'Test print',
  testBody: 'If this slip shows clear text, the printer is ready.',
  close: 'Close',
  thanks: 'Thank you for ordering with KAP',
  customer: 'Customer',
  failed: "Couldn't do that. Check the connection and try again.",
  tooLate: 'This order can no longer be rejected.',
  offline: "You're offline. Orders will appear when the connection returns.",
  updated: 'Updated',
};

export function merchantTxt(lang: string) {
  return lang === 'ar' || lang === 'ku' ? AR : EN;
}
export type MerchantTxt = typeof AR;

/** Items are stored as "عربي | English"; show the part for the current language. */
export function itemName(name: string, lang: string) {
  const [ar, en] = String(name).split(' | ');
  return (lang === 'ar' || lang === 'ku' ? ar : en || ar) || name;
}

export function receiptFor(o: MerchantOrder, store: MerchantStore, tx: MerchantTxt, lang: string, locale: string): ReceiptLine[] {
  const m = (n: number) => money(n, o.currency, locale);
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(o.created_at));
  const lines: ReceiptLine[] = [
    { kind: 'title', text: lang === 'ar' || lang === 'ku' ? 'كاب' : 'KAP' },
    { kind: 'center', text: lang === 'ar' || lang === 'ku' ? store.name_ar : store.name, size: 24, bold: true },
    { kind: 'rule' },
    { kind: 'center', text: `${tx.order} #${o.id}`, size: 34, bold: true },
    { kind: 'center', text: when, size: 20 },
  ];
  if (o.customer) lines.push({ kind: 'center', text: `${tx.customer}: ${o.customer}`, size: 20 });
  lines.push({ kind: 'rule', dashed: true });
  for (const it of o.items) {
    lines.push({ kind: 'row', right: `${it.qty.toLocaleString(locale)} × ${itemName(it.name, lang)}`, left: m(Number(it.price) * it.qty), size: 24, bold: true });
  }
  if (o.notes) {
    lines.push({ kind: 'space', h: 6 }, { kind: 'text', text: `${tx.notes}: ${o.notes}`, boxed: true, size: 22, bold: true });
  }
  lines.push({ kind: 'rule', dashed: true }, { kind: 'row', right: tx.subtotal, left: m(o.subtotal) }, { kind: 'row', right: tx.fee, left: m(o.delivery_fee) });
  if (Number(o.discount) > 0) lines.push({ kind: 'row', right: tx.discount, left: '−' + m(o.discount) });
  lines.push(
    { kind: 'row', right: tx.total, left: m(o.total), bold: true, size: 30 },
    { kind: 'rule' },
    { kind: 'center', text: tx.cash, size: 20 },
    { kind: 'center', text: tx.thanks, size: 20 },
    { kind: 'space', h: 8 },
  );
  return lines;
}

export function testReceipt(store: MerchantStore | null, tx: MerchantTxt, lang: string, locale: string): ReceiptLine[] {
  return [
    { kind: 'title', text: lang === 'ar' || lang === 'ku' ? 'كاب' : 'KAP' },
    ...(store ? [{ kind: 'center', text: lang === 'ar' || lang === 'ku' ? store.name_ar : store.name, size: 24, bold: true } as ReceiptLine] : []),
    { kind: 'rule' },
    { kind: 'center', text: tx.testTitle, size: 30, bold: true },
    { kind: 'text', text: tx.testBody, size: 22 },
    { kind: 'row', right: '1 × برغر لحم مع جبن', left: money(8000, store?.currency ?? 'IQD', locale), bold: true, size: 24 },
    { kind: 'row', right: '2 × Cheese burger', left: money(16000, store?.currency ?? 'IQD', locale), size: 24 },
    { kind: 'rule', dashed: true },
    { kind: 'center', text: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()), size: 20 },
  ];
}
