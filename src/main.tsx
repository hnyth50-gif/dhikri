import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* تسجيل عامل الخدمة (vite-plugin-pwa/Workbox) للعمل دون اتصال — بشروط ثلاثة:
   1. الإنتاج فقط: لا تسجيل في بيئة التطوير (import.meta.env.PROD).
   2. خارج localhost: فلا يُسجَّل داخل خادم المعاينة (vite preview) أصلًا.
   3. خارج الإطارات (window.self === window.top): لا تسجيل مُضمر في صفحة
      مُضمّنة داخل iframe.
   المسار نسبي إلى الصفحة (./sw.js) لا إلى مجلد الأصول، وفشل التسجيل صامت
   لأن الموقع يعمل كاملًا دون عامل خدمة. */
const isTopFrame = window.self === window.top;
const isLocalhost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
if ("serviceWorker" in navigator && import.meta.env.PROD && isTopFrame && !isLocalhost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch(() => {
        /* لا نعرض رسالة خطأ: الموقع يعمل بدون عامل خدمة */
      });
  });
}
