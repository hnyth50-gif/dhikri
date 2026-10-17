import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * هيكل مشترك لصفحات المحتوى (من نحن، الأسئلة، الدليل، الخصوصية…).
 *
 * سبب وجوده: توحيد شكل العناوين والمسافات والتذييل، وعدم تكرار نفس
 * الـ markup في عشر صفحات، مع ضبط عنوان تبويب المتصفح آليًا لكل صفحة.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — ذِكري`;
    return () => {
      document.title = "ذِكري — أذكار الصباح والمساء";
    };
  }, [title]);
}

interface Props {
  title: string;
  lead?: string;
  children: ReactNode;
}

export default function ContentPage({ title, lead, children }: Props) {
  usePageTitle(title);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
          {title}
        </h1>
        {lead && (
          <p className="mt-2 max-w-prose leading-relaxed" style={{ color: "var(--text-soft)" }}>
            {lead}
          </p>
        )}
      </header>
      {children}
    </div>
  );
}

/** كتلة نصية داخل صفحة محتوى: عنوان فرعي + فقرة/قائمة */
export function Block({
  title,
  body,
  items,
  tone = "normal",
}: {
  title: string;
  body?: string;
  items?: string[];
  tone?: "normal" | "note" | "warn";
}) {
  const style =
    tone === "note"
      ? { background: "var(--primary-soft)", borderColor: "var(--border)" }
      : tone === "warn"
        ? { background: "var(--gold-soft)", borderColor: "var(--gold)" }
        : undefined;
  return (
    <section className="surface p-4 sm:p-5" style={style}>
      <h2 className="mb-2 text-lg font-bold" style={{ color: "var(--primary)" }}>
        {title}
      </h2>
      {body && <p className="leading-relaxed" style={{ color: "var(--text-soft)" }}>{body}</p>}
      {items && (
        <ul className="mt-2 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 leading-relaxed">
              <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              <span style={{ color: "var(--text-soft)" }}>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** روابط صفحات ذات صلة أسفل المحتوى — نفس نمط بطاقات الرئيسية */
export function RelatedLinks({ links }: { links: Array<{ to: string; label: string; note?: string }> }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label="صفحات ذات صلة" className="surface p-4">
      <p className="mb-3 text-sm font-bold" style={{ color: "var(--text-faint)" }}>
        قد يهمّك أيضًا
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 font-semibold no-underline"
              style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              <span>
                {l.label}
                {l.note && (
                  <span className="block text-xs font-normal" style={{ color: "var(--text-faint)" }}>
                    {l.note}
                  </span>
                )}
              </span>
              <span aria-hidden style={{ color: "var(--text-faint)" }}>
                ‹
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
