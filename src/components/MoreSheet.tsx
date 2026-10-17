import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { CloseIcon } from "./Icons";

/**
 * قائمة «المزيد»: تجمع الصفحات الثانوية حتى يبقى شريط التنقل السفلي
 * على خمسة أصناف فقط (الرئيسية، الصباح، المساء، البحث، المزيد).
 *
 * نفس البيانات تُستعمل في التذييل، فلا تُكرَّر أسماء الصفحات في موضعين.
 */
export interface MoreGroup {
  title: string;
  items: Array<{ to: string; label: string; note?: string }>;
}

export const MORE_GROUPS: MoreGroup[] = [
  {
    title: "متابعة يومية",
    items: [
      { to: "/wird", label: "وردي اليوم", note: "تقدّم الصباح والمساء في نظرة" },
      { to: "/tasbih", label: "المسبحة الإلكترونية", note: "عدّاد مستقل بهدف اختياري" },
      { to: "/favorites", label: "المفضلة", note: "الأذكار المحفوظة والعودة لموضعها" },
      { to: "/adhkar", label: "فهرس الأذكار", note: "قائمة كل الأذكار مع بحث" },
    ],
  },
  {
    title: "المحتوى والثقة",
    items: [
      { to: "/sources", label: "المصادر والتوثيق", note: "حالة توثيق كل نص ومرجعه" },
      { to: "/about", label: "من نحن", note: "الرسالة والأهداف والمبادئ" },
      { to: "/guide", label: "دليل الاستخدام", note: "شرح الوظائف خطوة بخطوة" },
      { to: "/faq", label: "الأسئلة الشائعة", note: "أجوبة قصيرة شائعة" },
    ],
  },
  {
    title: "الموقع",
    items: [
      { to: "/contact", label: "تواصل معنا", note: "تصحيحات، اقتراحات، بلاغات" },
      { to: "/privacy", label: "سياسة الخصوصية", note: "ما يُحفظ وما لا يخرج من جهازك" },
      { to: "/changelog", label: "سجل التحديثات", note: "ما أُضيف وأُصلح ومتى" },
      { to: "/settings", label: "الإعدادات", note: "المظهر، الخطوط، التذكيرات" },
    ],
  },
];

export const SECONDARY_PATHS = MORE_GROUPS.flatMap((g) => g.items.map((i) => i.to));

interface Props {
  open: boolean;
  onClose: () => void;
  /** الزر الذي فتح القائمة — نُعيده إليه بعد الإغلاق ليبقى ترتيب التركيز مفهومًا */
  triggerRef: React.RefObject<HTMLElement | null>;
}

/** ورقة «المزيد»: حوار مودال بحصر التركيز وإغلاق بـEscape مع تصفير التمرير في الخلفية */
export default function MoreSheet({ open, onClose, triggerRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // نمنع تمرير الصفحة خلف الحوار، ونعيده إلى ما كان
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ background: "rgba(16, 32, 26, 0.55)" }}>
      {/* النقر على الخلفية يُغلق — وليست عنصرًا قابلًا للتركيز حتى لا يدخل في حصر Tab */}
      <div className="absolute inset-0 cursor-default" aria-hidden onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        tabIndex={-1}
        className="relative z-10 max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-4 outline-none sm:rounded-3xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="more-sheet-title" className="text-lg font-bold" style={{ color: "var(--primary)" }}>
            المزيد من صفحات ذِكري
          </h2>
          <button type="button" className="tap" aria-label="أغلق قائمة المزيد" onClick={onClose}>
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        {MORE_GROUPS.map((group) => (
          <section key={group.title} className="mb-4 last:mb-0">
            <h3 className="mb-1.5 text-sm font-bold" style={{ color: "var(--text-faint)" }}>
              {group.title}
            </h3>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className="flex flex-col rounded-xl px-3 py-2.5 no-underline"
                    style={({ isActive }) => ({
                      background: isActive ? "var(--primary-soft)" : "var(--surface-2)",
                      border: "1px solid var(--border)",
                    })}
                  >
                    <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                      {item.label}
                    </span>
                    {item.note && (
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                        {item.note}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-2 text-center text-xs" style={{ color: "var(--text-faint)" }}>
          ضغط Escape يغلق هذه القائمة.
        </p>
      </div>
    </div>
  );
}
