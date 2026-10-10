import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ذِكري — موقع ثابت بالكامل (بدون خادم).
// نستخدم base "./" ليعمل الموقع من أي مسار ثابت ومن ملف محلي أيضًا.
export default defineConfig({
  base: "./",
  plugins: [react()],
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
