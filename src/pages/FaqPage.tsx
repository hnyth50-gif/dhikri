import { useMemo, useState } from "react";
import ContentPage, { RelatedLinks, usePageTitle } from "../components/ContentPage";
import { FAQ } from "../data/siteContent";
import { normalize } from "../data/adhkar";
import { CloseIcon, SearchIcon } from "../components/Icons";

export default function FaqPage() {
  usePageTitle("الأسئلة الشائعة");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return FAQ;
    return FAQ.filter((item) => normalize(`${item.q} ${item.a}`).includes(q));
  }, [query]);

  return (
    <ContentPage
      title="الأسئلة الشائعة"
      lead="أجوبة عملية عن استخدام الموقع، والمسبحة، وحفظ التقدّم، والوضع الليلي. إن لم تجد سؤالك فصفحة «تواصل معنا» مفتوحة لك."
    >
      {/* بحث داخل الأسئلة — يعيد استخدام التطبيع نفسه المستعمل في بحث الأذكار */}
      <div className="surface flex items-center gap-2 p-2">
        <SearchIcon width={20} height={20} style={{ color: "var(--text-faint)" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في الأسئلة…"
          aria-label="ابحث في الأسئلة الشائعة"
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

      {list.length === 0 && (
        <p className="surface p-5 text-center" style={{ color: "var(--text-soft)" }}>
          لا يوجد سؤال مطابق لعبارة «{query.trim()}». جرّب كلمة أقصر، أو أرسل سؤالك من{" "}
          <strong>تواصل معنا</strong>.
        </p>
      )}

      <div className="space-y-3">
        {list.map((item) => (
          <details key={item.q} className="surface p-4">
            <summary className="cursor-pointer list-none">
              <span className="flex items-start justify-between gap-3">
                <span className="font-bold" style={{ color: "var(--primary)" }}>
                  {item.q}
                </span>
                <span aria-hidden className="mt-1 shrink-0 text-xs font-bold" style={{ color: "var(--text-faint)" }}>
                  ▾
                </span>
              </span>
            </summary>
            <p className="mt-3 leading-relaxed" style={{ color: "var(--text-soft)" }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <RelatedLinks
        links={[
          { to: "/guide", label: "دليل الاستخدام", note: "شرح مبسّط لكل وظيفة خطوة بخطوة" },
          { to: "/tasbih", label: "المسبحة الإلكترونية", note: "عدّاد مستقل بهدف اختياري" },
          { to: "/wird", label: "وردي اليوم", note: "متابعة صباحك ومسائك" },
          { to: "/contact", label: "تواصل معنا", note: "سؤال آخر؟ أرسله" },
        ]}
      />
    </ContentPage>
  );
}
