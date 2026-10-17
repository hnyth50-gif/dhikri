import { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";
import { CloseIcon, InstallIcon } from "./Icons";
import {
  SHOW_DELAY_MS,
  type BeforeInstallPromptEvent,
  isIosSafari,
  isStandalone,
  mayShow,
  writeInstallChoice,
} from "../lib/installPrompt";

/**
 * تنبيه «ثبّت ذِكري» — ورقة سفلية صغيرة غير حاجبة للقراءة.
 *
 * قواعد عدم الإزعاج المطبّقة فعليًا (لا مجرد نية):
 *  - لا يظهر إلا إذا كان التثبيت ممكنًا: حدث beforeinstallprompt حقيقي
 *    (كروم/أندرويد) أو Safari على iOS — وفي غير ذلك لا يظهر أصلًا.
 *  - يتأخر ‎4 ثوانٍ بعد التحميل ولا يظهر إن كان الموقع مثبَّتًا أصلًا.
 *  - «لاحقًا» يُبعده سبعة أيام، و«لا، شكرًا» لا يُعيده أبدًا، والإغلاق
 *    (زر ✕ أو ESC) يُعامل معاملة «لاحقًا» — لا يعود الإزعاج في نفس الجلسة
 *    ولا في التحميل التالي.
 *  - لا يسرق التركيز (بلا autofocus ولا حبس للتركيز): الصفحة تبقى
 *    قابلة للاستخدام أثناء ظهوره.
 *  - اختيارك يُحفظ محليًا على جهازك فقط (dhikri:install-prompt:v1).
 *
 * وسم `data-install-prompt` على عنصر الجذر: مؤشر تشخيصي يُقرأ في
 * الاختبار الحيّ والوحدة التحكم ليُعرف أي مسار كان فعّالًا.
 */
type Variant = "chromium" | "ios";

export default function InstallPrompt() {
  const toast = useToast();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [visible, setVisible] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (isStandalone()) return; // مثبَّت كتطبيق أصلًا — لا داعي للتنبيه إطلاقًا

    let timer = 0;
    let pending: Variant | null = null;

    /* نظهر فقط حين يكون التبويب مرئيًا؛ وإن كان مخفيًا عند حلول المهلة
       ننتظر عودة المستخدم إليه (visibilitychange) — فلا يفوته ولا يفاجئه */
    const tryShow = () => {
      if (!pending || shownRef.current || !mayShow() || document.visibilityState !== "visible") return;
      shownRef.current = true;
      setVariant(pending);
      setVisible(true);
    };

    /* تأخير واحد مشترك: التنبيه يظهر بعد استقرار الصفحة لا في لحظة الوصول */
    const schedule = (v: Variant) => {
      pending = v;
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        tryShow();
      }, SHOW_DELAY_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryShow();
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // نمنع شريط المتصفح الافتراضي ونعرض تنبيهنا بدلًا منه
      deferredRef.current = e as BeforeInstallPromptEvent;
      document.documentElement.setAttribute("data-install-prompt", "chromium");
      schedule("chromium");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    document.addEventListener("visibilitychange", onVisibility);
    if (isIosSafari()) {
      document.documentElement.setAttribute("data-install-prompt", "ios");
      schedule("ios");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
    };
  }, []);

  /* ESC يُغلق التنبيه ويُعامل معاملة «لاحقًا» (مُسجّل اختيارًا لا إهمالًا) */
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideWith("later");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const hideWith = (choice: "later" | "no" | "done") => {
    writeInstallChoice(choice);
    setVisible(false);
  };

  /** «ثبّت الآن»: نخفي فورًا (لا انتظار لنافذة النظام) ونستدعي التثبيت الأصلي */
  const install = () => {
    const ev = deferredRef.current;
    deferredRef.current = null;
    hideWith("later"); // إن عُرضت نافذة النظام فرُفضت، يبقى «لاحقًا» محفوظًا
    try {
      ev?.prompt();
      ev?.userChoice?.then((res) => {
        if (res.outcome === "accepted") {
          writeInstallChoice("done");
          toast.show("تم تثبيت ذِكري — ستجده ضمن تطبيقاتك", "success");
        }
      })?.catch(() => {
        /* نافذة النظام أُغلقت — «لاحقًا» يكفي */
      });
    } catch {
      /* المتصفح رفض عرض نافذة التثبيت — نكتفي بما هو محفوظ */
    }
  };

  if (!visible || !variant) return null;

  const ios = variant === "ios";

  return (
    <div
      className="no-print fixed inset-x-0 bottom-24 z-40 flex justify-center px-3"
      role="dialog"
      aria-modal="false"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-desc"
    >
      <div className="surface w-full max-w-md p-4 shadow-lg" style={{ borderColor: "var(--border-strong)" }}>
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
            aria-hidden
          >
            <InstallIcon width={20} height={20} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="install-prompt-title" className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {ios ? "أضِف ذِكري إلى شاشتك الرئيسية" : "هل تريد تثبيت ذِكري على جهازك؟"}
            </h2>
            <p id="install-prompt-desc" className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>
              {ios
                ? "افتح زر المشاركة في شريط أدوات Safari (المربّع والسهم)، ثم اختر «إضافة إلى الشاشة الرئيسية» من القائمة — يفتح بعدها كتطبيق مستقل."
                : "مجاني ويأخذ مساحة صغيرة على جهازك — يفتح أسرع، ويعمل دون اتصال بعد أول زيارة."}
            </p>
          </div>

          <button
            type="button"
            className="tap shrink-0"
            aria-label="إغلاق تنبيه التثبيت"
            onClick={() => hideWith("later")}
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!ios && (
            <button type="button" className="btn btn-primary" onClick={install}>
              <InstallIcon width={16} height={16} />
              ثبّت الآن
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => hideWith("later")}>
            {ios ? "تمام" : "لاحقًا"}
          </button>
          {!ios && (
            <button type="button" className="btn btn-ghost" onClick={() => hideWith("no")}>
              لا، شكرًا
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
