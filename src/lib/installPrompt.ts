/**
 * تنبيه التثبيت — منطق الكشف والتخزين بحت (بلا واجهة).
 *
 * الأمانة أولًا: التنبيه لا يظهر إلا إذا كان التثبيت ممكنًا فعلًا:
 *  - كروم/أندرويد وما شابه: حدث `beforeinstallprompt` حقيقي (شرطه:
 *    HTTPS + manifest صالح + أيقونات + عامل خدمة — كلها متحقَّق منها في
 *    هذا الموقع)، فلا نعرض وعودًا في متصفح لا يدعم التثبيت.
 *  - آيفون (Safari فقط): لا حدث تثبيت في iOS — يُعرض شرح خطوات
 *    «إضافة إلى الشاشة الرئيسية»، ويختفي تلقائيًا إن فُتح الموقع مثبَّتًا.
 *  - من ثبّته أصلًا (display-mode: standalone أو navigator.standalone):
 *    لا يظهر التنبيه إطلاقًا.
 *
 * اختيار المستخدم يُحفظ في `dhikri:install-prompt:v1` (محليًا فقط):
 *  - "later": أعد الظهور بعد سبعة أيام؛
 *  - "no": لا يُعاود أصلًا؛
 *  - "done": ثُبِّت فعليًا — لا داعي للتنبيه بعد today.
 */

import { readJSON, writeJSON } from "./storage";

/** واجهة الحدث الأصلية — غير معرَّفة في مكتبة TypeScript القياسية */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void> | undefined;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> | undefined;
}

/** كم يومًا قبل إعادة التنبيه بعد «لاحقًا» */
export const LATER_DAYS = 7;

/** تأخير الإظهار بعد التحميل — حتى لا يقتحم التنبيه لحظة الوصول */
export const SHOW_DELAY_MS = 4000;

interface StoredChoice {
  choice: "later" | "no" | "done";
  at: number;
}

export function readInstallChoice(): StoredChoice | null {
  const v = readJSON<StoredChoice | null>("install-prompt:v1", null);
  if (!v || typeof v !== "object" || typeof v.at !== "number") return null;
  if (v.choice !== "later" && v.choice !== "no" && v.choice !== "done") return null;
  return v;
}

export function writeInstallChoice(choice: StoredChoice["choice"]): void {
  writeJSON("install-prompt:v1", { choice, at: Date.now() });
}

/** هل الاختيار المحفوظ يسمح بالظهور الآن؟ */
export function mayShow(): boolean {
  const stored = readInstallChoice();
  if (!stored) return true;
  if (stored.choice === "later") return Date.now() - stored.at >= LATER_DAYS * 86400000;
  return false; // "no" أو "done"
}

/** هل يُفتح الموقع كتطبيق مثبَّت أصلًا؟ */
export function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    /* matchMedia غير متاح — نكمل بالفحص الآخر */
  }
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * آيفون (أو آيباد بواجهة لمس) داخل Safari نفسه وليس مثبَّتًا.
 * متصفحات iOS الأخرى (CriOS/FxiOS/EdgiOS/OPiOS) مستثناة: تعليمات
 * المشاركة تخص Safari تحديدًا ولا نعرض ما لا ينطبق.
 */
export function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && safari && !isStandalone();
}
