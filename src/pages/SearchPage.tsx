import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdhkar, normalize, searchAdhkar, textFor } from "../data/adhkar";
import type { Dhikr } from "../data/types";
import { usePageTitle } from "../components/ContentPage";
import { useApp } from "../state/AppContext";
import { useToast } from "../components/Toast";
import { ChevronIcon, CloseIcon, HeartIcon, SearchIcon } from "../components/Icons";

type Tab = "search" | "favorites";
type Filter = "all" | "morning" | "evening";

export default function SearchPage() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "favorites" ? "favorites" : "search";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  usePageTitle("البحث والمفضلة");

  const results = useMemo(() => searchAdhkar(query), [query]);
  // معرّفات المفضّلة تقرأ من التخزين، لا نعرض كل الأذكار على أنها محفوظة
  const favoriteIds = app.progress.favorites;

  const visible = useMemo(() => {
    const source = tab === "favorites" ? filterFavorites("", favoriteIds) : results;
    if (filter === "all") return source;
    return source.filter((d) => d.time === filter || d.time === "both");
  }, [tab, filter, results, favoriteIds]);

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    if (next === "search") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
        البحث والمفضلة
      </h1>

      {/* التبويبان */}
      <div className="flex gap-2" role="tablist" aria-label="البحث والمفضلة">
        <TabButton active={tab === "search"} onClick={() => setTab("search")} label="البحث في الأذكار" />
        <TabButton active={tab === "favorites"} onClick={() => setTab("favorites")} label="المفضلة" />
      </div>

      {/* البحث */}
      {tab === "search" && (
        <div className="surface flex items-center gap-2 p-2">
          <SearchIcon width={20} height={20} style={{ color: "var(--text-faint)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في نصوص الأذكار…"
            aria-label="ابحث في نصوص الأذكار"
            className="min-h-11 w-full bg-transparent outline-none"
            style={{ color: "var(--text)" }}
            autoComplete="off"
          />
          {query && (
            <button type="button" className="tap" aria-label="امسح البحث" onClick={() => setQuery("")}>
              <CloseIcon width={18} height={18} />
            </button>
          )}
        </div>
      )}

      {/* التصنيف */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="تصنيف النتائج">
        {(
          [
            ["all", "الكل"],
            ["morning", "أذكار الصباح"],
            ["evening", "أذكار المساء"],
          ] as Array<[Filter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            style={{
              background: filter === value ? "var(--accent)" : "var(--surface-2)",
              color: filter === value ? "var(--on-accent)" : "var(--text-soft)",
              border: "1px solid var(--border)",
              padding: "0.35rem 0.85rem",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* الحالات */}
      {tab === "search" && query.trim() === "" && (
        <p className="surface p-5 text-center" style={{ color: "var(--text-soft)" }}>
          اكتب كلمة من الذكر لتظهر النتائج. جرّب: «سبحان الله» أو «العافية» أو «العرش».
        </p>
      )}

      {tab === "search" && query.trim() !== "" && visible.length === 0 && (
        <p className="surface p-5 text-center" style={{ color: "var(--text-soft)" }}>
          لا توجد نتائج مطابقة. جرّب كلمة أقصر أو مختلفة الإملاء.
        </p>
      )}

      {tab === "favorites" && visible.length === 0 && (
        <p className="surface p-5 text-center" style={{ color: "var(--text-soft)" }}>
          لا توجد أذكار في المفضلة. اضغط رمز القلب في أي بطاقة ذكر لحفظها هنا.
        </p>
      )}

      <ul className="space-y-3">
        {visible.map((d) => (
          <li key={d.id}>
            <ResultRow dhikr={d} filter={filter} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="btn"
      style={{
        background: active ? "var(--accent)" : "var(--surface-2)",
        color: active ? "var(--on-accent)" : "var(--text-soft)",
        border: "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}

function ResultRow({ dhikr, filter }: { dhikr: Dhikr; filter: Filter }) {
  const app = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const section: "morning" | "evening" =
    filter === "evening" ? "evening" : filter === "morning" ? "morning" : dhikr.time === "evening" ? "evening" : "morning";
  const excerpt = textFor(dhikr, section);

  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold" style={{ color: "var(--primary)" }}>
            {dhikr.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-soft)" }}>
            {excerpt.length > 120 ? `${excerpt.slice(0, 120)}…` : excerpt}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
            {dhikr.sources.map((s) => `${s.book}${s.hadith ? ` ${s.hadith}` : ""}`).join("، ")}
          </p>
        </div>
        <button
          type="button"
          className="tap shrink-0"
          aria-pressed={app.isFavorite(dhikr.id)}
          aria-label={app.isFavorite(dhikr.id) ? `أزِل ${dhikr.title} من المفضلة` : `أضِف ${dhikr.title} إلى المفضلة`}
          onClick={() => {
            // نلتقط الحالة قبل التبديل، فالرسالة تصف ما حدث لا ما سيحدث
            const wasFavorite = app.isFavorite(dhikr.id);
            app.toggleFavorite(dhikr.id);
            toast.show(wasFavorite ? "أُزيل من المفضلة" : "أُضيف إلى المفضلة", "success");
          }}
        >
          <HeartIcon width={20} height={20} filled={app.isFavorite(dhikr.id)} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ minHeight: "2.2rem", fontSize: "0.85rem" }}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          المصدر
          <ChevronIcon
            width={14}
            height={14}
            style={{ transform: open ? "rotate(-90deg)" : "none", transition: "transform .18s" }}
          />
        </button>
        <Link
          to={section === "evening" ? "/evening" : "/morning"}
          className="btn btn-primary"
          style={{ minHeight: "2.2rem", fontSize: "0.85rem", textDecoration: "none" }}
        >
          افتح في {section === "evening" ? "أذكار المساء" : "أذكار الصباح"}
        </Link>
      </div>

      {open && (
        <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--text-soft)" }}>
          {dhikr.sources.map((s, i) => (
            <li key={i}>
              <strong>{s.book}</strong>
              {s.hadith && <> — رقم {s.hadith}</>}
              {s.grade && <> — {s.grade}</>}
              {s.numberVerification === "confirmed" && s.url && (
                <>
                  {" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline" style={{ color: "var(--accent-strong)" }}>
                    تحقّق
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** يُستخدم في صفحة المفضلة للبحث داخل المحفوظات */
export function filterFavorites(query: string, ids: string[]): Dhikr[] {
  const all = getAdhkar("morning").concat(getAdhkar("evening"));
  const unique = all.filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);
  const saved = unique.filter((d) => ids.includes(d.id));
  const q = normalize(query);
  return q ? saved.filter((d) => normalize(`${d.title} ${d.text}`).includes(q)) : saved;
}
