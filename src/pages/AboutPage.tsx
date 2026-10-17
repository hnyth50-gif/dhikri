import ContentPage, { Block, RelatedLinks, usePageTitle } from "../components/ContentPage";
import { ABOUT } from "../data/siteContent";

export default function AboutPage() {
  usePageTitle("من نحن");
  return (
    <ContentPage title="من نحن" lead={ABOUT.intro}>
      {ABOUT.sections.map((s) => (
        <Block key={s.title} title={s.title} body={s.body} items={s.items} />
      ))}
      <RelatedLinks
        links={[
          { to: "/sources", label: "المصادر والتوثيق", note: "كيف نوثّق النصوص وما لم يُتحقَّق منه" },
          { to: "/faq", label: "الأسئلة الشائعة", note: "الحفظ، العدّاد، الوضع الليلي…" },
          { to: "/privacy", label: "سياسة الخصوصية", note: "ما يُحفظ وما لا يخرج من جهازك" },
          { to: "/contact", label: "تواصل معنا", note: "تصحيحات واقتراحات وبلاغات" },
        ]}
      />
    </ContentPage>
  );
}
