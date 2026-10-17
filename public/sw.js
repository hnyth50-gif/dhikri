/*
 * ذِكري — عامل الخدمة (Service Worker)
 * -----------------------------------
 * الهدف: عمل الموقع دون اتصال بالإنترنت بعد أول زيارة ناجحة.
 *
 * الاستراتيجية:
 *  - التثبيت: نضع كل ملفات الإصدار الحالي في ذاكرة التخزين المؤقت (Cache Storage).
 *  - التنقّل: شبكة أولًا مع رجوع للنسخة المخزّنة (network-first) حتى لا نعرض نسخة قديمة.
 *  - بقية الطلبات: نسخة أولاً مع تحديث في الخلفية (stale-while-revalidate).
 *
 * مهم: بيانات تقدّم المستخدم تُحفظ في localStorage داخل المتصفح، وليست جزءًا من هذا الملف.
 */

const VERSION = "dhikri-v1";
const ASSETS_CACHE = `${VERSION}-assets`;
const PAGE_CACHE = `${VERSION}-pages`;

// نضيف تلقائيًا كل ملفات البناء عند التثبيت، بعد تجهيز قائمة الملفات من build.
self.__PRECACHE__ = self.__PRECACHE__ || ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSETS_CACHE)
      .then((cache) => cache.addAll(self.__PRECACHE__).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  // يسمح للواجهة بإبلاغنا بقائمة ملفات البناء الحقيقية بعد التحميل.
  if (event.data && event.data.type === "PRECACHE_ASSETS" && Array.isArray(event.data.urls)) {
    // نضيف وثيقة الصفحة نفسها إلى القائمة: اسمها لا يتغيّر بين الإصدارات،
    // فلو بقيت نسخة قديمة منها في الذاكرة لأُشغِّل الموقع القديم دون اتصال
    // بعد النشر (ومن صفحاته الجديدة تبدو «غير موجودة»). الرسالة تأتي من
    // صفحة حديثة التحميل من الشبكة، فالتقاط الوثيقة هنا يحدّثها فعليًا.
    const urls = [...event.data.urls, "./", "./index.html"];
    event.waitUntil(
      caches.open(ASSETS_CACHE).then((cache) =>
        // نضيف كل ملف على حدة حتى لا يفشل البناء كاملًا لو تعذّر ملف واحد.
        Promise.allSettled(urls.map((url) => cache.add(url).catch(() => undefined)))
      )
    );
  }
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

/* عند إعادة التحميل قد يختلف رأس `Accept`/`Accept-Encoding` عن النسخة المخزّنة،
   فترفض Cache API المطابقة بسبب `Vary`. نتجاهل `Vary` لأن محتوى الملفات
   ثابت (اسم الملف يحمل معرّف إصداره). */
function matchCache(request, options) {
  return caches.match(request, { ignoreVary: true, ...(options || {}) });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // نتجاهل كل طلبات النطاقات الخارجية (مثل روابط المصادر الخارجية).
  if (url.origin !== self.location.origin) return;

  if (isNavigation(request)) {
    // تنقّل: شبكة أولًا حتى يحصل المستخدم على أحدث نسخة، ثم نخزّنها.
    // إن تعذّر الاتصال أو أعاد الخادم خطأ (502/503...) نعرض النسخة المخزّنة.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || !response.ok) {
            throw new Error(`bad-response-${response ? response.status : 0}`);
          }
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(async () => {
          const cached = await matchCache(request, { ignoreSearch: true });
          return (
            cached ||
            (await matchCache("./index.html")) ||
            (await matchCache("./")) ||
            Response.error()
          );
        })
    );
    return;
  }

  // أصول البناء (خطوط، صور، ملفات JS/CSS) ثابتة بمعرّف إصدارها — نسخة أولاً.
  event.respondWith(
    matchCache(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(ASSETS_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            return response;
          }
          // الخادم أعاد خطأ (502 مثلًا): نفضّل النسخة المخزّنة إن وُجدت.
          return cached || response || Response.error();
        })
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
