/**
 * التلاوات الصوتية دون اتصال — منطق صفحة الإعدادات.
 *
 * تصميم مقصود: لا يُنزَّل شيء صامتًا (24 تلاوة ≈12MB مفاجأة بيانات غير
 * مقبولة في تطبيق خفيف)، بل:
 *  1. كل تلاوة تُحفَظ تلقائيًا في أول تشغيل لها (مسار dhikri-audio في sw.ts)،
 *  2. وزر صريح في الإعدادات ينزّل البقية دفعة واحدة مع تقدّم ظاهر، ويُعيد
 *     المحاولة من حيث توقّف (يتجاوز المحفوظ بالفعل)، ويُمكن مسحه.
 *
 * التنزيل من الصفحة يمرّ عبر عامل الخدمة نفسه (نفس المسار ونفس الذاكرة)،
 * والحصن المسلم يسمح CORS (*) فنقرأ الحجم والحالة فعليًا.
 */

import { DHKAR } from "../data/adhkar";
import { AUDIO_CACHE_NAME } from "./audioCache";

/** روابط التلاوات الـ24 كما وردت في بيانات الأذكار */
export function audioUrls(): string[] {
  return DHKAR.map((d) => d.audio).filter((u): u is string => !!u);
}

/** أي الروابط محفوظة فعلًا على هذا الجهاز الآن؟ */
export async function savedAudio(): Promise<string[]> {
  const urls = audioUrls();
  if (typeof caches === "undefined") return [];
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const hits = await Promise.all(urls.map((u) => cache.match(u)));
    return urls.filter((_, i) => !!hits[i]);
  } catch {
    return [];
  }
}

export interface AudioDownloadProgress {
  /** عدد الروابط المُنهاة (محفوظة سابقًا أو حُمّلت الآن أو فشلت) */
  done: number;
  total: number;
  /** بايتات نُزّلت فعليًا في هذه الجلسة */
  bytes: number;
}

/**
 * ينزّل كل تلاوة غير محفوظة تباعًا (بلا إزعاج للخادم)، ويرفع التقدّم بعد
 * كل ملف. لا يرمي استثناءً على فشل ملف — يعود بالعدّاد ليرى المستخدم الباقي.
 */
export async function downloadAllAudio(
  onProgress?: (p: AudioDownloadProgress) => void
): Promise<{ ok: number; failed: number }> {
  const urls = audioUrls();
  const cache = await caches.open(AUDIO_CACHE_NAME);
  let bytes = 0;
  let ok = 0;
  let failed = 0;
  let done = 0;

  const report = () => onProgress?.({ done, total: urls.length, bytes });

  for (const url of urls) {
    const already = await cache.match(url);
    if (already) {
      done++;
      report();
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const size = Number(res.headers.get("content-length") || 0);
      await cache.put(url, res);
      bytes += size;
      ok++;
    } catch {
      failed++;
    }
    done++;
    report();
  }
  return { ok, failed };
}

/** يمحو كل التلاوات المحفوظة (لا يمسّ بيانات التقدّم أصلًا — شيء آخر) */
export async function clearDownloadedAudio(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    return await caches.delete(AUDIO_CACHE_NAME);
  } catch {
    return false;
  }
}
