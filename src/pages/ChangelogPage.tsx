import ContentPage, { RelatedLinks, usePageTitle } from "../components/ContentPage";
import { CHANGELOG, REPO_URL } from "../data/siteContent";

export default function ChangelogPage() {
  usePageTitle("سجل التحديثات");
  return (
    <ContentPage
      title="سجل التحديثات"
      lead="ما أُضيف وأُصلح في الموقع ومتى — دون مبالغة: ما لم يُنفَّذ لا يُكتب هنا."
    >
      <ol className="space-y-4">
        {CHANGELOG.map((entry, idx) => (
          // المفاتيح تحمل الترتيب: عدة إدخالات تحمل التاريخ نفسه (2026-10-17)
          <li key={`${entry.date}-${idx}`} className="surface p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <time
                dateTime={entry.date}
                className="chip tabular-nums"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                dir="ltr"
              >
                {entry.date}
              </time>
              <h2 className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                {entry.title}
              </h2>
            </div>
            <ul className="space-y-2">
              {entry.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                  <span style={{ color: "var(--text-soft)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="surface p-4 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
        التفاصيل التقنية الكاملة (نتائج الاختبارات والأخطاء التي عُولجت) موجودة في ملفات{" "}
        <code dir="ltr">docs/</code> داخل المستودع، وسجلّ العمليات على GitHub يبيّن كل دفعة
        ونشر.{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          style={{ color: "var(--accent-strong)" }}
        >
          افتح المستودع
        </a>
      </p>

      <RelatedLinks
        links={[
          { to: "/about", label: "من نحن", note: "المبادئ التي يُبنى عليها كل تغيير" },
          { to: "/sources", label: "المصادر والتوثيق", note: "حالة توثيق الأذكار" },
          { to: "/contact", label: "تواصل معنا", note: "اقترح تحسينًا" },
        ]}
      />
    </ContentPage>
  );
}
