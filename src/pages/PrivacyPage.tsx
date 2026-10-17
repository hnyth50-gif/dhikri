import ContentPage, { Block, RelatedLinks, usePageTitle } from "../components/ContentPage";
import { PRIVACY } from "../data/siteContent";

const VERSION_DATE = "2026-10-17";

export default function PrivacyPage() {
  usePageTitle("سياسة الخصوصية");
  return (
    <ContentPage
      title="سياسة الخصوصية"
      lead="هذه الوصفة مبنية على سلوك الموقع الفعلي، لا على نص عام: كل مفتاح ذُكر هنا موجود فعلًا في الكود، وكل ما يُنفي هنا منفَّى فعلًا."
    >
      {PRIVACY.map((s, i) => (
        <Block
          key={s.title}
          title={s.title}
          body={s.body}
          items={s.items}
          tone={i === 0 ? "note" : "normal"}
        />
      ))}

      <p className="surface p-4 text-sm" style={{ color: "var(--text-faint)" }}>
        نسخة هذه السياسة: {VERSION_DATE} — يمكنك رؤيتها أيضًا داخل المستودع في ملف{" "}
        <code dir="ltr">src/data/siteContent.ts</code> وفي صفحة «سجل التحديثات».
      </p>

      <RelatedLinks
        links={[
          { to: "/changelog", label: "سجل التحديثات", note: "التغييرات وتواريخها" },
          { to: "/about", label: "من نحن", note: "الرسالة والمبادئ" },
          { to: "/faq", label: "الأسئلة الشائعة", note: "كيف يُحفظ تقدّمك" },
          { to: "/contact", label: "تواصل معنا", note: "استفسار في الخصوصية" },
        ]}
      />
    </ContentPage>
  );
}
