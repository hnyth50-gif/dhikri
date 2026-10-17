import { Link } from "react-router-dom";
import ContentPage, { RelatedLinks, usePageTitle } from "../components/ContentPage";
import { CheckIcon, ChevronIcon, FlameIcon, SparkIcon } from "../components/Icons";
import ProgressRing from "../components/ProgressRing";
import { getAdhkar } from "../data/adhkar";
import { useApp } from "../state/AppContext";

const SECTIONS = [
  { id: "morning" as const, label: "أذكار الصباح" },
  { id: "evening" as const, label: "أذكار المساء" },
];

function todayLabel(): string {
  try {
    return new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

/**
 * وردي اليوم: نظرة واحدة على أذكار الصباح والمساء مع حالة كل ذكر.
 *
 * لا تُعاد كتابة منطق العدّ هنا — كل شيء يقرأ من العدّادات نفسها التي
 * تستخدمها البطاقات، فلا يوجد تقدّم «هنا» مختلف عن تقدّم «هناك».
 */
export default function WirdPage() {
  const app = useApp();
  usePageTitle("وردي اليوم");

  const morning = app.sectionProgress("morning");
  const evening = app.sectionProgress("evening");
  const total = morning.total + evening.total;
  const done = morning.done + evening.done;
  const ratio = total === 0 ? 0 : done / total;
  const started = done > 0;

  return (
    <ContentPage title="وردي اليوم" lead="متابعة أذكار الصباح والمساء وتقدّمك في قراءة اليوم، مع روابط مباشرة إلى كل ذكر.">
      <p className="text-sm font-semibold" style={{ color: "var(--text-faint)" }}>
        {todayLabel()}
      </p>

      {/* الملخّص */}
      <div className="surface grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
            <span className="sr-only">إنجاز اليوم </span>
            {done}/{total}
          </p>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            إنجاز اليوم
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
            <span className="sr-only">نسبة الإنجاز </span>
            {Math.round(ratio * 100)}٪
          </p>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            النسبة
          </p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="flex items-center gap-1 text-2xl font-bold tabular-nums" style={{ color: "var(--accent-strong)" }}>
            <FlameIcon width={18} height={18} />
            <span className="sr-only">السلسلة: </span>
            {app.streak}
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            سلسلة الأيام
          </span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="flex items-center gap-1 text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
            <SparkIcon width={18} height={18} />
            <span className="sr-only">مجموع التكرارات: </span>
            {app.lifetimeRepeats}
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            مجموع التكرارات
          </span>
        </div>
      </div>

      {/* بطاقتا القسم */}
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const p = app.sectionProgress(s.id);
          const complete = p.total > 0 && p.done >= p.total;
          return (
            <section key={s.id} className="surface flex items-center gap-3 p-4">
              <ProgressRing ratio={p.ratio} label={`إنجاز ${s.label}`} size={64} />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold" style={{ color: "var(--primary)" }}>
                  {s.label}
                </h2>
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                  أُنجز <span className="tabular-nums">{p.done}</span> من{" "}
                  <span className="tabular-nums">{p.total}</span>
                  {complete && <span style={{ color: "var(--accent-strong)" }}> — مكتمل</span>}
                </p>
                <Link
                  to={`/${s.id}`}
                  className="btn btn-primary mt-2"
                  style={{ minHeight: "2.2rem", fontSize: "0.85rem", textDecoration: "none" }}
                >
                  {p.done === 0 ? "ابدأ" : complete ? "راجع" : "تابع القراءة"}
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      {!started && (
        <div className="surface p-5 text-center">
          <p className="font-bold" style={{ color: "var(--primary)" }}>
            لم تبدأ وردك اليوم بعد
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
            افتح أي قسم وابدأ بالذكر الأول — كل ضغطة عدّاد تُحفظ في مكانها.
          </p>
        </div>
      )}

      {/* قوائم الأذكار، مطويّة حتى تبقى الصفحة هادئة */}
      <div className="space-y-3">
        {SECTIONS.map((s) => {
          const items = getAdhkar(s.id);
          const p = app.sectionProgress(s.id);
          return (
            <details key={s.id} className="surface p-4" open={false}>
              <summary className="cursor-pointer list-none">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold" style={{ color: "var(--primary)" }}>
                    {s.label}
                    <span className="mr-2 text-sm font-semibold tabular-nums" style={{ color: "var(--text-faint)" }}>
                      {p.done}/{p.total}
                    </span>
                  </span>
                  <ChevronIcon width={16} height={16} style={{ transform: "rotate(-90deg)" }} />
                </span>
              </summary>

              <ol className="mt-3 space-y-1.5">
                {items.map((dhikr, i) => {
                  const c = app.countOf(dhikr);
                  const target = app.targetOf(dhikr);
                  return (
                    <li key={dhikr.id}>
                      <div
                        className="flex items-center gap-2 rounded-xl px-2 py-2"
                        style={{
                          background: c.done ? "var(--primary-soft)" : "transparent",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span
                          aria-hidden
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                          style={{
                            background: c.done ? "var(--accent)" : "var(--surface-2)",
                            color: c.done ? "var(--on-accent)" : "var(--text-faint)",
                          }}
                        >
                          {c.done ? <CheckIcon width={12} height={12} /> : i + 1}
                        </span>
                        <span className="sr-only">{c.done ? "منجز: " : "لم يُنجز بعد: "}</span>
                        <Link
                          to={`/${s.id}?focus=${dhikr.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-semibold no-underline"
                          style={{ color: "var(--text)" }}
                        >
                          {dhikr.title}
                        </Link>
                        <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
                          {c.count}/{target}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
      </div>

      <RelatedLinks
        links={[
          { to: "/tasbih", label: "المسبحة الإلكترونية", note: "عدّاد مستقل بهدف اختياري" },
          { to: "/adhkar", label: "فهرس الأذكار", note: "وصول سريع لأي ذكر" },
          { to: "/settings", label: "الإعدادات", note: "تذكيرات الصباح والمساء" },
        ]}
      />
    </ContentPage>
  );
}
