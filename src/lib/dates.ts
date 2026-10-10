/**
 * منطق الأيام والسلسلة (Streak).
 *
 * قواعد مُعلنة صراحةً حتى لا تكون منطقًا مخفيًا:
 * 1. اليوم الجديد يبدأ عند منتصف الليل المحلي لجهاز المستخدم (00:00).
 * 2. «يوم مُنجز» = يوم أُنِّج فيه ذكر واحد على الأقل (أكمل المستخدم ذكرًا واحدًا أو أكثر).
 * 3. السلسلة = عدد الأيام المتتالية المُنجزة المنتهية بيوم مُنجز.
 *    - يوم لم يُنجز فيه شيء يقطع السلسلة.
 *    - الأيام المستقبلية أو اليوم الحالي غير المكتمل لا يُحتسب ضمن السلسلة.
 * 4. السجلات تُحفظ كامدة، مع تنظيف تلقائيًا يُبقي آخر `HISTORY_LIMIT` يومًا.
 */

export const HISTORY_LIMIT = 365;

export interface DaySummary {
  /** المُعرّفات المكتملة في أذكار الصباح */
  morning: string[];
  /** المُعرّفات المكتملة في أذكار المساء */
  evening: string[];
  /** إجمالي مرات التكرار المسجّلة في هذا اليوم عبر كل الأذكار */
  totalRepeats: number;
}

export const emptyDay = (): DaySummary => ({ morning: [], evening: [], totalRepeats: 0 });

/** مفتاح اليوم بصيغة YYYY-MM-DD حسب التقويم المحلي للجهاز */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  // نستخدم الظهيرة لتفادي مشاكل التحويف (DST) عند عمليات الجمع والطرح
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function shiftDay(key: string, delta: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

/** عدد الأيام الكاملة بين يومين (موجب إذا كان `b` أحدث) */
export function daysBetween(a: string, b: string): number {
  const ms = parseKey(b).getTime() - parseKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isDayCompleted(day: DaySummary | undefined): boolean {
  if (!day) return false;
  return day.morning.length > 0 || day.evening.length > 0;
}

/**
 * تحسب السلسلة ابتداءً من اليوم.
 * نبدأ من اليوم ونتراجع للأيام السابقة كلما كانت مُنجزة.
 */
export function computeStreak(history: Record<string, DaySummary>, today: string): number {
  // اليوم الحالي: نبدأ العدّ منه فقط إذا كان مُنجزًا، وإلا نرجع لليوم السابق.
  let cursor = isDayCompleted(history[today]) ? today : shiftDay(today, -1);
  let streak = 0;
  // حد أقصى واقعي لتفادي حلقة لا نهائية عند بيانات تالفة
  for (let i = 0; i < HISTORY_LIMIT; i++) {
    if (!isDayCompleted(history[cursor])) break;
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/**
 * أفضل سلسلة حققها المستخدم في السجل.
 * نمشي على الأيام المُنجزة مرتبة تصاعديًا ونقيس أطول تتابع فعلي.
 */
export function bestStreak(history: Record<string, DaySummary>): number {
  const done = Object.keys(history)
    .filter((k) => isDayCompleted(history[k]))
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of done) {
    run = prev !== null && daysBetween(prev, key) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = key;
  }
  return best;
}

/** تنظيف السجل: نحتفظ بآخر `HISTORY_LIMIT` يومًا مُنجزًا فقط */
export function pruneHistory(history: Record<string, DaySummary>): Record<string, DaySummary> {
  const keys = Object.keys(history);
  if (keys.length <= HISTORY_LIMIT) return history;
  const keep = new Set(
    keys
      .filter((k) => isDayCompleted(history[k]))
      .sort()
      .slice(-HISTORY_LIMIT)
  );
  const next: Record<string, DaySummary> = {};
  for (const k of keep) next[k] = history[k];
  return next;
}
