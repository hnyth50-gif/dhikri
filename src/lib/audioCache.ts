/**
 * هوية كاش التلاوات الصوتية — المصدر المشترك بين عامل الخدمة (src/sw.ts)
 * وواجهة التنزيل في الإعدادات (src/lib/audioOffline.ts).
 *
 * التلاوات هي المورد الخارجي الوحيد الذي يُخزَّن عند الطلب: 24 ملفًا من
 * موقع حصن المسلم (CORS: *) — تُحفظ إما بأول تشغيل (مسار العامل) أو
 * بتنزيل يدوي من الإعدادات. أي نطاق خارجي آخر لا يزال بلا أي مسار.
 */

/** اسم ذاكرة التخزين المؤقت المشتركة للعامل والصفحة */
export const AUDIO_CACHE_NAME = "dhikri-audio";

/** نطاق حصن المسلم وحده المسموح به خارج الموقع */
const AUDIO_HOST = "www.hisnmuslim.com";

/** هل هذا الطلب تلاوة صوتية من المسار المصرّح به؟ */
export function isAudioRequest(url: URL): boolean {
  return url.hostname === AUDIO_HOST && /^\/audio\/ar\/\d+\.mp3$/.test(url.pathname);
}
