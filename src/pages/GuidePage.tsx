import ContentPage, { Block, RelatedLinks, usePageTitle } from "../components/ContentPage";
import { GUIDE } from "../data/siteContent";

export default function GuidePage() {
  usePageTitle("دليل الاستخدام");
  return (
    <ContentPage
      title="دليل الاستخدام"
      lead="شرح مبسّط لوظائف الموقع وإعداداته، من فتح الصفحة الأولى إلى العمل دون إنترنت."
    >
      {GUIDE.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2
            className="pt-1 text-lg font-bold"
            style={{ color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}
          >
            {group.title}
          </h2>
          {group.steps.map((step, i) => (
            <div key={step.title} className="surface flex gap-3 p-4">
              <span
                aria-hidden
                className="tap shrink-0 tabular-nums"
                style={{ background: "var(--primary-soft)", color: "var(--primary)", width: "2.4rem", height: "2.4rem", fontSize: "0.9rem" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-1 leading-relaxed" style={{ color: "var(--text-soft)" }}>
                  {step.body}
                </p>
                {step.hint && (
                  <p
                    className="mt-2 rounded-lg px-3 py-2 text-sm leading-relaxed"
                    style={{ background: "var(--gold-soft)", color: "var(--text)", border: "1px solid var(--gold)" }}
                  >
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <Block
        title="ما الذي لا يفعله الموقع عمدًا"
        tone="warn"
        items={[
          "لا إعلانات ولا نوافذ منبثقة ولا صوت تلقائي.",
          "لا حسابات ولا جمع بيانات ولا خدمات خارجية مدفوعة.",
          "لا إخفاء لمصدر أو درجة صحة من أجل مظهر أكثر يقينًا.",
          "لا يعمل التذكير بعد إغلاق المتصفح — وهذا مذكور في الأسئلة الشائعة لا مخفي.",
        ]}
      />

      <RelatedLinks
        links={[
          { to: "/faq", label: "الأسئلة الشائعة", note: "إجابات قصيرة عن أبرز الاستفسارات" },
          { to: "/adhkar", label: "فهرس الأذكار", note: "وصول سريع لكل ذكر مع بحث" },
          { to: "/settings", label: "الإعدادات", note: "المظهر، الخطوط، العدّاد، التذكيرات" },
          { to: "/privacy", label: "سياسة الخصوصية", note: "ما الذي يُحفظ فعلًا" },
        ]}
      />
    </ContentPage>
  );
}
