import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ذِكري — موقع ثابت بالكامل (بدون خادم).
// نستخدم base "./" ليعمل الموقع من أي مسار ثابت ومن ملف محلي أيضًا.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    // عامل الخدمة: Workbox (injectManifest) بدل الملف اليدوي القديم.
    // التسجيل يدوي في main.tsx بشروطه (إنتاج + خارج localhost + خارج الإطار)،
    // فلا نحقن تسجيلًا تلقائيًا هنا ولا في التطوير إطلاقًا.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      // ملف manifest.webmanifest من عندنا في public/ — لا توليده ولا استبداله
      manifest: false,
      devOptions: { enabled: false },
      injectManifest: {
        // كل مخرجات البناء تُخبأ مسبقًا: الجافاسكربت والخطوط بأسماء متغيّرة
        // وأيقونات PWA — وmanifest وrobots أيضًا ليبقى كل شيء متاحًا دون اتصال.
        // (تنظيف المخازن القديمة يتم في src/sw.ts عبر cleanupOutdatedCaches())
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,woff,woff2,webmanifest,txt}"],
      },
    }),
  ],
  build: {
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
