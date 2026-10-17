import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ContentPage, { Block, RelatedLinks, usePageTitle } from "../components/ContentPage";
import { useToast } from "../components/Toast";
import { getAdhkar, findDhikr } from "../data/adhkar";
import { CONTACT_KINDS, ISSUES_URL, REPO_URL, SITE_URL, type ContactKind } from "../data/siteContent";
import { copyToClipboard } from "../lib/clipboard";

/**
 * صفحة تواصل معنا — وسيلة الإرسال الفعلية مكشوفة لا مُخبَّأة.
 *
 * لا يوجد خادم ولا بريد لهذا الموقع (ولو ادّعينا ذلك لكان كذبًا)، فالنموذج
 * يُركّب نص رسالتك ثم يفتح صفحة «بلاغ جديد» في مستودع GitHub جاهزًا، ويتيح
 * نسخ النص إن لم يتوفر حساب أو تعذّر الفتح.
 */
export default function ContactPage() {
  const toast = useToast();
  const [params] = useSearchParams();

  const prefillDhikr = params.get("dhikr") ?? "";
  const prefillKind = params.get("kind");
  const initialKind: ContactKind = CONTACT_KINDS.some((k) => k.value === prefillKind)
    ? (prefillKind as ContactKind)
    : "text-error";

  const [kind, setKind] = useState<ContactKind>(initialKind);
  const [dhikrId, setDhikrId] = useState(() => (findDhikr(prefillDhikr) ? prefillDhikr : ""));
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");

  usePageTitle("تواصل معنا");

  const kindMeta = CONTACT_KINDS.find((k) => k.value === kind) ?? CONTACT_KINDS[0];
  const dhikr = dhikrId ? findDhikr(dhikrId) : undefined;

  const composed = useMemo(() => {
    const lines = [
      `نوع الرسالة: ${kindMeta.label}`,
      dhikr ? `الذكر المذكور: ${dhikr.title} (${dhikr.id})` : "الذكر المذكور: —",
      "",
      "الرسالة:",
      message.trim(),
      "",
      name.trim() ? `الاسم (اختياري): ${name.trim()}` : "الاسم: —",
      "",
      `أُرسلت من نموذج الموقع ${SITE_URL} بتاريخ ${new Date().toISOString().slice(0, 10)}`,
    ];
    return lines.join("\n");
  }, [kindMeta.label, dhikr, message, name]);

  const issueUrl = useMemo(() => {
    const title = `${kindMeta.label}${dhikr ? ` — ${dhikr.title}` : ""}`;
    return `${ISSUES_URL}/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(composed)}`;
  }, [kindMeta.label, dhikr, composed]);

  const invalid = message.trim().length < 5;

  const openIssue = () => {
    if (invalid) {
      toast.show("اكتب رسالتك أولًا (٥ أحرف على الأقل)", "error");
      document.getElementById("contact-message")?.focus();
      return;
    }
    const win = window.open(issueUrl, "_blank", "noopener,noreferrer");
    if (!win) toast.show("تعذّر فتح نافذة الإرسال — استخدم «انسخ الرسالة»", "error");
    else toast.show("فُتحت صفحة البلاغ جاهزًا — اضغط «Create new issue» لإتمام الإرسال", "success");
  };

  const copyMessage = async () => {
    if (invalid) {
      toast.show("اكتب رسالتك أولًا", "error");
      document.getElementById("contact-message")?.focus();
      return;
    }
    const ok = await copyToClipboard(composed);
    toast.show(ok ? "نُسخت الرسالة — أرسلها بالوسيلة التي تناسبك" : "تعذّر النسخ في هذا المتصفح", ok ? "success" : "error");
  };

  return (
    <ContentPage
      title="تواصل معنا"
      lead="اقتراحات، ملاحظات، تصحيحات شرعية، بلاغات تقنية — مرحّب بها جميعًا. اختر النوع واكتب رسالتك، ثم اختر وسيلة الإرسال."
    >
      {/* سيلة الإرسال الفعلية — تُشرح قبل النموذج لا بعده */}
      <Block
        tone="note"
        title="كيف تصل رسالتك فعلًا؟"
        body="لا يملك الموقع خادمًا ولا بريدًا ولا نموذجًا يخزّن شيئًا. ما يفعله النموذج: يركّب نص رسالتك ويفتح صفحة «بلاغ جديد» في مستودع المشروع على GitHub جاهزًا؛ أنت تضغط «Create new issue» فتُنشر رسالتك كتذكرة عامة يمكن رؤيتها ومتابعتها. إن لم يكن لديك حساب GitHub (أو فُتحت النافذة): اضغط «انسخ الرسالة» وأرسلها بأي وسيلة تملكها. رسالتك لا تمرّ بأي وسيط بيننا وبينك."
      />

      <form
        className="surface space-y-4 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          openIssue();
        }}
      >
        <div>
          <label htmlFor="contact-kind" className="mb-1.5 block text-sm font-bold">
            نوع الرسالة
          </label>
          <select
            id="contact-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ContactKind)}
            className="min-h-11 w-full rounded-xl px-3 outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            {CONTACT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-faint)" }}>
            {kindMeta.hint}
          </p>
        </div>

        <div>
          <label htmlFor="contact-dhikr" className="mb-1.5 block text-sm font-bold">
            الذكر الذي تتعلّقه الرسالة <span style={{ color: "var(--text-faint)" }}>(اختياري)</span>
          </label>
          <select
            id="contact-dhikr"
            value={dhikrId}
            onChange={(e) => setDhikrId(e.target.value)}
            className="min-h-11 w-full rounded-xl px-3 outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            <option value="">— بدون ذكر معيّن —</option>
            <optgroup label="أذكار الصباح">
              {getAdhkar("morning").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="أذكار المساء">
              {getAdhkar("evening").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-bold">
            رسالتك <span aria-hidden style={{ color: "var(--gold)" }}>*</span>
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            minLength={5}
            placeholder="اكتب هنا… مثلاً: في بطاقة «…» رقم الحديث لا يطابق المرجع، والمرجع هو…"
            className="w-full rounded-xl p-3 leading-relaxed outline-none"
            style={{
              background: "var(--surface-2)",
              color: "var(--text)",
              border: `1px solid ${invalid && message.length > 0 ? "var(--gold)" : "var(--border)"}`,
            }}
            aria-invalid={invalid && message.length > 0}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
            {invalid && message.length > 0
              ? "اكتب ٥ أحرف على الأقل حتى تصل الرسالة."
              : "لا تُرسل بياناتك مع الرسالة — فقط ما تكتبه هنا."}
          </p>
        </div>

        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-bold">
            اسمك <span style={{ color: "var(--text-faint)" }}>(اختياري)</span>
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            autoComplete="name"
            className="min-h-11 w-full rounded-xl px-3 outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
        </div>

        {/* معاينة النص الذي سيصل — لئلا يفاجأ المستخدم بما يُنشر */}
        <div>
          <p className="mb-1.5 text-sm font-bold" id="contact-preview-label">
            معاينة ما سيُرسل
          </p>
          <pre
            aria-labelledby="contact-preview-label"
            className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl p-3 text-sm leading-relaxed"
            style={{ background: "var(--surface-2)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
            dir="rtl"
          >
            {composed}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary">
            افتح صفحة الإرسال
          </button>
          <button type="button" className="btn btn-ghost" onClick={copyMessage}>
            انسخ الرسالة
          </button>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ textDecoration: "none" }}
          >
            قائمة البلاغات السابقة
          </a>
        </div>
      </form>

      <Block
        title="ما الذي نعِد به — وما لا نعِد"
        items={[
          "تُقرأ كل رسالة، والتصحيحات الشرعية تُراجَع قبل تغيير أي نص أو إزالة تنبيه.",
          "البلاغات التقنية تُسجَّل في قائمة البلاغات العامة ويمكن متابعتها علنًا.",
          "لا نجمع اسمك ولا بريدك ولا أي بيانات عنك خارج ما تكتبه في الرسالة نفسها.",
          "المشروع بلا فريق ومواعيد لا نضمنها؛ قد يستغرق الرد وقتًا، والقراءة لا تعني الموافقة على كل اقتراح.",
        ]}
      />

      <p className="surface p-4 text-sm" style={{ color: "var(--text-soft)" }}>
        روابط المشروع الرسمي:{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent-strong)" }}>
          المستودع على GitHub
        </a>{" "}
        — توجد فيه أيضًا ملفات التوثيق والاختبارات ويمكن فتح البلاغات مباشرة.
      </p>

      <RelatedLinks
        links={[
          { to: "/sources", label: "المصادر والتوثيق", note: "قبل الإبلاغ عن نص، راجع حالته" },
          { to: "/faq", label: "الأسئلة الشائعة", note: "ربما سؤالك مُجاب فيه" },
          { to: "/privacy", label: "سياسة الخصوصية", note: "ما الذي يُحفظ عندك فعلًا" },
        ]}
      />
    </ContentPage>
  );
}
