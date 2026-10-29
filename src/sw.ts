/**
 * عامل خدمة ذِكري — يُبنى عبر vite-plugin-pwa (injectManifest) ومكتبات Workbox.
 *
 * الاستراتيجيات كما في المواصفة المطلوبة:
 *  • الصفحات (طلبات التنقّل داخل نطاق الموقع): شبكة أولًا — تُجلب أحدث نسخة
 *    عند توفر الشبكة (فلا تُعرض نسخة قديمة بعد نشر جديد)، وعند تعذّر الشبكة
 *    تعود إلى نسخة الصفحة المحفوظة، فإن لم تُزر من قبل تُعرض لبّ التطبيق
 *    (index.html) المخزَّن مسبقًا فتعمل كل المسارات دون اتصال.
 *  • ملفات البناء بأسماء متغيّرة (assets/*-{hash}.…): تخزين أولًا — تُخبأ عند
 *    التثبيت بمعرّف إصدار (precache) ولا تُطلب من الشبكة إلا لتحديث في الخلفية.
 *  • التلاوات الصوتية من www.hisnmuslim.com/audio/ar/*.mp3 وحدها: تخزين أولًا
 *    في ذاكرة dhikri-audio — تُملأ إما بأول تشغيل أو بتنزيل يدوي من الإعدادات
 *    (حصن المسلم يسمح CORS). ولا مسار لأي طلب خارجي غير مُصرَّح به أصلًا.
 *  • مكتبة Supabase من cdn.jsdelivr.net — النطاق الخارجي الثاني المصرّح به
 *    (دخول «ملاحظاتي» الاختياري وحده): تخزين أولًا في dhikri-cdn، رابطها
 *    مثبَّت بإصدار فلا يتغيّر محتوه، فتعمل الميزة دون اتصال بعد أول تحميل.
 *  • كل مسارات الموقع محصورة في نطاق الموقع نفسه: روابط OAuth وأي نطاق خارجي
 *    آخر غير مسرَّح به لا تُخزَّن ولا تُعالَج من هذا العامل إطلاقًا.
 *  • مسارات تسجيل الدخول على الخادم (لو أُضيفت مستقبلًا: /auth/ و/login/
 *    و/oauth/ وcallback/) مستثناة من رجوع اللبّ عبر لوحة denylist — تنقّل
 *    الدخول لا يُعالَج كصفحة عادية قطعًا عن بقية الموقع، والمصادقة تجري
 *    عبر نطاق Supabase الخارجي مباشرة بلا مسار في هذا العامل.
 *
 * التسجيل ليس هنا: main.tsx يسجّل فقط في الإنتاج، وخارج localhost (لا تطوير
 * ولا معاينة)، وخارج الإطارات (window.self === window.top).
 */
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { AUDIO_CACHE_NAME, isAudioRequest } from "./lib/audioCache";

declare global {
  interface Window {
    /* يحقنه workbox-build لحظة البناء (نقطة الحقن الافتراضية self.__WB_MANIFEST) */
    __WB_MANIFEST: ({ url: string; revision?: string | null } | string)[];
  }
}

/* في الصفحة يُطبع self بنوع Window — نمرّر عبره وظائف العامل هنا */
const sw = self as unknown as ServiceWorkerGlobalScope;

/* تفعيل فوري: يصبح التحديث الجديد فعّالًا في الزيارة التالية بلا انتظار */
sw.addEventListener("install", () => {
  void sw.skipWaiting();
});
sw.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      sw.clients.claim(),
      /* تنظيف مخازن النسخة اليدوية السابقة (dhikri-v1-*) التي تركها SW القديم
         بعد استبداله — لا يعرفها هذا العامل فتبقى مهجورة دون هذه الجملة */
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k.startsWith("dhikri-v1-")).map((k) => caches.delete(k)))
        ),
    ])
  );
});

cleanupOutdatedCaches();

/* مسارات الخادم المستثناة من رجوع اللبّ (دفاعًا عن تنقّل الدخول — المصادقة
   الاختيارية في «ملاحظاتي» تجري على نطاق Supabase الخارجي مباشرة).
   الأنماط بلا تثبيت بالبداية لتعمل من مجلد فرعي أيضًا (/dhikri/auth مثلاً). */
const AUTH_DENY = [/\/auth(\/|$)/, /\/login(\/|$)/, /\/oauth(\/|$)/, /\/callback(\/|$)/];

/* الصفحات: شبكة أولًا بمهلة أربع ثوانٍ، ثم النسخة المحفوظة، ثم لبّ التطبيق.
   يُسجَّل هذا المسار عمدًا قبل precacheAndRoute: ترتيب التسجيل في Workbox هو
   الأولوية، ومسار اللبّ وحده يطابق التنقل إلى "/" عبر directoryIndex ويقدّمها
   من الذاكرة — فلو سُجَّل بعده لصار التطبيق كله تخزين أولًا لا شبكة أولًا. */
const pages = new NetworkFirst({
  cacheName: "dhikri-pages",
  networkTimeoutSeconds: 4,
});

registerRoute(
  ({ request, url }) =>
    request.mode === "navigate" &&
    url.origin === self.location.origin &&
    !AUTH_DENY.some((re) => re.test(url.pathname)),
  async (options) => {
    try {
      return await pages.handle(options);
    } catch {
      /* بلا شبكة وبلا نسخة محفوظة لهذه الصفحة: لبّ التطبيق المخزَّن مسبقًا */
      return (await matchPrecache("index.html")) ?? Response.error();
    }
  }
);

/* لبّ التطبيق والملفات بأسماء hashed: تخزين أولًا بمعرّف إصدار (precache) —
   بعد مسار الصفحات و مع directoryIndex: null حتى لا يستبق أي تنقل إلى "/"
   (استقلالية ثانية عن قاعدة الترتيب أعلاه)، وتظل matchPrecache("index.html")
   تعمل لأنني أطلبه بالمفتاح المباشر لا عبر تنويعات المسار.
   null غير مصرّح به في .d.ts مع أن المنفّذة تتعامل معه (الشرط الفضي يعطّله). */
precacheAndRoute(self.__WB_MANIFEST, { directoryIndex: null as unknown as string });

/* احتياط صريح: أي ملف داخل assets/ لم يدخل الـprecache — تخزين أولًا */
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.includes("/assets/"),
  new CacheFirst({ cacheName: "dhikri-assets" })
);

/* التلاوات الصوتية (الن الخارجي الوحيد المصرّح به): تخزين أولًا في
   dhikri-audio. الفقد يُملأ بأول تشغيل أو بتنزيل الإعدادات، والريجوع
   للشبكة يجلب الملف كاملًا بلا ترويسة Range (استجابة 206 مرفوضة في
   API التخزين) والحصن المسلم يسمح CORS فتُقرأ الحالة فعليًا ولا يُخزَّن
   خطأ 404. أي نطاق خارجي آخر لا يزال بلا مسار فلا يُخزَّن. */
registerRoute(
  ({ url }) => isAudioRequest(url),
  async ({ url }) => {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const hit = await cache.match(url.href);
    if (hit) return hit;
    try {
      const res = await fetch(url.href);
      if (res.ok) await cache.put(url.href, res.clone());
      return res;
    } catch {
      return Response.error();
    }
  }
);

/* مكتبة Supabase من jsDelivr — النطاق الخارجي الثاني المصرّح به (وخدمات
   «ملاحظاتي» الاختيارية وحدها): تخزين أولًا. الرابط مثبَّت بإصدار
   (2.118.0) فلا يتغيّر الملف المخزَّن، ويخبأ بأول تحميل ناجح فتعمل
   الميزة دون اتصال بعد أول زيارة — وإن فشل أول تحميل فلا شيء في الموقع
   ينتظر هذه المكتبة (الواجهة تعرض حالة صادقة). */
registerRoute(
  ({ url }) => url.hostname === "cdn.jsdelivr.net",
  new CacheFirst({ cacheName: "dhikri-cdn" })
);
