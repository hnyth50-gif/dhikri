import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAdhkar } from "../data/adhkar";
import type { Dhikr } from "../data/types";
import {
  bestStreak,
  computeStreak,
  dayKey,
  emptyDay,
  isDayCompleted,
  pruneHistory,
  shiftDay,
  type DaySummary,
} from "../lib/dates";
import { probeStorage, readJSON, writeJSON, type StorageFailure } from "../lib/storage";

/* ------------------------------------------------------------------ */
/* التفضيلات                                                          */
/* ------------------------------------------------------------------ */

export type ThemeChoice = "light" | "dark" | "system";
export type FontChoice = "naskh" | "naskh-noto" | "kufi" | "cairo";

export interface Settings {
  theme: ThemeChoice;
  /** رقم من 1 إلى 5 — يقابله حجم فعلي محسوب في ملف الأنماط */
  fontScale: 1 | 2 | 3 | 4 | 5;
  font: FontChoice;
  /** السماح بتجاوز العدد المستهدف بدل الإيقاف عنده */
  allowOverCount: boolean;
  /** اهتزاز خفيف عند كل ضغطة — اختياري ومعطّل افتراضيًا، ولا يوجد صوت تلقائي */
  haptics: boolean;
  /** تنبيه الصباح */
  morningReminder: boolean;
  morningTime: string;
  /** تنبيه المساء */
  eveningReminder: boolean;
  eveningTime: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontScale: 3,
  font: "naskh",
  allowOverCount: false,
  haptics: false,
  morningReminder: false,
  morningTime: "06:00",
  eveningReminder: false,
  eveningTime: "18:00",
};

/* ------------------------------------------------------------------ */
/* التقدّم                                                             */
/* ------------------------------------------------------------------ */

export interface DhikrCount {
  count: number;
  done: boolean;
  /** عدد المستهدف الذي اختاره المستخدم. `null` = يستخدم عدد المصدر */
  targetOverride: number | null;
}

export interface Progress {
  /** اليوم الذي تنتمي إليه عدّادات `counters` الحالية */
  date: string;
  counters: Record<string, DhikrCount>;
  favorites: string[];
  history: Record<string, DaySummary>;
  /* ملاحظة: «مجموع التكرارات» ليس حقلًا هنا عمدًا — يُشتق لحظيًا من السجل
     ومن عدّادات اليوم في `lifetimeRepeats`، فلا تُحسب مرّة مخزّنة ثم تتقادم. */
}

const EMPTY_PROGRESS: Progress = {
  date: "",
  counters: {},
  favorites: [],
  history: {},
};

const SETTINGS_KEY = "settings:v1";
const PROGRESS_KEY = "progress:v1";

/* ------------------------------------------------------------------ */
/* السياق                                                              */
/* ------------------------------------------------------------------ */

interface AppApi {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  progress: Progress;
  /** العدد الحالي لذكر في يوم معيّن */
  countOf: (dhikr: Dhikr) => DhikrCount;
  /** الهدف الفعّال: اختيار المستخدم إن وجد، وإلا عدد المصدر */
  targetOf: (dhikr: Dhikr) => number;
  increment: (dhikr: Dhikr) => void;
  setCount: (dhikr: Dhikr, value: number) => void;
  resetCount: (dhikr: Dhikr) => void;
  /** هدف المستخدم الخاص — مستقل تمامًا عن عدد المصدر، ويبقى بعد تبدّل اليوم */
  setTarget: (dhikr: Dhikr, override: number | null) => void;
  toggleDone: (dhikr: Dhikr) => void;
  isFavorite: (dhikrId: string) => boolean;
  toggleFavorite: (dhikrId: string) => void;
  /** نسبة إنجاز قسم (صباح أو مساء) من 0 إلى 1 */
  sectionProgress: (section: "morning" | "evening") => { done: number; total: number; ratio: number };
  streak: number;
  best: number;
  /** مجموع كل مرات التكرار عبر كل الأيام، محسوبًا لحظيًا لا من قيمة مخزّنة */
  lifetimeRepeats: number;
  /** الثيم الفعلي بعد حلّ «حسب الجهاز» — تُقرأ منه الواجهة لا من DOM */
  resolvedTheme: "light" | "dark";
  /** هل أُنجز شيء اليوم؟ */
  todayActive: boolean;
  storage: StorageFailure;
  resetAll: () => void;
}

const Ctx = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<StorageFailure>(() => probeStorage());
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJSON<Partial<Settings>>(SETTINGS_KEY, {}),
  }));
  const [progress, setProgress] = useState<Progress>(() => {
    const stored = readJSON<Progress>(PROGRESS_KEY, EMPTY_PROGRESS);
    return migrate(stored);
  });

  const today = dayKey();

  /* نراقب تفضيل النظام حتى يتبدّل الثيم فورًا لو غيّره المستخدم خارج الموقع */
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** الثيم الفعلي: اختيار المستخدم، أو تفضيل النظام عند اختيار «حسب الجهاز» */
  const resolvedTheme: "light" | "dark" =
    settings.theme === "system" ? (systemDark ? "dark" : "light") : settings.theme;

  /* تدوير اليوم: إن كان آخر يوم محفوظ هو الأمس، نُغلق سجل الأمس ونبدأ عدّادات جديدة */
  useEffect(() => {
    if (progress.date === today) return;
    setProgress((prev) => rollDay(prev, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  /* إن كان التخزين غير متاح، نُبلغ المستخدم مرة واحدة */
  useEffect(() => {
    setStorage((s) => (s.available ? probeStorage() : s));
  }, []);

  /* حفظ التفضيلات */
  useEffect(() => {
    writeJSON(SETTINGS_KEY, settings);
  }, [settings]);

  /* تطبيق الثيم على الـ DOM كلما تبدّل فعليًا (اختيار المستخدم أو تفضيل النظام) */
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  /* حفظ التقدّم — مع تجميع الكتابة حتى لا نكتب عند كل ضغطة مسبحة */
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const flushTimer = useRef<number | null>(null);
  useEffect(() => {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => {
      writeJSON(PROGRESS_KEY, progressRef.current);
    }, 220);
    return () => {
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
    };
  }, [progress]);

  /* حفظ فوري عند مغادرة الصفحة حتى لا يضيع آخر ما عُدّ */
  useEffect(() => {
    const flush = () => writeJSON(PROGRESS_KEY, progressRef.current);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  /* احترام إعداد النظام للثيم عند اختيار «تلقائي» — يتكفّل به `systemDark` أعلاه */

  /* تطبيق خط النص على الجذر */
  useEffect(() => {
    document.documentElement.setAttribute("data-font", settings.font);
    document.documentElement.setAttribute("data-font-scale", String(settings.fontScale));
  }, [settings.font, settings.fontScale]);

  /* رفض تجاوز العدّاد المستهدف عند تغيير الإعداد */
  useEffect(() => {
    if (settings.allowOverCount) return;
    setProgress((prev) => {
      let changed = false;
      const next: Progress["counters"] = { ...prev.counters };
      for (const [id, entry] of Object.entries(next)) {
        const target = effectiveTarget(id, entry.targetOverride);
        if (entry.count > target) {
          next[id] = { ...entry, count: target };
          changed = true;
        }
      }
      return changed ? { ...prev, counters: next } : prev;
    });
  }, [settings.allowOverCount]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const countOf = useCallback(
    (dhikr: Dhikr): DhikrCount =>
      progress.counters[dhikr.id] ?? { count: 0, done: false, targetOverride: null },
    [progress.counters]
  );

  const targetOf = useCallback(
    (dhikr: Dhikr): number => {
      const entry = progress.counters[dhikr.id];
      return effectiveTarget(dhikr.id, entry?.targetOverride ?? null);
    },
    [progress.counters]
  );

  const increment = useCallback(
    (dhikr: Dhikr) => {
      setProgress((prev) => {
        const cur = prev.counters[dhikr.id] ?? { count: 0, done: false, targetOverride: null };
        const target = effectiveTarget(dhikr.id, cur.targetOverride);
        if (!settings.allowOverCount && cur.count >= target) return prev;
        const count = cur.count + 1;
        const reached = count >= target;
        return {
          ...prev,
          counters: { ...prev.counters, [dhikr.id]: { ...cur, count, done: cur.done || reached } },
        };
      });
      if (settings.haptics && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          /* الاهتزاز ليس متاحًا — نتجاهل بصمت لأنه تحسين اختياري */
        }
      }
    },
    [settings.allowOverCount, settings.haptics]
  );

  const setCount = useCallback(
    (dhikr: Dhikr, value: number) => {
      const safe = Math.max(0, Math.round(value));
      setProgress((prev) => {
        const cur = prev.counters[dhikr.id] ?? { count: 0, done: false, targetOverride: null };
        const target = effectiveTarget(dhikr.id, cur.targetOverride);
        const capped = settings.allowOverCount ? safe : Math.min(safe, target);
        return {
          ...prev,
          counters: {
            ...prev.counters,
            [dhikr.id]: { ...cur, count: capped, done: cur.done || capped >= target },
          },
        };
      });
    },
    [settings.allowOverCount]
  );

  const resetCount = useCallback((dhikr: Dhikr) => {
    setProgress((prev) => {
      const cur = prev.counters[dhikr.id];
      if (!cur) return prev;
      return {
        ...prev,
        counters: { ...prev.counters, [dhikr.id]: { ...cur, count: 0, done: false } },
      };
    });
  }, []);

  /**
   * هدف المستخدم الخاص. لا يمسّ `countLabel` ولا `count` المنسوبَين لل مصدر،
   * ويظل محفوظًا حين يبدّل اليوم لأنّه تفضيل لا إنجاز.
   */
  const setTarget = useCallback(
    (dhikr: Dhikr, override: number | null) => {
      const clean = override !== null && override > 0 ? Math.min(Math.round(override), 9999) : null;
      setProgress((prev) => {
        const cur = prev.counters[dhikr.id] ?? { count: 0, done: false, targetOverride: null };
        const next: DhikrCount = { ...cur, targetOverride: clean };
        if (clean !== null) {
          if (!settings.allowOverCount && next.count > clean) next.count = clean;
          next.done = next.done || next.count >= clean;
        }
        return { ...prev, counters: { ...prev.counters, [dhikr.id]: next } };
      });
    },
    [settings.allowOverCount]
  );

  const toggleDone = useCallback((dhikr: Dhikr) => {
    setProgress((prev) => {
      const cur = prev.counters[dhikr.id] ?? { count: 0, done: false, targetOverride: null };
      return {
        ...prev,
        counters: { ...prev.counters, [dhikr.id]: { ...cur, done: !cur.done } },
      };
    });
  }, []);

  const isFavorite = useCallback((id: string) => progress.favorites.includes(id), [progress.favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setProgress((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(id)
        ? prev.favorites.filter((f) => f !== id)
        : [...prev.favorites, id],
    }));
  }, []);

  const sectionProgress = useCallback(
    (section: "morning" | "evening") => {
      const items = getAdhkar(section);
      const total = items.length;
      const done = items.filter((d) => progress.counters[d.id]?.done).length;
      return { done, total, ratio: total === 0 ? 0 : done / total };
    },
    [progress.counters]
  );

  /**
   * ملخّص اليوم المحسوب من العدّادات الحالية لحظيًا.
   * السجل `history` لا يُكتب إلا عند تبدّل اليوم، ولو اعتمدناه وحده لبقي
   * «لم تبدأ بعد اليوم» و«السلسلة 0» طوال النهار رغم أن المستخدم يقرأ.
   */
  const todaySummary = useMemo<DaySummary>(() => {
    const morningIds = new Set(getAdhkar("morning").map((d) => d.id));
    const eveningIds = new Set(getAdhkar("evening").map((d) => d.id));
    const day = emptyDay();
    for (const [id, entry] of Object.entries(progress.counters)) {
      day.totalRepeats += num(entry.count);
      if (!entry.done) continue;
      if (morningIds.has(id)) day.morning.push(id);
      if (eveningIds.has(id)) day.evening.push(id);
    }
    return day;
  }, [progress.counters]);

  /** السجل كما يُعرض: ما هو محفوظ + ما أُنِّج اليوم حتى هذه اللحظة */
  const historyIncludingToday = useMemo<Record<string, DaySummary>>(() => {
    if (!isDayCompleted(todaySummary)) return progress.history;
    const saved = progress.history[today];
    const merged: DaySummary = {
      morning: unionIds(saved?.morning, todaySummary.morning),
      evening: unionIds(saved?.evening, todaySummary.evening),
      totalRepeats: num(saved?.totalRepeats) + todaySummary.totalRepeats,
    };
    return { ...progress.history, [today]: merged };
  }, [progress.history, today, todaySummary]);

  const streak = useMemo(() => computeStreak(historyIncludingToday, today), [historyIncludingToday, today]);
  const best = useMemo(() => bestStreak(historyIncludingToday), [historyIncludingToday]);

  const todayActive = isDayCompleted(todaySummary);

  /** مجموع كل التكرارات: كل الأيام المسكّلة + ما يجري في اليوم حاليًا */
  const lifetimeRepeats = useMemo(() => {
    let sum = 0;
    for (const day of Object.values(historyIncludingToday)) sum += num(day?.totalRepeats);
    return sum;
  }, [historyIncludingToday]);

  const resetAll = useCallback(() => {
    setProgress({ ...EMPTY_PROGRESS, date: dayKey() });
  }, []);

  const api: AppApi = {
    settings,
    updateSettings,
    progress,
    countOf,
    targetOf,
    increment,
    setCount,
    resetCount,
    setTarget,
    toggleDone,
    isFavorite,
    toggleFavorite,
    sectionProgress,
    streak,
    best,
    lifetimeRepeats,
    resolvedTheme,
    todayActive,
    storage: storage.available ? storage : probeStorage(),
    resetAll,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------------ */
/* مساعدات                                                             */
/* ------------------------------------------------------------------ */

/** رقم آمن من قيم قد تكون ناقصة أو تالفة في بيانات قديمة */
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** اتحاد معرّفات الأيام دون تكرار ودون فقدان ترتيب القراءة */
function unionIds(a: string[] | undefined, b: string[] | undefined): string[] {
  const out = [...(a ?? [])];
  for (const id of b ?? []) if (!out.includes(id)) out.push(id);
  return out;
}

/** العدد المستهدف الفعّال: اختيار المستخدم إن وجد، وإلا العدد المنقول في المصدر */export function effectiveTarget(dhikrId: string, override: number | null): number {
  if (override !== null && override > 0) return override;
  const fromData = allDhikrTargets.get(dhikrId);
  return fromData ?? 1;
}

let allDhikrTargets = new Map<string, number>();
try {
  allDhikrTargets = new Map(
    [...getAdhkar("morning"), ...getAdhkar("evening")].map((d) => [d.id, d.count])
  );
} catch {
  // بيانات غير محمّلة بعد — نعتمد الافتراض 1
}

function migrate(stored: Progress): Progress {
  const base: Progress = { ...EMPTY_PROGRESS, ...stored };
  if (!Array.isArray(base.favorites)) base.favorites = [];
  if (typeof base.history !== "object" || base.history === null) base.history = {};
  if (typeof base.counters !== "object" || base.counters === null) base.counters = {};
  base.history = pruneHistory(base.history);
  if (!base.date) base.date = dayKey();
  return base;
}

/**
 * إغلاق اليوم المنتهي: نسجّل ما أُنِّج في `history` ثم نصفّر العدّادات لليوم الجديد.
 * سجل الأمس يبقى محفوظًا كما هو — لا يُمسح بسبب تحديث الصفحة.
 */
function rollDay(prev: Progress, today: string): Progress {
  // أهداف المستخدم المخصّصة تفضيل يبقى، أمّا العدّادات والإنجاز فخاصّة بيومه
  const nextCounters = carryTargets(prev.counters);
  if (prev.date && prev.date !== today && prev.date < today) {
    const summary = aggregate(prev);
    const history = pruneHistory({ ...prev.history, [prev.date]: summary });
    return { ...prev, date: today, counters: nextCounters, history };
  }
  return { ...prev, date: today, counters: nextCounters };
}

/** يُبقي الأهداف المخصّصة ويعيد ضبط العدّاد والإنجاز لليوم الجديد */
function carryTargets(counters: Progress["counters"]): Progress["counters"] {
  const out: Progress["counters"] = {};
  for (const [id, entry] of Object.entries(counters ?? {})) {
    const t = entry?.targetOverride;
    if (typeof t === "number" && t > 0) out[id] = { count: 0, done: false, targetOverride: t };
  }
  return out;
}

/** يحوّل حالة العدّادات إلى ملخّص يوم يُحفظ في السجل */
function aggregate(prev: Progress): DaySummary {
  const day = prev.history[prev.date] ? { ...prev.history[prev.date] } : emptyDay();
  const morningIds = new Set(getAdhkar("morning").map((d) => d.id));
  const eveningIds = new Set(getAdhkar("evening").map((d) => d.id));
  let repeats = 0;

  for (const [id, entry] of Object.entries(prev.counters)) {
    repeats += entry.count;
    if (!entry.done) continue;
    if (morningIds.has(id) && !day.morning.includes(id)) day.morning.push(id);
    if (eveningIds.has(id) && !day.evening.includes(id)) day.evening.push(id);
  }
  day.totalRepeats = num(day.totalRepeats) + repeats;
  return day;
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
}

export function useApp(): AppApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export { shiftDay, type Dhikr };
