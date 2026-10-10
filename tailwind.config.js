/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // أخضر المريمية — اللون الأساسي
        sage: {
          50: "#f2f7f3",
          100: "#e0ece3",
          200: "#c2d9c9",
          300: "#98bda5",
          400: "#6b9a7d",
          500: "#4a7f60",
          600: "#38654c",
          700: "#2e513e",
          800: "#274233",
          900: "#21372c",
          950: "#10201a",
        },
        // الأخضر الزيتوني — أزرار وعناصر تفاعلية
        olive: {
          50: "#f6f7ee",
          100: "#e9ecd5",
          200: "#d4daae",
          300: "#b8c17f",
          400: "#9da85a",
          500: "#818d42",
          600: "#647033",
          700: "#4c572a",
          800: "#3e4726",
          900: "#373e23",
          950: "#1b200f",
        },
        // الكريمي العاجي — خلفية الوضع الفاتح
        ivory: {
          50: "#fdfbf5",
          100: "#faf5e9",
          200: "#f4ead4",
          300: "#ecdbb8",
          400: "#e0c48f",
          500: "#d4ae6c",
        },
        // الذهبي الهادئ — تفاصيل وزخارف محدودة
        gold: {
          300: "#d9c184",
          400: "#c9a95e",
          500: "#b8933f",
          600: "#9a7732",
        },
      },
      fontFamily: {
        // ترتيب احتياطي: خط الواجهة ثم خط النص ثم الخط الافتراضي للنظام
        ui: ["DhikriUi", "Cairo", "system-ui", "sans-serif"],
        text: ["DhikriText", "Noto Naskh Arabic", "Amiri", "serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,32,26,.04), 0 8px 24px -12px rgba(16,32,26,.18)",
        lift: "0 2px 4px rgba(16,32,26,.05), 0 18px 40px -20px rgba(16,32,26,.3)",
      },
    },
  },
  plugins: [],
};
