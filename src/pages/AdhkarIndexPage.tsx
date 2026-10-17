import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ContentPage, { RelatedLinks, usePageTitle } from "../components/ContentPage";
import { CloseIcon, HeartIcon, SearchIcon } from "../components/Icons";
import { DHKAR, reviewQueue, searchAdhkar } from "../data/adhkar";
import type { Dhikr, DhikrKind, DhikrTime } from "../data/types";
import { useApp } from "../state/AppContext";

const TIME_LABEL: Record<DhikrTime, string> = {
  morning: "صباح",
  evening: "مساء",
  both: "الصباح والمساء",
};

const KIND_LABEL: Record<DhikrKind, string> = {
  quran: "قرآن",
  hadith: "حديث",
  adhkar: "ذكر",
};

/** أول قسم يحوي هذا الذكر — إليه يقود رابط الفهرس */
function homePath(dhikr: Dhikr): string {
  return dhikr.time === "evening" ? `/evening?focus=${dhikr.id}` : `/morning?focus=${dhikr.id}`;
}

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" | "warn" }) {
  const style =
    tone === "primary"
      ? { background: "var(--primary-soft)", color: "var(--primary)" }
      : tone === "warn"
        ? { background: "var(--gold-soft)", color: "var(--text)", border: "1px solid var(--gold)" }
        : { background: "var(--surface-2)", color: "var(--text-faint)", border: "1px solid var(--border)" };
  return (
    <span className="chip" style={style}>
      {children}
    </span>
  );
}

/**
 * فهرس الأذكار: قائمة منظّمة لكل الأذكار مع بحث فوري وزر يفتح أي ذكر
 * في موضعه الصحيح. البيانات نفس `DHKAR` — لا نسخة ثانية ولا قائمة متداخلة.
 */
export default function AdhkarIndexPage() {
  const app = useApp();
  const [query, setQuery] = useState("");
  usePageTitle("فهرس الأذكار");

  const q = query.trim();
  const list = useMemo(() => (q ? searchAdhkar(q) : DHKAR), [q]);

  const reviewCount = useMemo(() => reviewQueue().length, []);

  return (
    <ContentPage
      title="فهرس الأذكار"
      lead="كل الأذكار في قائمة واحدة مرتبة كما في المصدر: عنوانها، وعدد تكرارها، ووقتها، وحالة توثيقها. ابحث أو انقر للوصول السريع إلى بطاقة الذكر."
    >
      {/* بحث فوري — نفس دالة البحث في صفحة البحث، بلا منطق مكرر */}
      <div className="surface flex items-center gap-2 p-2">
        <SearchIcon width={20} height={20} style={{ color: "var(--text-faint)" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن ذكر أو كلمة من نصه…"
          aria-label="ابحث في فهرس الأذكار"
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

      <p className="text-sm font-semibold" style={{ color: "var(--text-faint)" }}>
        {q ? (
          <>
            <span className="tabular-nums">{list.length}</span> نتيجة لـ «{q}» (البحث يتجاهل التشكيل)
          </>
        ) : (
          <>
            <span className="tabular-nums">{DHKAR.length}</span> ذكرًا — منها{" "}
            <span className="tabular-nums">{reviewCount}</span> تحتاج مراجعة، وباقي أرقامها موسومة في{" "}
            <Link to="/sources" className="underline" style={{ color: "var(--accent-strong)" }}>
              صفحة المصادر
            </Link>
            .
          </>
        )}
      </p>

      {list.length === 0 && (
        <div className="surface p-6 text-center">
          <p className="font-bold" style={{ color: "var(--primary)" }}>
            لا نتائج مطابقة
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
            جرّب كلمة أقصر أو بلا تشكيل (مثل «كتاب» بدل «كِتَاب»).
          </p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => setQuery("")}>
            امسح البحث
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {list.map((dhikr) => {
          const fav = app.isFavorite(dhikr.id);
          const c = app.countOf(dhikr);
          return (
            <li key={dhikr.id} className="surface flex items-start gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <Link
                  to={homePath(dhikr)}
                  className="font-bold no-underline"
                  style={{ color: "var(--primary)" }}
                >
                  {dhikr.title}
                </Link>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Chip>{TIME_LABEL[dhikr.time]}</Chip>
                  <Chip>{KIND_LABEL[dhikr.kind]}</Chip>
                  <Chip tone="primary">{dhikr.eveningCountLabel ?? dhikr.countLabel}</Chip>
                  {dhikr.verification === "needs-review" && <Chip tone="warn">يحتاج مراجعة</Chip>}
                  {c.done && <Chip tone="primary">أُنجز اليوم</Chip>}
                </div>
              </div>

              <button
                type="button"
                className="tap shrink-0"
                aria-label={fav ? `أزيل «${dhikr.title}» من المفضلة` : `أضف «${dhikr.title}» إلى المفضلة`}
                aria-pressed={fav}
                onClick={() => app.toggleFavorite(dhikr.id)}
              >
                <HeartIcon width={20} height={20} filled={fav} />
              </button>
            </li>
          );
        })}
      </ol>

      <RelatedLinks
        links={[
          { to: "/morning", label: "أذكار الصباح", note: "القراءة الكاملة ببطاقاتها" },
          { to: "/evening", label: "أذكار المساء", note: "القراءة الكاملة ببطاقاتها" },
          { to: "/search", label: "البحث والمفضلة", note: "بحث متقدّم مع تصفية" },
          { to: "/favorites", label: "المفضلة", note: "ما حفظته في مكان واحد" },
        ]}
      />
    </ContentPage>
  );
}
