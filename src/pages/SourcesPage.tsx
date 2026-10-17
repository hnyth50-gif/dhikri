import { useState } from "react";
import { DHKAR, unconfirmedNumbers } from "../data/adhkar";
import { usePageTitle } from "../components/ContentPage";
import { BookIcon, ChevronIcon, CloseIcon, CheckIcon } from "../components/Icons";

/**
 * صفحة المراجع وحالة التحقق.
 *
 * الهدف منها الصدق قبل كل شيء: تعرض ما تمّ التحقق منه فعليًا، وما لم يُتحقَّق
 * من رقمه، وما تعارضت فيه أقوال المراجع في درجة الصحة — دون إخفاء ولا تجميل.
 */
export default function SourcesPage() {
  const [filter, setFilter] = useState<"all" | "verified" | "review">("all");
  const unconfirmed = unconfirmedNumbers();
  usePageTitle("المراجع وحالة التحقق");

  const verifiedCount = DHKAR.filter((d) => d.verification === "verified-source").length;
  const reviewCount = DHKAR.length - verifiedCount;

  const list = DHKAR.filter((d) =>
    filter === "all" ? true : filter === "verified" ? d.verification === "verified-source" : d.verification !== "verified-source"
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
        المراجع وحالة التحقق
      </h1>

      <p className="surface p-4 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
        <strong style={{ color: "var(--text)" }}>كيف تُوثّق هذه الأذكار؟</strong>
        <br />
        النصوص القرآنية مأخوذة برسم عثماني من Al Quran Cloud (نسخة quran-uthmani). نصوص
        الأذكار مأخوذة عن «حصن المسلم» كما وردت على موقع sunnah.com، وقد فُتحت كل صفحة
        على حدة ومُراجعت. رقم الحديث في ترقيم المجموعة الأصلية يُعرض فقط إذا فُتحت صفحته
        فعليًا وطابق النص؛ وما دون ذلك يظهر مُوسومًا بأنه لم يُتحقَّق منه بعد.
        <br />
        <strong style={{ color: "var(--text)" }}>لا يُدّعى أن المحتوى موثّق بالكامل.</strong> عند
        اكتشاف تعارض في درجة الصحة بين المراجع، يُعرض الطرفان كما هما دون ترجيح.
      </p>

      <div className="flex flex-wrap gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          الكل ({DHKAR.length})
        </Chip>
        <Chip active={filter === "verified"} onClick={() => setFilter("verified")}>
          تمّ التحقق ({verifiedCount})
        </Chip>
        <Chip active={filter === "review"} onClick={() => setFilter("review")}>
          يحتاج مراجعة ({reviewCount})
        </Chip>
      </div>

      <ul className="space-y-3">
        {list.map((d) => (
          <li key={d.id}>
            <details className="surface p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold" style={{ color: "var(--primary)" }}>
                      {d.title}
                    </h2>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                      {d.time === "both" ? "صباح ومساء" : d.time === "morning" ? "صباح فقط" : "مساء فقط"} · حصن
                      المسلم {d.hisn} · {d.countLabel}
                    </p>
                  </div>
                  <span
                    className="chip shrink-0"
                    style={
                      d.verification === "verified-source"
                        ? { background: "var(--accent-soft)", color: "var(--accent-strong)" }
                        : { background: "var(--gold-soft)", color: "var(--text)", border: "1px solid var(--gold)" }
                    }
                  >
                    {d.verification === "verified-source" ? (
                      <>
                        <CheckIcon width={13} height={13} /> مُتحقَّق
                      </>
                    ) : (
                      <>
                        <CloseIcon width={13} height={13} /> يحتاج مراجعة
                      </>
                    )}
                  </span>
                </div>
                <ChevronIcon
                  width={16}
                  height={16}
                  className="mt-2"
                  style={{ color: "var(--text-faint)", transform: "rotate(90deg)" }}
                />
              </summary>

              <div className="mt-3 space-y-3 text-sm">
                <ul className="space-y-2">
                  {d.sources.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-xl p-3"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      <p className="font-bold">{s.book}</p>
                      {s.hadith && (
                        <p>
                          رقم الحديث: <span className="tabular-nums">{s.hadith}</span>
                          {s.numberingNote && <span style={{ color: "var(--text-faint)" }}> — {s.numberingNote}</span>}
                        </p>
                      )}
                      {!s.hadith && s.numberingNote && <p style={{ color: "var(--text-faint)" }}>{s.numberingNote}</p>}
                      {s.grade && (
                        <p>
                          الدرجة: <span className="font-semibold">{s.grade}</span>
                        </p>
                      )}
                      {s.gradeNote && (
                        <p className="mt-1 rounded-lg p-2 text-xs" style={{ background: "var(--gold-soft)" }}>
                          {s.gradeNote}
                        </p>
                      )}
                      <p className="mt-1">
                        {s.numberVerification === "confirmed" ? (
                          <>
                            <span style={{ color: "var(--accent-strong)" }}>رقم مُتحقَّق منه</span>
                            {s.url && (
                              <>
                                {" · "}
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="underline"
                                  style={{ color: "var(--accent-strong)" }}
                                >
                                  افتح الصفحة وتحقّق
                                </a>
                              </>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--gold)" }}>رقم المجموعة الأصلية لم يُتحقَّق منه بعد</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>

                <div>
                  <h3 className="mb-1 font-bold">ملاحظة التحقق</h3>
                  <p className="leading-relaxed" style={{ color: "var(--text-soft)" }}>
                    {d.verificationNote}
                  </p>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {unconfirmed.length > 0 && (
        <section className="surface p-4">
          <h2 className="mb-2 flex items-center gap-2 font-bold" style={{ color: "var(--primary)" }}>
            <BookIcon width={18} height={18} />
            قائمة المراجعة: أرقام لم تُتحقَّق منها بعد ({unconfirmed.length})
          </h2>
          <p className="mb-3 text-sm" style={{ color: "var(--text-soft)" }}>
            هذه مراجع ذُكرت كما وردت في «حصن المسلم» دون فتح صفحة المجموعة الأصلية للتحقق من
            رقمها في ترقيم دار السلام. تُعرض هنا بصفتها مرجعًا مقتبسًا لا مُتحقَّق منه.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {unconfirmed.map(({ dhikr, source }, i) => (
              <li key={i} className="rounded-xl p-3 text-sm" style={{ background: "var(--surface-2)" }}>
                <span className="font-bold">{dhikr.title}</span>
                <span className="block" style={{ color: "var(--text-soft)" }}>
                  {source.book} — {source.numberingNote}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="chip"
      aria-pressed={active}
      onClick={onClick}
      style={{
        background: active ? "var(--accent)" : "var(--surface-2)",
        color: active ? "var(--on-accent)" : "var(--text-soft)",
        border: "1px solid var(--border)",
        padding: "0.4rem 0.9rem",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
