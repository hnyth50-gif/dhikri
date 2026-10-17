import { useEffect, useRef, useState } from "react";
import ContentPage, { Block, RelatedLinks, usePageTitle } from "../components/ContentPage";
import { MinusIcon, PlusIcon, ResetIcon } from "../components/Icons";
import { useToast } from "../components/Toast";
import { readJSON, writeJSON } from "../lib/storage";
import { useApp } from "../state/AppContext";

interface TasbihState {
  count: number;
  /** هدف اختياري؛ `null` = بلا هدف */
  target: number | null;
}

const KEY = "tasbih:v1";
const PRESETS = [33, 99, 100, 1000];

/**
 * المسبحة الإلكترونية: عدّاد مستقل تمامًا عن أذكار الصباح والمساء.
 *
 * لا يقرأ ولا يكتب في عدّادات الأذكار حتى لا يتداخل مجموعه مع تقدّم الورد؛
 * مفتاح تخزينه الخاص `dhikri:tasbih:v1` مذكور في سياسة الخصوصية.
 */
export default function TasbihPage() {
  const app = useApp();
  const toast = useToast();
  usePageTitle("المسبحة الإلكترونية");

  const [state, setState] = useState<TasbihState>(() => {
    const s = readJSON<TasbihState>(KEY, { count: 0, target: null });
    return {
      count: Number.isFinite(s.count) && s.count >= 0 ? Math.floor(s.count) : 0,
      target: typeof s.target === "number" && s.target > 0 ? Math.floor(s.target) : null,
    };
  });
  const [confirming, setConfirming] = useState(false);
  const [custom, setCustom] = useState("");
  const saveFailed = useRef(false);

  /* الحفظ آليًا بعد كل تغيير — مع إشعار واحد فقط لو فشل التخزين */
  useEffect(() => {
    const ok = writeJSON(KEY, state);
    if (!ok && !saveFailed.current) {
      saveFailed.current = true;
      toast.show("تعذّر حفظ عدّ المسبحة على هذا الجهاز", "error");
    }
    if (ok) saveFailed.current = false;
  }, [state, toast]);

  const { count, target } = state;
  const reached = target !== null && count >= target;
  const canIncrement = target === null || app.settings.allowOverCount || count < target;
  const ratio = target ? Math.min(count / target, 1) : 0;

  const buzz = () => {
    if (app.settings.haptics && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        /* الاهتزاز اختياري أصلًا — لا نعلّق عليه أي شيء */
      }
    }
  };

  const increment = () => {
    if (!canIncrement) return;
    setState((s) => ({ ...s, count: s.count + 1 }));
    buzz();
  };

  const decrement = () => setState((s) => ({ ...s, count: Math.max(0, s.count - 1) }));

  const reset = () => {
    setState((s) => ({ ...s, count: 0 }));
    setConfirming(false);
    toast.show("أُعيدت المسبحة إلى الصفر", "success");
  };

  const applyTarget = (value: number | null) => {
    setState((s) => ({ ...s, target: value }));
    setCustom("");
    toast.show(value ? `الهدف الآن ${value}` : "أُزيل الهدف — عدّ حر بلا سقف", "info");
  };

  return (
    <ContentPage
      title="المسبحة الإلكترونية"
      lead="عدّاد مستقل للتسبيح: اضغط لزيادة العدد، واضبط هدفًا اختياريًا إن أحببت، وأعد الضبط متى شئت. يُحفظ عدّك تلقائيًا حتى لو أغلقت الصفحة."
    >
      {/* العدّاد */}
      <section className="surface flex flex-col items-center gap-4 p-6">
        <div
          className="flex h-44 w-44 flex-col items-center justify-center rounded-full"
          style={{
            background: "var(--primary-soft)",
            border: `4px solid ${reached ? "var(--accent-strong)" : "var(--border)"}`,
          }}
        >
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            العدد الحالي {count}
            {target !== null ? ` من ${target}` : ""}
            {reached ? " — اكتمل الهدف" : ""}
          </span>
          <span aria-hidden className="text-5xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
            {count}
          </span>
          <span aria-hidden className="text-sm tabular-nums" style={{ color: "var(--text-faint)" }}>
            {target !== null ? `من ${target}` : "بلا هدف"}
          </span>
        </div>

        {target !== null && (
          <div
            className="progress-track w-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.min(count, target)}
            aria-label="تقدّم الهدف"
          >
            <div className="progress-fill" style={{ width: `${ratio * 100}%` }} />
          </div>
        )}

        <div className="flex w-full items-center justify-center gap-3">
          <button
            type="button"
            className="tap"
            aria-label="أنقص العدد واحدًا"
            onClick={decrement}
            disabled={count === 0}
            style={{ opacity: count === 0 ? 0.45 : 1 }}
          >
            <MinusIcon width={22} height={22} />
          </button>

          <button
            type="button"
            onClick={increment}
            disabled={!canIncrement}
            aria-label="زد العدد واحدًا"
            className="font-bold"
            style={{
              width: "10rem",
              height: "10rem",
              borderRadius: "999px",
              background: canIncrement ? "var(--accent)" : "var(--surface-2)",
              color: canIncrement ? "var(--on-accent)" : "var(--text-faint)",
              border: "1px solid var(--border)",
              fontSize: "1.1rem",
              cursor: canIncrement ? "pointer" : "not-allowed",
              transition: "transform .12s",
            }}
          >
            <span aria-hidden>+١</span>
            <span className="mt-1 block text-xs font-semibold opacity-80">
              {reached ? "اكتمل الهدف" : "اضغط للتسبيح"}
            </span>
          </button>

          <button type="button" className="tap" aria-label="زد العدد عشرة" onClick={() => setState((s) => ({ ...s, count: s.count + 10 }))}>
            <PlusIcon width={22} height={22} />
            <span className="sr-only">، عشر مرات</span>
          </button>
        </div>

        {reached && (
          <p className="text-center text-sm font-bold" style={{ color: "var(--accent-strong)" }}>
            تمّ الهدف ({target}) — تقبّل الله منك.
            {app.settings.allowOverCount && " يمكنك المتابعة فيزيدها."}
          </p>
        )}

        {/* إعادة الضبط بتأكيد، لا بضغطة واحدة */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!confirming ? (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
              <ResetIcon width={16} height={16} />
              أصفِر العدّاد
            </button>
          ) : (
            <>
              <span className="text-sm font-semibold">أتصفّر العدّاد فعليًا؟</span>
              <button type="button" className="btn btn-danger" onClick={reset}>
                أتصفّر
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                إلغاء
              </button>
            </>
          )}
        </div>
      </section>

      {/* الهدف */}
      <section className="surface p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-bold" style={{ color: "var(--primary)" }}>
          هدف اختياري
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--text-soft)" }}>
          الهدف خاص بهذا العدّاد وحده ولا علاقة له بأي ذكر. اختر عددًا جاهزًا أو اكتب رقمك، أو اتركه بلا هدف.
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={target === n}
              onClick={() => applyTarget(target === n ? null : n)}
              style={{
                background: target === n ? "var(--accent)" : "var(--surface-2)",
                color: target === n ? "var(--on-accent)" : "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={target === null}
            onClick={() => applyTarget(null)}
            style={{
              background: target === null ? "var(--accent)" : "var(--surface-2)",
              color: target === null ? "var(--on-accent)" : "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            بلا هدف
          </button>
        </div>

        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number.parseInt(custom, 10);
            if (!Number.isFinite(n) || n < 1 || n > 100000) {
              toast.show("اكتب عددًا من 1 إلى 100000", "error");
              return;
            }
            applyTarget(n);
          }}
        >
          <div>
            <label htmlFor="tasbih-custom" className="mb-1 block text-sm font-bold">
              عدد مخصّص
            </label>
            <input
              id="tasbih-custom"
              /* text + inputMode بدل type="number": نفس لوحة الأرقام على الهاتف،
                 ويتجنّب خصوصية React لحقول الأرقام في إعادة الضبط أثناء الكتابة */
              type="text"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="min-h-11 w-36 rounded-xl px-3 outline-none"
              style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>
          <button type="submit" className="btn btn-ghost" style={{ minHeight: "2.75rem" }}>
            اضبط الهدف
          </button>
        </form>
      </section>

      <Block
        title="ملاحظات النزاهة"
        items={[
          "العدّادات الآلية لا يُحتسب بها تقدّم الأذكار: مجموع المسبحة لا يدخل في إنجاز الصباح ولا المساء.",
          "لا صوت ولا اهتزاز إلا إن فعّلت الاهتزاز من الإعدادات؛ «اهتزاز خفيف عند كل ضغطة».",
          "الهدف يبقى محفوظًا ولا يصفَّر مع العدّ؛ صفِّر العدّاد وحدّه بضغطة «أصفِر».",
          "إن منع المتصفح التخزين فلن يبقى العدّ بعد إعادة الفتح، ويظهر تنبيه بذلك بدل الصمت.",
        ]}
      />

      <RelatedLinks
        links={[
          { to: "/wird", label: "وردي اليوم", note: "تقدّم أذكار الصباح والمساء" },
          { to: "/guide", label: "دليل الاستخدام", note: "شرح العدّاد والهدف من التنبيهات" },
          { to: "/settings", label: "الإعدادات", note: "تجاوز الهدف والاهتزاز" },
        ]}
      />
    </ContentPage>
  );
}
