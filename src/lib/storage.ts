/**
 * تغليف آمن فوق localStorage.
 *
 * سبب وجود هذه الطبقة: قد يتعطل localStorage لعدة أسباب حقيقية —
 * وضع تصفح خاص، حظر ملفات تعريف الارتباط، امتلاء الحصة، أو قيمة تالفة.
 * الموقع يجب أن يستمر بالعمل حتى لو فشل التخزين، مع رسالة واضحة بدل سكوت أو انهيار.
 */

const PREFIX = "dhikri:";

export type StorageFailure = { available: boolean; reason: string };

let failure: StorageFailure = { available: true, reason: "" };

/** هل التخزين المحلي متاح فعليًا؟ (اختبار تشغيل حقيقي وليس افتراضًا) */
export function probeStorage(): StorageFailure {
  try {
    const k = `${PREFIX}__probe__`;
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return { available: true, reason: "" };
  } catch (e) {
    return { available: false, reason: describe(e) };
  }
}

function describe(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === "QuotaExceededError" || e.code === 22) return "امتلأت مساحة التخزين في المتصفح";
    if (e.name === "SecurityError") return "منع المتصفح الوصول إلى التخزين المحلي";
  }
  return e instanceof Error ? e.message : "سبب غير معروف";
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    failure = { available: false, reason: describe(e) };
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    failure = { available: true, reason: "" };
    return true;
  } catch (e) {
    failure = { available: false, reason: describe(e) };
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* لا نعلّق واجهة المستخدم على فشل الحذف */
  }
}

/** آخر فشل مُسجّل — تعرضه الواجهة في صفحة الإعدادات وشريط تنبيه لطيف */
export function lastFailure(): StorageFailure {
  return failure;
}
