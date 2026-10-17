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
 *  • كل المسارات محصورة في نطاق الموقع نفسه: روابط OAuth والنطاقات الخارجية
 *    لا تُخزَّن ولا تُعالَج من هذا العامل إطلاقًا (لا يوجد مسار مطابق لها).
 *  • مسارات تسجيل الدخول على الخادم (لو أُضيفت مستقبلًا: /auth/ و/login/
 *    و/oauth/ وcallback/) مستثناة من رجوع اللبّ عبر لوحة denylist — والموقع
 *    الحالي لا يحوي تسجيل دخول أصلًا (كل شيء محفوظ محليًا في المتصفح).
 *
 * التسجيل ليس هنا: main.tsx يسجّل فقط في الإنتاج، وخارج localhost (لا تطوير
 * ولا معاينة)، وخارج الإطارات (window.self === window.top).
 */
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

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
  event.waitUntil(sw.clients.claim());
});

/* لبّ التطبيق والملفات بأسماء hashed: تخزين أولًا بمعرّف إصدار (precache) */
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/* مسارات الخادم المستثناة من رجوع اللبّ (دفاعًا عن محتمل مستقبلي — الموقع بلا دخول) */
const AUTH_DENY = [/^\/auth/, /^\/login/, /^\/oauth/, /^\/callback/];

/* الصفحات: شبكة أولًا بمهلة أربع ثوانٍ، ثم النسخة المحفوظة، ثم لبّ التطبيق */
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

/* احتياط صريح: أي ملف داخل assets/ لم يدخل الـprecache — تخزين أولًا */
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.includes("/assets/"),
  new CacheFirst({ cacheName: "dhikri-assets" })
);
