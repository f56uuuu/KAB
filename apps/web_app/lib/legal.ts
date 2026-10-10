// Public legal texts (Privacy, Terms, Account deletion). Linked from the app and from the store listings.
// Arabic and English are the authoritative versions; Kurdish readers get Arabic, Turkish readers get English.

export type LegalDoc = { title: string; updated: string; intro: string; sections: { h: string; p: string[] }[] };
export type LegalLang = 'ar' | 'en';

export const LEGAL_UPDATED = '2026-10-10';

export function legalLang(lang: string): LegalLang {
  return lang === 'ar' || lang === 'ku' ? 'ar' : 'en';
}

const privacy: Record<LegalLang, LegalDoc> = {
  ar: {
    title: 'سياسة الخصوصية',
    updated: 'آخر تحديث',
    intro:
      'تشرح هذه السياسة ما البيانات التي يجمعها تطبيق KAP (كاب) وموقعه، ولماذا، وكيف نحميها، وما حقوقك. نجمع أقل قدر ممكن من البيانات اللازم لتقديم الخدمة.',
    sections: [
      {
        h: 'البيانات التي نجمعها',
        p: [
          'بيانات الحساب: رقم الهاتف، والاسم الذي تختاره، ولغة التطبيق.',
          'الموقع: موقعك الدقيق أثناء استخدام التطبيق فقط لتحديد نقطة الالتقاء والوجهة وحساب السعر وتتبّع الرحلة. لا نجمع الموقع في الخلفية من العملاء. يشارك الكابتن موقعه أثناء وجوده "متصلًا" فقط ليصله أقرب طلب.',
          'الطلبات والرحلات: العناوين، والمسار، والسعر، والحالة، والتقييمات، والملاحظات التي تكتبها.',
          'بيانات الكابتن: الاسم، والهاتف، ونوع المركبة ولوحتها، والمستندات التي يرفعها للتحقق.',
          'بيانات تقنية محدودة: نوع الجهاز والمتصفح وسجلات الأخطاء اللازمة لتشغيل الخدمة وحمايتها.',
          'على جهازك فقط: الأماكن المحفوظة (البيت، العمل، المفضلة) وآخر المسارات وأجزاء الخريطة المحفوظة للاستخدام دون إنترنت. لا تُرسل هذه إلى خوادمنا إلا إذا حفظت البيت أو العمل في حسابك.',
        ],
      },
      {
        h: 'لماذا نستخدمها',
        p: [
          'لتقديم الرحلات والتوصيل والطلبات وربطك بأقرب كابتن أو متجر.',
          'لحساب الأسعار والخصومات بشكل شفاف ومنع التلاعب والاحتيال.',
          'لإرسال إشعارات عن حالة طلبك، والعروض فقط إذا سمحت بها.',
          'للدعم الفني وحل النزاعات والالتزام بالقانون.',
        ],
      },
      {
        h: 'مع من نشاركها',
        p: [
          'الكابتن أو المتجر المعني بطلبك فقط، وبالقدر اللازم لتنفيذه (مثل نقطة الالتقاء والاسم الأول).',
          'مزودو الخدمة الذين يشغّلون المنصة نيابةً عنا: الاستضافة وقاعدة البيانات (Supabase وVercel)، والخرائط والمسارات (OpenStreetMap عبر OpenFreeMap وNominatim وOSRM)، والرسائل النصية لرمز الدخول.',
          'الجهات الرسمية عند وجود طلب قانوني ملزم.',
          'لا نبيع بياناتك الشخصية، ولا نشاركها لأغراض إعلانية.',
        ],
      },
      {
        h: 'الحماية والاحتفاظ',
        p: [
          'تُنقل البيانات مشفرة (HTTPS) وتُحمى بصلاحيات وصول على مستوى كل صف في قاعدة البيانات. مستندات الكباتن غير عامة ولا يراها إلا المشرفون المخوّلون.',
          'نحتفظ ببيانات الحساب ما دام الحساب فعّالًا. سجلات الرحلات والمدفوعات قد نحتفظ بها مدة أطول عند وجود التزام قانوني أو مالي، لكن بعد فصلها عن هويتك عند حذف الحساب.',
        ],
      },
      {
        h: 'حقوقك',
        p: [
          'يمكنك الاطلاع على بياناتك وتعديلها من صفحة الحساب.',
          'يمكنك حذف حسابك في أي وقت من الحساب ← حذف الحساب، أو عبر صفحة kab-amber.vercel.app/delete-account.',
          'يمكنك إيقاف إذن الموقع أو الإشعارات من إعدادات جهازك في أي وقت.',
        ],
      },
      {
        h: 'الأطفال',
        p: ['الخدمة موجهة لمن هم في عمر 18 عامًا فأكثر. لا نجمع عن قصد بيانات من هم دون ذلك.'],
      },
      {
        h: 'التغييرات والتواصل',
        p: ['سننشر أي تعديل على هذه الصفحة مع تاريخ التحديث. للأسئلة حول الخصوصية تواصل معنا عبر صفحة الدعم.'],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated',
    intro:
      'This policy explains what data the KAP app and website collect, why, how we protect it and what your rights are. We collect only what we need to run the service.',
    sections: [
      {
        h: 'What we collect',
        p: [
          'Account data: phone number, the name you choose, and your app language.',
          'Location: your precise location while you use the app, only to set pickup and destination, price the trip and track it. We do not collect customer location in the background. Captains share their location only while they are "online" so nearby jobs can reach them.',
          'Orders and trips: addresses, route, price, status, ratings and notes you write.',
          'Captain data: name, phone, vehicle type and plate, and the documents uploaded for verification.',
          'Limited technical data: device and browser type and error logs needed to run and protect the service.',
          'On your device only: saved places (home, work, favourites), recent routes and map areas saved for offline use. These are not sent to our servers unless you save home or work to your account.',
        ],
      },
      {
        h: 'Why we use it',
        p: [
          'To provide rides, deliveries and orders and match you with the nearest captain or store.',
          'To calculate prices and discounts transparently and prevent abuse and fraud.',
          'To notify you about your order, and about offers only if you allow it.',
          'For support, dispute resolution and legal compliance.',
        ],
      },
      {
        h: 'Who we share it with',
        p: [
          'Only the captain or store handling your order, and only what they need (such as the pickup point and your first name).',
          'Service providers that run the platform for us: hosting and database (Supabase, Vercel), maps and routing (OpenStreetMap via OpenFreeMap, Nominatim, OSRM), and SMS for sign-in codes.',
          'Authorities when we receive a binding legal request.',
          'We do not sell your personal data or share it for advertising.',
        ],
      },
      {
        h: 'Security and retention',
        p: [
          'Data is encrypted in transit (HTTPS) and protected by row-level access rules in the database. Captain documents are never public and only authorised staff can view them.',
          'We keep account data while your account is active. Trip and payment records may be kept longer where the law or accounting requires it, but they are detached from your identity when you delete your account.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You can view and edit your data on the Account page.',
          'You can delete your account at any time from Account → Delete account, or at kab-amber.vercel.app/delete-account.',
          'You can turn off location or notification permission in your device settings at any time.',
        ],
      },
      { h: 'Children', p: ['The service is for people aged 18 and over. We do not knowingly collect data from anyone younger.'] },
      { h: 'Changes and contact', p: ['We will post any change on this page with its date. For privacy questions, contact us through the Support page.'] },
    ],
  },
};

const terms: Record<LegalLang, LegalDoc> = {
  ar: {
    title: 'شروط الاستخدام',
    updated: 'آخر تحديث',
    intro: 'باستخدامك تطبيق KAP (كاب) فإنك توافق على هذه الشروط. إذا لم توافق عليها فلا تستخدم الخدمة.',
    sections: [
      {
        h: 'الخدمة',
        p: [
          'KAP منصة تقنية تربط العملاء بالكباتن والمتاجر المستقلين لتقديم الرحلات والتوصيل والطلبات. الكباتن والمتاجر مسؤولون عن الخدمة التي يقدمونها.',
          'قد تختلف الخدمات المتاحة والأسعار من مدينة لأخرى، وقد نوقف خدمة في مدينة مؤقتًا.',
        ],
      },
      {
        h: 'الحساب',
        p: [
          'يجب أن يكون عمرك 18 عامًا أو أكثر، وأن تقدم رقم هاتف صحيحًا تملكه.',
          'أنت مسؤول عن كل نشاط يتم من حسابك. نحتفظ بحق إيقاف أي حساب يُساء استخدامه أو يخالف هذه الشروط.',
        ],
      },
      {
        h: 'الأسعار والدفع',
        p: [
          'يظهر السعر المتوقع ورسوم الإلغاء قبل التأكيد. قد يتغير السعر النهائي إذا تغير المسار أو الوجهة.',
          'الدفع نقدًا للكابتن ما لم تظهر وسيلة دفع أخرى في التطبيق. الكوبونات لها شروط وتاريخ انتهاء ولا تُستبدل نقدًا.',
        ],
      },
      {
        h: 'السلوك',
        p: [
          'يُمنع استخدام الخدمة لأي غرض غير قانوني أو نقل مواد محظورة، أو الإساءة للكباتن أو العملاء، أو التلاعب بالأسعار أو التقييمات أو الكوبونات.',
          'يلتزم الكابتن بقوانين المرور وبحالة مركبة سليمة ومستندات سارية.',
        ],
      },
      {
        h: 'الخرائط',
        p: [
          'بيانات الخرائط © مساهمو OpenStreetMap، ومتاحة بموجب رخصة ODbL. الخرائط والمسارات تقديرية؛ اتبع دائمًا إشارات المرور والطريق الفعلي.',
          'الخرائط المحفوظة على جهازك للاستخدام دون إنترنت قد لا تعكس آخر التغييرات في الطرق.',
        ],
      },
      {
        h: 'الملكية الفكرية',
        p: ['اسم KAP وشعاره وتصميم التطبيق ملك للمشغّل. لا يجوز نسخها أو استخدامها دون إذن كتابي.'],
      },
      {
        h: 'حدود المسؤولية',
        p: ['نقدّم الخدمة "كما هي" ونبذل جهدنا لاستمرارها، لكن لا نضمن خلوها من الانقطاع. لا نتحمل المسؤولية عن الأضرار غير المباشرة بالقدر الذي يسمح به القانون.'],
      },
      {
        h: 'التغييرات والقانون',
        p: ['قد نعدّل هذه الشروط ونعلن ذلك في التطبيق. تخضع هذه الشروط لقوانين البلد الذي تُقدَّم فيه الخدمة.'],
      },
    ],
  },
  en: {
    title: 'Terms of Use',
    updated: 'Last updated',
    intro: 'By using the KAP app you agree to these terms. If you do not agree, do not use the service.',
    sections: [
      {
        h: 'The service',
        p: [
          'KAP is a technology platform that connects customers with independent captains and stores for rides, deliveries and orders. Captains and stores are responsible for the service they provide.',
          'Available services and prices vary by city, and we may pause a service in a city.',
        ],
      },
      {
        h: 'Your account',
        p: [
          'You must be 18 or older and use a real phone number that you own.',
          'You are responsible for activity on your account. We may suspend accounts that are misused or break these terms.',
        ],
      },
      {
        h: 'Prices and payment',
        p: [
          'The estimated price and any cancellation fee are shown before you confirm. The final price may change if the route or destination changes.',
          'Payment is in cash to the captain unless another method is shown in the app. Coupons have conditions and an expiry date and cannot be exchanged for cash.',
        ],
      },
      {
        h: 'Conduct',
        p: [
          'Do not use the service for anything illegal or to carry prohibited items, abuse captains or customers, or manipulate prices, ratings or coupons.',
          'Captains must follow traffic law and keep a roadworthy vehicle and valid documents.',
        ],
      },
      {
        h: 'Maps',
        p: [
          'Map data © OpenStreetMap contributors, available under the ODbL. Maps and routes are estimates; always follow road signs and actual conditions.',
          'Maps saved on your device for offline use may not show the latest road changes.',
        ],
      },
      { h: 'Intellectual property', p: ['The KAP name, logo and app design belong to the operator and may not be copied or used without written permission.'] },
      {
        h: 'Liability',
        p: ['The service is provided "as is". We work to keep it running but cannot guarantee it will be uninterrupted. To the extent the law allows, we are not liable for indirect damages.'],
      },
      { h: 'Changes and law', p: ['We may update these terms and will announce it in the app. These terms are governed by the laws of the country where the service is provided.'] },
    ],
  },
};

const deletion: Record<LegalLang, LegalDoc> = {
  ar: {
    title: 'حذف الحساب',
    updated: 'آخر تحديث',
    intro: 'يمكنك حذف حسابك في KAP وبياناتك الشخصية في أي وقت.',
    sections: [
      {
        h: 'من داخل التطبيق',
        p: ['افتح الحساب ← حذف الحساب ← أكّد. يتم الحذف فورًا وتُسجَّل خارج كل الأجهزة.'],
      },
      {
        h: 'ما الذي يُحذف',
        p: [
          'الاسم ورقم الهاتف والبريد والعناوين المحفوظة والإشعارات وإعداداتها، ومستندات الكابتن وبيانات الحساب البنكي إن وجدت.',
          'الأماكن والمسارات والخرائط المحفوظة على جهازك تُمسح من الجهاز نفسه.',
        ],
      },
      {
        h: 'ما الذي يُحتفظ به',
        p: ['سجلات الرحلات والطلبات والمدفوعات دون أي بيانات تعرّف بك، للالتزامات المالية والقانونية ومنع الاحتيال.'],
      },
      {
        h: 'لا تستطيع الدخول؟',
        p: ['أرسل طلب الحذف من صفحة الدعم مع رقم الهاتف المسجل، وسننفذه خلال 30 يومًا بعد التحقق من ملكيتك للرقم.'],
      },
    ],
  },
  en: {
    title: 'Delete your account',
    updated: 'Last updated',
    intro: 'You can delete your KAP account and personal data at any time.',
    sections: [
      { h: 'In the app', p: ['Open Account → Delete account → confirm. Deletion is immediate and signs you out on every device.'] },
      {
        h: 'What is deleted',
        p: [
          'Your name, phone number, email, saved addresses, notifications and their settings, plus captain documents and bank details if any.',
          'Places, routes and maps saved on your device are wiped from the device itself.',
        ],
      },
      { h: 'What is kept', p: ['Trip, order and payment records without anything that identifies you, for financial and legal obligations and fraud prevention.'] },
      { h: 'Can’t sign in?', p: ['Send a deletion request from the Support page with your registered phone number. We will complete it within 30 days after confirming you own the number.'] },
    ],
  },
};

export const LEGAL = { privacy, terms, deletion };
