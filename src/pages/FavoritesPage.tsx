import { Link } from "react-router-dom";
import ContentPage, { RelatedLinks, usePageTitle } from "../components/ContentPage";
import { HeartIcon } from "../components/Icons";
import { useToast } from "../components/Toast";
import { findDhikr } from "../data/adhkar";
import type { Dhikr } from "../data/types";
import { useApp } from "../state/AppContext";

/** المسار الذي يعيد القارئ إلى موضع هذا الذكر الأصلي في قسمه */
function homeLinks(dhikr: Dhikr): Array<{ to: string; label: string }> {
  if (dhikr.time === "evening") return [{ to: `/evening?focus=${dhikr.id}`, label: "عُد إلى موضعه في أذكار المساء" }];
  if (dhikr.time === "morning") return [{ to: `/morning?focus=${dhikr.id}`, label: "عُد إلى موضعه في أذكار الصباح" }];
  return [
    { to: `/morning?focus=${dhikr.id}`, label: "عُد إلى موضعه في الصباح" },
    { to: `/evening?focus=${dhikr.id}`, label: "عُد إلى موضعه في المساء" },
  ];
}

export default function FavoritesPage() {
  const app = useApp();
  const toast = useToast();
  usePageTitle("المفضلة");

  // نعرض الأحدث إضافة أولًا: آخر ما أُضيف يظهر في رأس القائمة
  const items = app.progress.favorites
    .slice()
    .reverse()
    .map((id) => findDhikr(id))
    .filter((d): d is Dhikr => Boolean(d));

  return (
    <ContentPage
      title="المفضلة"
      lead="كل ما حفظته من الأذكار في مكان واحد: أزله من المفضلة بضغطة، أو عُد به إلى موضعه الأصلي في قسمه لتكمل القراءة من هناك."
    >
      <p className="surface p-4 text-sm" style={{ color: "var(--text-soft)" }}>
        تُحفظ المفضلة على جهازك وحده في مفتاح{" "}
        <code dir="ltr">dhikri:progress:v1</code>، وتظهر أيضًا في تبويب «المفضلة» داخل{" "}
        <Link to="/search?tab=favorites" className="underline" style={{ color: "var(--accent-strong)" }}>
          صفحة البحث
        </Link>{" "}
        إن أردت تصفية الصباح والمساء منها.
      </p>

      {items.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 p-8 text-center">
          <span aria-hidden style={{ color: "var(--text-faint)" }}>
            <HeartIcon width={36} height={36} />
          </span>
          <p className="font-bold" style={{ color: "var(--primary)" }}>
            لا توجد أذكار محفوظة بعد
          </p>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            اضغط رمز القلب في أي بطاقة ذكر لتظهر هنا.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/morning" className="btn btn-primary" style={{ textDecoration: "none" }}>
              أذكار الصباح
            </Link>
            <Link to="/adhkar" className="btn btn-ghost" style={{ textDecoration: "none" }}>
              فهرس الأذكار
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold" style={{ color: "var(--text-faint)" }}>
            <span className="tabular-nums">{items.length}</span> ذكرًا محفوظًا
          </p>

          <ul className="space-y-3">
            {items.map((dhikr) => (
              <li key={dhikr.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold" style={{ color: "var(--primary)" }}>
                      {dhikr.title}
                    </h2>
                    <p
                      className="mt-1 line-clamp-2 text-sm leading-relaxed"
                      style={{ color: "var(--text-soft)" }}
                      dir="rtl"
                    >
                      {dhikr.text}
                    </p>
                    <p className="mt-1.5 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
                      عدد المصدر: {dhikr.eveningCountLabel ?? dhikr.countLabel}
                      {dhikr.verification === "needs-review" && (
                        <span className="badge-review mr-2">يحتاج مراجعة</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="tap shrink-0"
                    aria-label={`أزيل «${dhikr.title}» من المفضلة`}
                    title="إزالة من المفضلة"
                    onClick={() => {
                      app.toggleFavorite(dhikr.id);
                      toast.show(`أُزيل «${dhikr.title}» من المفضلة`, "info");
                    }}
                  >
                    <HeartIcon width={20} height={20} filled />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {homeLinks(dhikr).map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="btn btn-primary"
                      style={{ minHeight: "2.4rem", fontSize: "0.85rem", textDecoration: "none" }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <RelatedLinks
        links={[
          { to: "/adhkar", label: "فهرس الأذكار", note: "تصفّح كل الأذكار للوصول إليها" },
          { to: "/wird", label: "وردي اليوم", note: "متابعة إنجاز اليوم كاملًا" },
          { to: "/search?tab=favorites", label: "المفضلة في البحث", note: "مع تصفية الصباح والمساء" },
        ]}
      />
    </ContentPage>
  );
}
