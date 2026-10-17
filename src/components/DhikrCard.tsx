import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { textFor } from "../data/adhkar";
import type { Dhikr } from "../data/types";
import { copyToClipboard } from "../lib/clipboard";
import { AUDIO_CACHE_NAME } from "../lib/audioCache";
import { useApp } from "../state/AppContext";
import { useToast } from "./Toast";
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  ShareIcon,
  StopIcon,
} from "./Icons";

interface Props {
  dhikr: Dhikr;
  section: "morning" | "evening";
}


/**
 * بطاقة ذكر واحدة.
 *
 * المسبحة هنا حقيقية لكل بطاقة على حدة: العدّاد مستقل تمامًا عن بقية الأذكار،
 * ومقترن بمعرّف الذكر الثابت وليست بالترتيب، فتغيير ترتيب الأذكار لا يمسّ تقدّم المستخدم.
 */
export default function DhikrCard({ dhikr, section }: Props) {
  const app = useApp();
  const toast = useToast();
  const entry = app.countOf(dhikr);
  const target = app.targetOf(dhikr);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const text = textFor(dhikr, section);
  const done = entry.done;
  const progress = target > 0 ? Math.min(1, entry.count / target) : 0;

  const fav = app.isFavorite(dhikr.id);

  const handleShare = async () => {
    const sourceLine = dhikr.sources
      .map((s) => `${s.book}${s.hadith ? ` ${s.hadith}` : ""}`)
      .join("، ");
    const payload = `${text}\n\nالمصدر: ${sourceLine}\n— ذِكري`;
    if (navigator.share) {
      try {
        await navigator.share({ title: dhikr.title, text: payload });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // ألغى المستخدم المشاركة
      }
    }
    const copied = await copyToClipboard(payload);
    if (copied) {
      toast.show("نُسخ الذكر ومصدره إلى الحافظة", "success");
    } else {
      toast.show("تعذّرت المشاركة أو النسخ في هذا المتصفح", "error");
    }
  };

  const applyTarget = () => {
    const n = Number.parseInt(targetDraft, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.show("أدخل عددًا صحيحًا أكبر من صفر", "error");
      return;
    }
    app.setTarget(dhikr, n);
    setTargetDraft(String(Math.min(n, 9999)));
    setEditingTarget(false);
    toast.show(`حُدّد هدفك إلى ${Math.min(n, 9999)}`, "success");
  };

  return (
    <article
      className="surface relative overflow-hidden"
      aria-labelledby={`dhikr-${dhikr.id}`}
    >
      {/* زخرفة هندسية دقيقة في زاوية واحدة فقط */}
      <div className="pattern pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full" aria-hidden />

      <div className="relative p-4 sm:p-6">
        {/* رأس البطاقة */}
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h2 id={`dhikr-${dhikr.id}`} className="text-lg font-bold" style={{ color: "var(--primary)" }}>
            {dhikr.title}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {dhikr.kind === "quran" ? (
              <span className="chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                قرآن كريم
              </span>
            ) : (
              <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
                {dhikr.kind === "hadith" ? "حديث" : "ذكر"}
              </span>
            )}
            <span className="chip" style={{ background: "var(--surface-2)", color: "var(--text-soft)" }}>
              {dhikr.countLabel}
            </span>
            {dhikr.verification !== "verified-source" && (
              <span className="chip badge-review" title={dhikr.verificationNote}>
                ⚠ يحتاج مراجعة
              </span>
            )}
          </div>
        </header>

        {/* النص الشرعي */}
        {dhikr.kind === "quran" ? (
          <p className="quran-text mb-4 whitespace-pre-line">{text}</p>
        ) : (
          <p className="dhikr-text mb-4">{text}</p>
        )}

        {/* مرجع الآيات */}
        {dhikr.quran?.length ? (
          <p className="mb-3 text-sm" style={{ color: "var(--text-soft)" }}>
            {dhikr.quran
              .map((q) => `${q.surah}${q.from === q.to ? ` — الآية ${q.from}` : ` — الآيات ${q.from} إلى ${q.to}`}`)
              .join("، ")}
          </p>
        ) : null}

        {/* الفضيلة كما وردت في المصدر */}
        {dhikr.virtue && (
          <p
            className="mb-4 rounded-xl p-3 text-sm leading-relaxed"
            style={{ background: "var(--gold-soft)", color: "var(--text-soft)", borderInlineStart: "3px solid var(--gold)" }}
          >
            <span className="font-bold" style={{ color: "var(--text)" }}>الفضل: </span>
            {dhikr.virtue}
          </p>
        )}

        {/* المسبحة */}
        <div className="mb-4 rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="tap shrink-0"
              style={{ width: "5rem", height: "5rem", background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent-strong)", borderWidth: 2 }}
              onClick={() => app.increment(dhikr)}
              aria-label={`زيد عدّاد ${dhikr.title}. الحالي ${entry.count} من ${target}`}
            >
              <span className="text-3xl font-bold tabular-nums" aria-hidden>
                {entry.count}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-semibold">
                العدد الحالي: <span className="tabular-nums">{entry.count}</span>
                <span style={{ color: "var(--text-faint)" }}> من </span>
                <span className="tabular-nums">{target}</span>
                {entry.count > target && (
                  <span className="chip mr-2" style={{ background: "var(--gold-soft)", color: "var(--text)" }}>
                    تجاوزت المستهدف
                  </span>
                )}
              </p>

              <div
                className="progress-track mb-2"
                role="progressbar"
                aria-valuenow={entry.count}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-label={`تقدّم ${dhikr.title}`}
              >
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>

              {done && (
                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--accent-strong)" }}>
                  <CheckIcon width={16} height={16} />
                  اكتمل التكرار
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {confirmReset ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">أتصفّر العدّاد؟</span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ minHeight: "2.1rem", padding: "0.2rem 0.7rem" }}
                      onClick={() => {
                        app.resetCount(dhikr);
                        setConfirmReset(false);
                        toast.show("أُعيد العدّاد إلى الصفر", "success");
                      }}
                    >
                      نعم، تصفير
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: "2.1rem", padding: "0.2rem 0.7rem" }}
                      onClick={() => setConfirmReset(false)}
                    >
                      تراجع
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: "2.1rem", padding: "0.2rem 0.7rem", fontSize: "0.85rem" }}
                      onClick={() => setConfirmReset(true)}
                      disabled={entry.count === 0 && !entry.done}
                    >
                      <ResetIcon width={15} height={15} /> تصفير
                    </button>
                    <button
                      type="button"
                      className="btn"
                      aria-pressed={done}
                      style={{
                        minHeight: "2.1rem",
                        padding: "0.2rem 0.7rem",
                        fontSize: "0.85rem",
                        background: done ? "var(--accent)" : "var(--surface)",
                        color: done ? "var(--on-accent)" : "var(--text)",
                        border: "1px solid var(--border)",
                      }}
                      onClick={() => app.toggleDone(dhikr)}
                    >
                      <CheckIcon width={15} height={15} /> {done ? "أُنجز" : "إتمام"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* عدد المصدر مقابل هدف المستخدم — معلومتان مختلفتان ولا تُخلطان */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className="chip"
              style={{ background: "var(--surface)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
            >
              عدد المصدر: {dhikr.countLabel}
            </span>

            {entry.targetOverride !== null ? (
              <>
                <span className="chip" style={{ background: "var(--gold-soft)", color: "var(--text)" }}>
                  هدفك المخصّص: {entry.targetOverride}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: "1.9rem", fontSize: "0.78rem" }}
                  aria-label={`إعادة لعدد المصدر — هدف ${dhikr.title}`}
                  onClick={() => {
                    app.setTarget(dhikr, null);
                    toast.show("عُيد الهدف إلى عدد المصدر", "success");
                  }}
                >
                  إعادة لعدد المصدر
                </button>
              </>
            ) : null}

            {editingTarget ? (
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={9999}
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyTarget();
                    if (e.key === "Escape") setEditingTarget(false);
                  }}
                  aria-label={`هدف التكرار المخصص لـ ${dhikr.title}`}
                  className="w-20 rounded-lg px-2 py-1"
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    minHeight: "1.9rem",
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: "1.9rem", fontSize: "0.78rem" }}
                  onClick={applyTarget}
                >
                  تطبيق
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: "1.9rem", fontSize: "0.78rem" }}
                  onClick={() => setEditingTarget(false)}
                >
                  إلغاء
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: "1.9rem", fontSize: "0.78rem" }}
                aria-label={`هدف مخصّص — اختر عددًا مخصصًا لـ ${dhikr.title}`}
                onClick={() => {
                  setTargetDraft(String(target));
                  setEditingTarget(true);
                }}
              >
                هدف مخصّص
              </button>
            )}
          </div>

          {dhikr.countAlternative && (
            <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
              ورد في المصدر: {dhikr.countAlternative} — يختلف هذا عن عدد المستهدف الذي تختاره بنفسك.
            </p>
          )}
        </div>

        {/* أدوات البطاقة */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="tap"
            aria-pressed={fav}
            aria-label={fav ? `أزِل ${dhikr.title} من المفضلة` : `أضِف ${dhikr.title} إلى المفضلة`}
            onClick={() => {
              app.toggleFavorite(dhikr.id);
              toast.show(fav ? "أُزيل من المفضلة" : "أُضيف إلى المفضلة", "success");
            }}
          >
            <HeartIcon width={20} height={20} filled={fav} />
          </button>

          <button type="button" className="tap" aria-label={`شارك ${dhikr.title} مع مصدره`} onClick={handleShare}>
            <ShareIcon width={20} height={20} />
          </button>

          <button
            type="button"
            className="tap"
            aria-expanded={audioOpen}
            aria-label={`استمع إلى ${dhikr.title}`}
            onClick={() => setAudioOpen((v) => !v)}
          >
            <PlayIcon width={20} height={20} />
          </button>

          <button
            type="button"
            className="btn btn-ghost mr-auto"
            style={{ minHeight: "2.4rem", fontSize: "0.85rem" }}
            aria-expanded={showSources}
            onClick={() => setShowSources((v) => !v)}
          >
            المصدر والمرجع
            <ChevronIcon
              width={14}
              height={14}
              style={{ transform: showSources ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .18s" }}
            />
          </button>
        </div>

        {audioOpen && <AudioPlayer dhikr={dhikr} onClose={() => setAudioOpen(false)} />}

        {showSources && <SourcePanel dhikr={dhikr} />}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* لوحة المصدر                                                         */
/* ------------------------------------------------------------------ */

function SourcePanel({ dhikr }: { dhikr: Dhikr }) {
  return (
    <div
      className="mt-3 rounded-xl p-3 text-sm"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <h3 className="mb-2 font-bold">المصادر</h3>
      <ul className="space-y-2">
        {dhikr.sources.map((s, i) => (
          <li key={i} className="leading-relaxed">
            <span className="font-semibold">{s.book}</span>
            {s.hadith && <span> — رقم {s.hadith}</span>}
            {s.numberingNote && <span className="text-xs"> ({s.numberingNote})</span>}
            {s.grade && (
              <span className="chip mr-1" style={{ background: "var(--surface)", color: "var(--text-soft)" }}>
                {s.grade}
              </span>
            )}
            <br />
            {s.gradeNote && (
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                {s.gradeNote}
                <br />
              </span>
            )}
            {s.numberVerification === "confirmed" && s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline"
                style={{ color: "var(--accent-strong)" }}
              >
                تحقّق من المصدر
              </a>
            ) : (
              <span className="text-xs" style={{ color: "var(--gold)" }}>
                لم يُتحقَّق من رقم المجموعة الأصلية بعد
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
        <strong>حالة التحقق:</strong> {dhikr.verificationNote}
      </p>
      {/* رابط التصحيح: يفتح نموذج التواصل مع تحديد هذا الذكر ونوعه معبّأين مسبقًا */}
      <Link
        to={`/contact?kind=text-error&dhikr=${dhikr.id}`}
        className="mt-2 inline-block text-xs underline"
        style={{ color: "var(--accent-strong)" }}
      >
        أبلغ عن خطأ في هذا النص أو مصدره
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* مشغّل التلاوة                                                        */
/* ------------------------------------------------------------------ */

/**
 * مشغّل صوتي بسيط: تشغيل / إيقاف مؤقت / توقّف.
 * المصدر خارجي (موقع حصن المسلم) — تُحفَظ التلاوة في أول تشغيل (أو بتنزيلها
 * من الإعدادات) فتعمل دون اتصال، ويُشرح ذلك للمستخدم في تذييل المشغّل.
 */
function AudioPlayer({ dhikr, onClose }: { dhikr: Dhikr; onClose: () => void }) {
  const toast = useToast();
  const ref = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  /* هل هذه التلاوة محفوظة على الجهاز الآن؟ null = لم يُحسم بعد */
  const [saved, setSaved] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const url = dhikr.audio;
    if (!url || typeof caches === "undefined") {
      setSaved(false);
      return;
    }
    caches
      .open(AUDIO_CACHE_NAME)
      .then((cache) => cache.match(url))
      .then((hit) => {
        if (alive) setSaved(!!hit);
      })
      .catch(() => {
        if (alive) setSaved(false);
      });
    return () => {
      alive = false;
    };
  }, [dhikr.audio]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    ref.current = audio;

    const onPlay = () => {
      setState("playing");
      /* مسار عامل الخدمة يضعها في الكاش أثناء الجلب — أي إنها صارت محفوظة */
      setSaved(true);
    };
    const onPause = () => setState("paused");
    const onWaiting = () => setState("loading");
    const onEnd = () => setState("idle");
    const onError = () => {
      setState("error");
      toast.show("تعذّر تحميل التلاوة — قد تحتاج اتصالًا بالإنترنت", "error");
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);

    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [toast]);

  const toggle = () => {
    const audio = ref.current;
    if (!audio || !dhikr.audio) return;
    if (state === "playing") {
      audio.pause();
      return;
    }
    if (!audio.src) {
      setState("loading");
      audio.src = dhikr.audio;
    }
    void audio.play().catch(() => setState("error"));
  };

  return (
    <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={toggle} disabled={(offline && !saved) || state === "error"}>
          {state === "playing" ? <PauseIcon width={18} height={18} /> : <PlayIcon width={18} height={18} />}
          {state === "playing" ? "إيقاف مؤقت" : state === "paused" ? "استئناف" : state === "loading" ? "جارٍ التحميل…" : "تشغيل"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const audio = ref.current;
            if (audio) {
              audio.pause();
              audio.currentTime = 0;
            }
            setState("idle");
          }}
        >
          <StopIcon width={16} height={16} /> توقّف
        </button>
        <button type="button" className="tap" onClick={onClose} aria-label="أغلق المشغّل">
          <CloseIcon width={18} height={18} />
        </button>
      </div>

      {state === "error" ? (
        <p className="mt-2 text-xs" style={{ color: "#a4372e" }}>
          تعذّر تشغيل التلاوة. تأكد من الاتصال ثم أعد المحاولة.
        </p>
      ) : offline ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
          {saved
            ? "التلاوة محفوظة على جهازك — تعمل دون اتصال."
            : "التلاوة تحتاج اتصالًا ولم تُحفظ بعد — نزّلها من الإعدادات لتعمل دون اتصال."}
        </p>
      ) : (
        <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
          تلاوة من موقع <strong>حصن المسلم</strong> الرسمي — تُحفَظ بعد أول تشغيل
          فتعمل دون اتصال، وكلها قابلة للتنزيل من الإعدادات.
        </p>
      )}
    </div>
  );
}
