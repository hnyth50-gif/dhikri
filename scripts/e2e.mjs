/**
 * اختبار تشغيل شامل للمُخرجات — `npm run test:e2e`
 *
 * لا يكتفي بالقول «البناء نجح»، بل يفحص ما سيصله المستخدم فعلًا:
 *   1. يشغّل خادم المعاينة الحقيقي (`vite preview`) ويطلب الصفحات.
 *   2. يقرأ ملفات `dist/` كما هي بعد البناء ويتحقق من محتواها.
 *   3. يفحص التوجيه والترجمة واتجاه RTL والثيمات والوصولية في CSS.
 *   4. يفحص المانيفست وعامل الخدمة (العمل دون اتصال).
 *   5. يفحص أن الحزمة تحوي نصوص الأذكار الفعلية — لا نصًا وهميًا.
 *   6. يفحص عدم وجود أسرار أو روابط غير آمنة أو `eval`.
 *   7. يفرض حدًّا لحجم الحمولة الأولى (أداء).
 *
 * الاستخدام:
 *   node scripts/e2e.mjs            # فحص كامل
 *   node scripts/e2e.mjs --no-server  # تخطّي تشغيل الخادم (فحص ملفات فقط)
 *
 * الخروج برمز 1 عند أي مخالفة.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIST = join(ROOT, "dist");
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const SKIP_SERVER = process.argv.includes("--no-server");

const passes = [];
const fails = [];
const warns = [];
const pass = (m) => passes.push(m);
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const assert = (cond, okMsg, failMsg) => (cond ? pass(okMsg) : fail(failMsg ?? okMsg));

/* ---------------------------------------------------------------- */
/* 0. تجهيز                                                          */
/* ---------------------------------------------------------------- */

if (!existsSync(join(DIST, "index.html"))) {
  console.error("✗ لا يوجد `dist/` — شغّل `npm run build` أولًا.");
  process.exit(1);
}

const read = (p) => readFileSync(p, "utf8");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
const files = walk(DIST);
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/* ---------------------------------------------------------------- */
/* 1. ملفات البناء                                                   */
/* ---------------------------------------------------------------- */

const html = read(join(DIST, "index.html"));
const cssFile = files.find((f) => f.endsWith(".css"));
const jsFiles = files.filter((f) => f.endsWith(".js") && !f.endsWith("sw.js"));
const css = cssFile ? read(cssFile) : "";
const js = jsFiles.map(read).join("\n");

assert(html.includes('lang="ar"'), "index.html: lang=ar");
assert(html.includes('dir="rtl"'), "index.html: dir=rtl");
assert(html.includes("ذِكري"), "index.html: عنوان «ذِكري» موجود");
assert(html.includes('rel="manifest"'), "index.html: مرتبط بـ manifest");
assert((html.match(/rel="manifest"/g) || []).length === 1, "index.html: رابط manifest واحد فقط (لا تكرار)");
assert(html.includes('rel="apple-touch-icon"'), "index.html: أيقونة آيفون (apple-touch-icon 180)");
assert(html.includes('name="description"'), "index.html: وصف meta موجود");
assert(html.includes('name="color-scheme"'), "index.html: يعلن دعم الوضعين light/dark");
assert(html.includes("prefers-color-scheme"), "index.html: theme-color مزدوج حسب تفضيل النظام");
assert(html.includes("<noscript>"), "index.html: بديل لمن يعطل JavaScript");
assert(/data-theme/.test(html), "index.html: تطبيق الثيم قبل أول رسم (منع الوميض)");
assert(!/src="http:|href="http:/.test(html), "index.html: لا روابط غير آمنة http://");
assert(/src="\.\/|href="\.\//.test(html), "index.html: المسارات نسبية (تعمل من أي مجلد فرعي)");

/* الحمولة الأولى */
const initial = [
  join(DIST, "index.html"),
  ...jsFiles,
  ...(cssFile ? [cssFile] : []),
];
const initialGz = initial.reduce((n, f) => n + gz(readFileSync(f)), 0);
/**
 * الميزانية 130 KB مضغوطة (كانت 100 KB قبل إضافة الصفحات العشر في
 * 2026-10-17: المحتوى العربي النصي يضغط بنسبة أضعف من الإنجليزية،
 * فزيادة الصفحات المحتوى نفسها هي السبب لا كثوند أو مكتبة خارجية).
 * كل مكتبات الواجهة الوحيدة: React + react-router — لا شيء جديد.
 */
const BUDGET_GZ = 130 * 1024;
assert(initialGz <= BUDGET_GZ, `الحمولة الأولى ${kb(initialGz)} ≤ 130 KB (مضغوطة)`);
if (initialGz > BUDGET_GZ) fail(`الحمولة الأولى ${kb(initialGz)} تتجاوز 130 KB`);

/* ---------------------------------------------------------------- */
/* 2. المانيفست                                                      */
/* ---------------------------------------------------------------- */

let manifest;
try {
  manifest = JSON.parse(read(join(DIST, "manifest.webmanifest")));
  pass("manifest.webmanifest: JSON صالح");
} catch (e) {
  fail(`manifest.webmanifest: JSON غير صالح — ${e.message}`);
}
if (manifest) {
  assert(manifest.name?.includes("ذِكري"), "المانيفست: الاسم عربي «ذِكري»");
  assert(manifest.short_name === "ذِكري", "المانيفست: الاسم المختصر «ذِكري»");
  assert(manifest.lang === "ar" && manifest.dir === "rtl", "المانيفست: lang=ar و dir=rtl");
  assert(manifest.display === "standalone", "المانيفست: display=standalone (تطبيق مستقل)");
  assert(!!manifest.theme_color && !!manifest.background_color, "المانيفست: لونا السمة والخلفية");
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "المانيفست: أيقونتان على الأقل");
  assert(manifest.start_url && manifest.scope, "المانيفست: start_url و scope محدّدان");
  for (const icon of manifest.icons ?? []) {
    const p = join(DIST, icon.src.replace("./", ""));
    assert(existsSync(p), `المانيفست: الأيقونة موجودة فعليًا (${icon.src})`);
  }
  /* أحجام PNG المطلوبة للتثبيت: 192 و512 وmaskable — تُقرأ من رأس ملف IHDR */
  const pngDims = (p) => {
    const b = readFileSync(p);
    if (b.slice(1, 4).toString() !== "PNG") return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  };
  const sizes = (manifest.icons ?? []).map((i) => i.sizes);
  assert(sizes.includes("192x192") && sizes.includes("512x512"), "المانيفست: أيقونتا 192 و512 (شرط قابلية التثبيت)");
  assert(
    (manifest.icons ?? []).some((i) => i.purpose === "maskable" && i.sizes === "512x512"),
    "المانيفست: أيقونة maskable للأندرويد بحجم 512"
  );
  const d192 = pngDims(join(DIST, "icons/icon-192.png"));
  const d512 = pngDims(join(DIST, "icons/icon-512.png"));
  const dMask = pngDims(join(DIST, "icons/icon-maskable-512.png"));
  const dApple = pngDims(join(DIST, "icons/apple-touch-icon-180.png"));
  assert(d192?.w === 192 && d192?.h === 192, "أيقونة PNG: icon-192.png مبعوضة 192×192 فعلًا");
  assert(d512?.w === 512 && d512?.h === 512, "أيقونة PNG: icon-512.png مبعوضة 512×512 فعلًا");
  assert(dMask?.w === 512 && dMask?.h === 512, "أيقونة PNG: icon-maskable-512.png مبعوضة 512×512 فعلًا");
  assert(dApple?.w === 180 && dApple?.h === 180, "أيقونة PNG: apple-touch-icon-180.png مبعوضة 180×180 فعلًا");
}

/* ---------------------------------------------------------------- */
/* 3. عامل الخدمة                                                    */
/* ---------------------------------------------------------------- */

const swPath = join(DIST, "sw.js");
assert(existsSync(swPath), "sw.js: موجود في البناء (يولّده vite-plugin-pwa)");
if (existsSync(swPath)) {
  const sw = read(swPath);
  /* معالجات العامل الثلاثة — وجود معالج الطلبات شرط لقابلية التثبيت */
  assert(sw.includes('addEventListener("install"'), "sw.js: معالج تثبيت");
  assert(sw.includes('addEventListener("activate"'), "sw.js: معالج تفعيل");
  assert(sw.includes('addEventListener("fetch"'), "sw.js: معالج طلبات (شرط التثبيت في الكروم)");
  assert(sw.includes("skipWaiting"), "sw.js: التحديثات تتفعّل فورًا دون انتظار (skipWaiting)");
  /* الاستراتيجيتان المطلوبتان صراحةً */
  assert(sw.includes("dhikri-pages"), "sw.js: الشبكة أولًا للصفحات (cache dhikri-pages)");
  assert(sw.includes("networkTimeoutSeconds"), "sw.js: مهلة شبكة قصيرة ثم الرجوع إلى النسخة المحفوظة");
  assert(sw.includes("dhikri-assets"), "sw.js: التخزين أولًا لأ hashed (cache dhikri-assets)");
  assert(sw.includes("assets/"), "sw.js: ملفات البناء بأسماء hashed في التخزين المسبق");
  /* اكتمال العمل دون اتصال */
  assert(sw.includes("index.html"), "sw.js: لبّ التطبيق (index.html) مخزّن — كل المسارات تعمل دون اتصال");
  assert(sw.includes(".woff2"), "sw.js: الخطوط العربية مخزّنة مسبقًا (عرضها دون اتصال)");
  assert(sw.includes("revision"), "sw.js: كل ملف بمعرّف إصدار (precache revisioned)");
  assert(sw.includes("ignoreSearch"), "sw.js: مطابقة الصفحات تتجاهل المعلّمات (?q=)");
  /* استثناءات: نطاق الموقع وحده المسرَّح (والتلاوة بمسار صريح) + الدخول/OAuth */
  assert(sw.includes("self.location.origin"), "sw.js: مسارات الموقع محصورة في نطاقه (والخارج الوحيد: مسار التلاوة)");
  assert(/auth|oauth|login/.test(sw), "sw.js: مسارات الدخول/OAuth مستثناة من رجوع اللبّ (denylist)");
  assert(sw.includes("dhikri-v1"), "sw.js: ينظّف مخازن النسخة اليدوية القديمة (dhikri-v1-*)");
  /* اكتمال التوفر دون اتصال: manifest وrobots ضمن التخزين المسبق */
  assert(sw.includes("manifest.webmanifest"), "sw.js: manifest التثبيت مخزّن مسبقًا");
  assert(sw.includes("robots.txt"), "sw.js: robots.txt مخزّن مسبقًا");
  /* التلاوات: مسار تخزين أولًا مشترك بين العامل وصفحة الإعدادات */
  assert(sw.includes("dhikri-audio"), "sw.js: كاش التلاوات dhikri-audio");
  assert(sw.includes("hisnmuslim.com"), "sw.js: مسار صريح لتلاوات حصن المسلم (تخزين أولًا)");
  assert(sw.includes("cdn.jsdelivr.net"), "sw.js: مسار صريح لـjsDelivr (مكتبة Supabase — تخزين أولًا)");
  assert(sw.includes("dhikri-cdn"), "sw.js: كاش منفصل dhikri-cdn للـCDN");
  /* حارس التراجع: بروتوكول SW اليدوي القديم اختفى بالكامل */
  assert(!sw.includes("PRECACHE_ASSETS"), "sw.js: بلا بروتوكول القديم PRECACHE_ASSETS");
  assert(!/eval\(/.test(sw), "sw.js: بلا eval");
  /* شروط التسجيل الثلاثة في المصدر: تطوير + معاينة + إطارات */
  const mainSrc = read(join(ROOT, "src/main.tsx"));
  const viteCfg = read(join(ROOT, "vite.config.ts"));
  assert(mainSrc.includes("import.meta.env.PROD"), "main.tsx: لا تسجيل في بيئة التطوير (PROD فقط)");
  assert(mainSrc.includes("window.self === window.top"), "main.tsx: لا تسجيل داخل إطار (iframe)");
  assert(mainSrc.includes('"localhost"') && mainSrc.includes('"127.0.0.1"'), "main.tsx: لا تسجيل على localhost (تطوير/معاينة)");
  assert(viteCfg.includes("injectManifest"), "vite.config.ts: استراتيجية injectManifest (Workbox)");
  assert(viteCfg.includes("enabled: false"), "vite.config.ts: devOptions معطّل — لا SW في التطوير أصلًا");
  /* الخلل الذي كشفه الاختبار الحيّ: مسار اللبّ يطابق "/" عبر directoryIndex،
     فلو سُجّل بعد مسار الصفحات استبقها وصار التطبيق تخزين أولًا لا شبكة أولًا */
  const swSrc = read(join(ROOT, "src/sw.ts"));
  assert(
    swSrc.indexOf("registerRoute(") < swSrc.indexOf("precacheAndRoute("),
    "src/sw.ts: مسار الصفحات يُسجَّل قبل مسار الـprecache (شبكة أولًا تسبق اللبّ)"
  );
  assert(swSrc.includes("directoryIndex: null"), "src/sw.ts: تعطيل directoryIndex حتى لا يستبق اللبّ التنقل إلى /");
  assert(js.includes("localhost"), "الحزمة: حارس hostname موجود في التنفيذ المبني");
  assert(js.includes("تنزيل التلاوات"), "الحزمة: زر تنزيل التلاوات في الإعدادات");
  assert(js.includes("dhikri-audio"), "الحزمة: الصفحة تشترك في كاش التلاوات نفسه");
  /* تنبيه التثبيت: الحدث الحقيقي + حارس الاستقلال + التخزين + النصوص */
  assert(js.includes("beforeinstallprompt"), "الحزمة: مستمع beforeinstallprompt موجود");
  assert(js.includes("display-mode"), "الحزمة: حارس وضع التطبيق المستقل موجود");
  assert(js.includes("install-prompt:v1"), "الحزمة: مفتاح تخزين اختيار التثبيت موجود");
  assert(js.includes("هل تريد تثبيت ذِكري"), "الحزمة: نص تنبيه التثبيت موجود");
  assert(js.includes("إضافة إلى الشاشة الرئيسية"), "الحزمة: تعليمات iOS للتثبيت موجودة");
  /* التسجيل اليدوي كما هو: مسار نسبي إلى الصفحة */
  assert(js.includes("serviceWorker"), "الحزمة: تسجيل عامل الخدمة");
  assert(
    /serviceWorker\.register\(\s*"\.\/sw\.js"/.test(js),
    "الحزمة: يسجّل عامل الخدمة بمسار نسبي إلى الصفحة (./sw.js)",
    "الحزمة: مسار تسجيل عامل الخدمة غير صالح — كان يُسجّل من assets/ ويفشل بصمت"
  );
  assert(!/new URL\("sw\.js"/.test(js), "الحزمة: لا يبني مسار عامل الخدمة من import.meta.url");
  /* لا تسجيل محقون تلقائيًا في HTML — التسجيل في main.tsx المشروط فقط */
  assert(!html.includes("serviceWorker"), "index.html: لا تسجيل تلقائي محقون في الصفحة");
}

/* ---------------------------------------------------------------- */
/* 4. المحتوى                                                        */
/* ---------------------------------------------------------------- */

const mustHave = [
  ["أذكار الصباح", "عنوان قسم الصباح"],
  ["أذكار المساء", "عنوان قسم المساء"],
  ["المفضلة", "ميزة المفضلة"],
  ["الإعدادات", "صفحة الإعدادات"],
  ["المصادر", "صفحة المصادر والمراجعة"],
  ["حجم الخط", "التحكم بحجم الخط"],
  ["مشاركة", "زر المشاركة"],
  ["استمع", "زر الاستماع"],
  ["العدد الحالي", "قراءة العدّاد"],
  ["اكتمل التكرار", "مؤشر اكتمال التكرار"],
  ["أتصفّر العدّاد", "تأكيد تصفير العدّاد"],
  ['role="progressbar"', "شريط تقدّم بـ ARIA"],
  ["prefers-color-scheme", "استجابة لتفضيل نظام التشغيل"],
  /* الصفحات المضافة في 2026-10-17 */
  ["المزيد من صفحات ذِكري", "حوار «المزيد» في التنقل السفلي"],
  ["وردي اليوم", "صفحة وردي اليوم"],
  ["المسبحة الإلكترونية", "صفحة المسبحة المستقلة"],
  ["فهرس الأذكار", "صفحة فهرس الأذكار"],
  ["من نحن", "صفحة من نحن"],
  ["الأسئلة الشائعة", "صفحة الأسئلة الشائعة"],
  ["دليل الاستخدام", "صفحة دليل الاستخدام"],
  ["سياسة الخصوصية", "صفحة سياسة الخصوصية"],
  ["تواصل معنا", "صفحة تواصل معنا"],
  ["سجل التحديثات", "صفحة سجل التحديثات"],
  ["hnyth50-gif/dhikri", "آلية الإرسال الفعلية: روابط المستودع وصفحة البلاغات على GitHub"],
  ["انسخ الرسالة", "بديل النسخ في تواصل معنا"],
  ["عُد إلى موضعه", "زر العودة إلى موضع الذكر في المفضلة"],
  /* ميزة الوقت والتقويم (2026-10-17) */
  ["الوقت والتقويم", "صفحة الوقت والتقويم ورابطها في القائمة"],
  ["التاريخ الهجري", "عنوان التاريخ الهجري وتنبيه الحساب"],
  ["التوقيت العالمي", "بطاقة UTC المستقلة"],
  ["ابحث عن مدينة أو دولة", "قائمة المدن القابلة للبحث"],
  ["Africa/Tripoli", "معرّف منطقة زمنية قياسي IANA في بيانات المدن"],
  ["24 ساعة", "نظام 24 ساعة"],
  ["12 ساعة", "نظام 12 ساعة"],
  ["timeFormat", "حقل نظام الساعة داخل الإعدادات المحفوظة"],
  ["homeCity", "حقل المدينة داخل الإعدادات المحفوظة"],
  /* زر الرجوع بين الصفحات (2026-10-17) */
  ["الرجوع إلى الصفحة السابقة", "زر الرجوع: تسمية الوصولية في كل الصفحات"],
  ["كيف أرجع إلى الصفحة السابقة؟", "سؤال شائع يشرح زر الرجوع وحدوده"],
];
for (const [needle, label] of mustHave)
  assert(
    needle === 'role="progressbar"' ? js.includes("progressbar") : js.includes(needle),
    `الحزمة: ${label} («${needle}») موجود`
  );

/* --- النصوص: تُقرأ من ملف البيانات نفسه، فلو حُرِّف أو قُصّ فشل الاختبار --- */
try {
  const { buildSync } = await import("esbuild");
  const { pathToFileURL } = await import("node:url");
  const { mkdtempSync: mkTmp } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const outFile = join(mkTmp(join(tmpdir(), "dhikri-e2e-")), "data.mjs");
  buildSync({
    entryPoints: [join(ROOT, "src/data/adhkar.ts")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile: outFile,
    logLevel: "silent",
  });
  const data = await import(pathToFileURL(outFile).href);

  let checked = 0;
  let broken = 0;
  for (const d of data.DHKAR) {
    const samples = [
      ["النص الأساسي", d.text],
      ["صيغة المساء", d.eveningText],
      ["العنوان", d.title],
      ["الفضيلة", d.virtue],
      ["صياغة العدد", d.countLabel],
      ["صياغة عدد المساء", d.eveningCountLabel],
    ].filter(([, v]) => typeof v === "string" && v.trim().length > 0);
    for (const [what, value] of samples) {
      checked++;
      if (!js.includes(value)) {
        broken++;
        fail(`الحزمة: ${what} لذكر «${d.id}» غير مطابق حرفيًا لملف البيانات`);
      }
    }
  }
  if (broken === 0)
    pass(`كل نصوص الأذكار وعناوينها وأعدادها موجودة حرفيًا في الحزمة (${checked} نصًا من ${data.DHKAR.length} ذكرًا)`);
} catch (e) {
  fail(`تعذّر التحقق من نصوص الأذكار في الحزمة — ${e.message}`);
}

/* ---------------------------------------------------------------- */
/* 5. الأمان والنظافة                                                */
/* ---------------------------------------------------------------- */

const secretPatterns = [
  [/\bapi[_-]?key\b/i, "api key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "مفتاح خاص"],
  [/\bBearer\s+[A-Za-z0-9._-]{20,}/, "توكن Bearer"],
  [/["']password["']\s*:\s*["'][^"']{4,}/, "كلمة مرور مخزّنة"],
  [/ghp_[A-Za-z0-9]{20,}/, "GitHub token"],
  [/AIza[0-9A-Za-z_-]{30,}/, "Google API key"],
];
for (const [re, label] of secretPatterns)
  assert(!re.test(js) && !re.test(html) && !re.test(css), `لا يوجد ${label} في الكود المنشور`);

assert(!/\beval\s*\(/.test(js), "الحزمة: بلا eval()");
assert(!/new\s+Function\s*\(/.test(js), "الحزمة: بلا new Function()");

/* الروابط الخارجية في الحزمة: نسمح فقط بنطاقات معلنة ومعلومة */
const external = [...new Set((js.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []))];
// w3.org = مساحات الأسماء في وسوم SVG (لا يُطلب من الشبكة أبدًا)
// reactjs.org = رابط مشروح أخطاء React داخل رسائل التصحيح
const allowed = [
  /sunnah\.com$/,
  /hisnmuslim\.com$/,
  /api\.alquran\.cloud$/,
  /w3\.org$/,
  /reactjs\.org$/,
  /react\.dev$/,
  // github.com = روابط المستودع وصفحة البلاغات في «تواصل معنا» و«سجل التحديثات»
  /github\.com$/,
  // hnyth50-gif.github.io = رابط الموقع نفسه (يُذكر في نص الرسالة المُركَّبة)
  /hnyth50-gif\.github\.io$/,
  // *.supabase.co = مشروع «ملاحظاتي» الاختياري وحده (مُعلن في الخصوصية والأسئلة)
  /\.supabase\.co$/,
];
const unexpected = external.filter((u) => !allowed.some((re) => re.test(u.replace(/^https?:\/\//, ""))));
assert(
  unexpected.length === 0,
  `الروابط الخارجية محصورة في المصادر المعلنة (${external.length} نطاقًا)`,
  `روابط خارجية غير معلنة: ${unexpected.join(", ")}`
);
const insecure = external.filter(
  (u) => u.startsWith("http://") && !/w3\.org/.test(u)
);
assert(insecure.length === 0, "كل الروابط الخارجية عبر https", `روابط http غير آمنة: ${insecure.join(", ")}`);

/* لا نداء لأي API خارجي — لا قاعدة بيانات ولا خدمة مدفوعة */
for (const banned of ["XMLHttpRequest", "navigator.sendBeacon", "WebSocket("]) {
  assert(!js.includes(banned), `الحزمة: بلا ${banned}`);
}
const externalFetch = (js.match(/fetch\(\s*["'`]https?:\/\/[^"'`]+/g) ?? []).length;
assert(externalFetch === 0, "الحزمة: لا fetch مباشر إلى أي خدمة خارجية");

/* ملاحظاتي + Supabase: وسم CDN، ونصوص الواجهة، واستعلام الجدول، ولا سرّ */
assert(
  html.includes("cdn.jsdelivr.net/npm/@supabase/supabase-js"),
  "index.html: وسم CDN لمكتبة Supabase موجود (كما هو موثّق في README)"
);
assert(js.includes("ملاحظاتي"), "الحزمة: صفحة «ملاحظاتي» موجودة");
assert(js.includes('from("notes")'), "الحزمة: استعلام جدول notes موجود");
assert(js.includes("أرسل رابط الدخول"), "الحزمة: نموذج الرابط السحري موجود");
assert(
  !js.includes("sb_secret") && !html.includes("sb_secret"),
  "لا مفتاح سري Supabase (sb_secret) في الكود المنشور"
);

/* ---------------------------------------------------------------- */
/* 6. CSS — RTL والثيمات والوصولية                                   */
/* ---------------------------------------------------------------- */

assert(css.includes("data-theme"), "CSS: ثيمات data-theme مطبّقة");
assert(/\[data-theme=["']?dark["']?\]/.test(css), "CSS: ألوان الوضع الليلي موجودة");
assert(css.includes("prefers-reduced-motion"), "CSS: يحترم تقليل الحركة");
assert(
  /margin-inline|padding-inline|inset-inline|border-inline|Inline(Start|End)/.test(css + js),
  "CSS/JS: خصائص منطقية (inline) تدعم RTL بدل left/right"
);
assert(
  !/text-align:\s*(left|right)/.test(css),
  "CSS: لا محاذاة حرفية left/right تُفسد اتجاه RTL"
);
assert(css.includes("min-width") || css.includes("max-width"), "CSS: نقاط تكيّف للشاشات المختلفة");
assert(
  css.includes("data-font-scale") && css.includes("--scale-dhikr"),
  "CSS: نظام حجم خط قابل للتحكّم (خمسة مستويات)"
);
assert(css.includes(":focus-visible") || css.includes(":focus"), "CSS: أسلوب تركيز واضح للوحة المفاتيح");
assert(/sr-only/.test(css), "CSS: فئة قراءة للقارئ الشاشي دون إظهارها بصريًا");
assert(/@media print/.test(css), "CSS: تنسيق طباعة منفصل عن الشاشة");

/* ---------------------------------------------------------------- */
/* 7. كل ملفات الأصول تُقرأ كما هي                                  */
/* ---------------------------------------------------------------- */

let missing = 0;
for (const f of files) {
  const rel = f.slice(DIST.length + 1).replaceAll("\\", "/");
  if (rel.endsWith(".html") || rel.endsWith(".txt")) continue;
  try {
    statSync(f);
  } catch {
    missing++;
    fail(`ملف مفقود بعد البناء: ${rel}`);
  }
}
if (missing === 0) pass(`كل ملفات dist (${files.length} ملفًا) قابلة للقراءة`);

/* أسماء الملفات لا تحوي أسرارًا أو أسماء مستخدمين */
const badNames = files.filter((f) => /(password|secret|token|\.env)/i.test(f));
assert(badNames.length === 0, "أسماء الملفات نظيفة", `أسماء مشبوهة: ${badNames.join(", ")}`);

/* ---------------------------------------------------------------- */
/* 8. الخادم الحقيقي                                                 */
/* ---------------------------------------------------------------- */

let child = null;

async function serverUp() {
  try {
    const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await serverUp()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

if (!SKIP_SERVER) {
  if (await serverUp()) {
    pass(`خادم المعاينة يعمل بالفعل على ${BASE} — أُعيد استخدامه`);
  } else {
    const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
    child = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort"], {
      cwd: ROOT,
      stdio: "ignore",
      detached: false,
    });
    if (await waitForServer()) pass(`شُغّل خادم المعاينة الحقيقي على ${BASE}`);
    else fail("خادم المعاينة لم يستجب خلال 20 ثانية");
  }
} else {
  warn("تخطّي تشغيل الخادم (--no-server)");
}

if (await serverUp()) {
  const checks = [
    ["/", "الصفحة الرئيسية"],
    ["/index.html", "index.html المباشر"],
    ["/manifest.webmanifest", "المانيفست عبر الخادم"],
    ["/sw.js", "عامل الخدمة عبر الخادم"],
    ["/robots.txt", "robots.txt"],
  ];
  for (const [path, label] of checks) {
    try {
      const res = await fetch(BASE + path);
      assert(res.ok, `${label}: ${res.status}`);
      if (path === "/") {
        const body = await res.text();
        assert(body.includes('dir="rtl"'), `${label}: يستجيب بـ dir=rtl`);
        assert(/type="module"/.test(body), `${label}: يشغّل وحدة ES`);
      }
    } catch (e) {
      fail(`${label}: تعذّر الاتصال — ${e.message}`);
    }
  }

  /* كل أصول المسارات النسبية */
  const relAssets = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
  for (const a of relAssets) {
    try {
      const res = await fetch(`${BASE}/${a.replace(/^\.\//, "")}`);
      assert(res.ok, `الأصل «${a}» يستجيب ${res.status}`);
    } catch (e) {
      fail(`الأصل «${a}» — ${e.message}`);
    }
  }

  /* عامل الخدمة لا يُحجب */
  try {
    const res = await fetch(`${BASE}/sw.js`, { headers: { "Service-Worker-Script": "1" } });
    assert(res.ok, `sw.js يُقدَّم بحالة ${res.status}`);
    assert(
      (res.headers.get("content-type") ?? "").includes("javascript"),
      "sw.js بنوع محتوى javascript"
    );
  } catch (e) {
    fail(`sw.js — ${e.message}`);
  }
}

/* ---------------------------------------------------------------- */
/* 9. التقرير                                                        */
/* ---------------------------------------------------------------- */

if (child) {
  try {
    child.kill();
  } catch {
    /* تجاهل */
  }
}

const W = 64;
console.log("\n" + "─".repeat(W));
console.log("  اختبار التشغيل الشامل — npm run test:e2e");
console.log("─".repeat(W));
for (const p of passes) console.log("  ✓ " + p);
for (const w of warns) console.log("  ! " + w);
for (const f of fails) console.log("  ✗ " + f);
console.log("─".repeat(W));
console.log(
  fails.length === 0
    ? `  نجح الاختبار: ${passes.length} فحصًا، ${warns.length} تنبيهًا، 0 فشل.`
    : `  فشل الاختبار: ${fails.length} مخالفة، ${passes.length} فحصًا ناجحًا.`
);
console.log("─".repeat(W) + "\n");

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(
  join(ROOT, "docs", "e2e-latest.txt"),
  [
    `date: ${new Date().toISOString()}`,
    `passed: ${passes.length}`,
    `warnings: ${warns.length}`,
    `failed: ${fails.length}`,
    "",
    ...passes.map((p) => "[PASS] " + p),
    ...warns.map((w) => "[WARN] " + w),
    ...fails.map((f) => "[FAIL] " + f),
    "",
  ].join("\n"),
  "utf8"
);

/* لا process.exit(): إخراج قسري على Windows يقفل مآخذ undici (keep-alive)
   وهي في حالة إغلاق فيصطدم بـUV_HANDLE_CLOSING (0xC0000409). تصفية
   الحلقة نفسها تُغلق المآخذ بإيقاعها ثم تُنهي العملية برمز exitCode. */
process.exitCode = fails.length === 0 ? 0 : 1;
