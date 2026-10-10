import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* تسجيل عامل الخدمة للعمل دون اتصال.
   نستخدم مسارًا نسبيًا إلى الصفحة لا إلى ملف الوحدة: `import.meta.url` يشير
   إلى مجلد `assets/` في الإصدار المبني، فكان التسجيل يفشل بصمت ويعطل
   العمل دون اتصال. المسار النسبي يعمل من أي مجلد ثابت، وفشل التسجيل لا
   يُعرض كخطأ لأن الموقع يعمل كاملًا بدون عامل خدمة. */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((registration) => {
        // نرسل لعامل الخدمة قائمة ملفات البناء الحقيقية ليضعها في الذاكرة
        // المؤقتة عند التثبيت، فلا يحتاج الموقع إلى الشبكة في الزيارة التالية.
        const urls = new Set<string>();
        document.querySelectorAll("script[src], link[rel='stylesheet']").forEach((el) => {
          const src = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
          if (src && src.startsWith(location.origin)) urls.add(src);
        });
        performance.getEntriesByType("resource").forEach((entry) => {
          const name = (entry as PerformanceResourceTiming).name;
          if (!name.startsWith(location.origin)) return;
          try {
            const { pathname } = new URL(name);
            if (/\.(?:js|css|woff2?|svg|png|webp|ico)$/.test(pathname)) urls.add(name);
          } catch {
            /* تجاهل أي عنوان غير صالح */
          }
        });
        const payload = { type: "PRECACHE_ASSETS", urls: [...urls] };
        if (registration.active) {
          registration.active.postMessage(payload);
        } else {
          navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage(payload));
        }
      })
      .catch(() => {
        /* لا نعرض رسالة خطأ: الموقع يعمل بدون عامل خدمة */
      });
  });
}
