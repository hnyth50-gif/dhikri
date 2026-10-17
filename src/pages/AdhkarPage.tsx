import { useEffect } from "react";
import { SECTIONS, findDhikr } from "../data/adhkar";
import { useApp } from "../state/AppContext";
import DhikrCard from "../components/DhikrCard";
import ProgressRing from "../components/ProgressRing";
import { MinusIcon, PlusIcon, SettingsIcon } from "../components/Icons";
import { Link, useSearchParams } from "react-router-dom";

interface Props {
  section: "morning" | "evening";
}

export default function AdhkarPage({ section }: Props) {
  const app = useApp();
  const data = SECTIONS[section];
  const progress = app.sectionProgress(section);
  const [params] = useSearchParams();
  const focus = params.get("focus");

  useEffect(() => {
    document.title = `${data.title} — ذِكري`;
    return () => {
      document.title = "ذِكري — أذكار الصباح والمساء";
    };
  }, [data.title]);

  /**
   * دعم روابط «عد إلى موضعه»: لو فتحت الصفحة بـ `?focus=id` نُمرّ على
   * البطاقة وننقل التركيز إليها. لا نفعل شيئًا إن لم يكن الذكر في هذا
   * القسم (روابط المفضلة تشير إلى القسم الصحيح دائمًا).
   */
  useEffect(() => {
    if (!focus) return;
    const dhikr = findDhikr(focus);
    if (!dhikr) return;
    const inSection = (section === "morning" ? ["morning", "both"] : ["evening", "both"]).includes(dhikr.time);
    if (!inSection) return;

    const el = document.getElementById(`dhikr-${focus}`);
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    // إطار إشارة مؤقّت لا يعتمد على الحركة — يوضّح أي بطاقة فُتحت منها
    el.style.outline = "3px solid var(--ring)";
    el.style.outlineOffset = "4px";
    const t = window.setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    }, 2600);
    return () => window.clearTimeout(t);
  }, [focus, section]);

  return (
    <div className="space-y-4">
      {/* ترويسة القسم */}
      <section className="surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
              {data.title}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
              {data.subtitle}
            </p>
            <p className="mt-1 text-sm font-semibold">
              أُنجز: <span className="tabular-nums">{progress.done}</span> من{" "}
              <span className="tabular-nums">{progress.total}</span> ذكرًا
            </p>
          </div>
          <ProgressRing ratio={progress.ratio} label={`إنجاز ${data.title}`} size={76} />
        </div>

        <div className="progress-track mt-4" role="presentation">
          <div className="progress-fill" style={{ width: `${progress.ratio * 100}%` }} />
        </div>
      </section>

      {/* تحكّم حجم الخط — سريع وواضح، ودونه يمكن الوصول من الإعدادات */}
      <div
        className="no-print surface sticky top-2 z-30 flex items-center gap-2 p-2"
        role="group"
        aria-label="حجم الخط"
      >
        <span className="px-2 text-sm font-semibold" style={{ color: "var(--text-soft)" }}>
          حجم الخط
        </span>
        <button
          type="button"
          className="tap"
          aria-label="صغّر الخط"
          disabled={app.settings.fontScale <= 1}
          onClick={() => app.updateSettings({ fontScale: (app.settings.fontScale - 1) as never })}
          style={{ opacity: app.settings.fontScale <= 1 ? 0.45 : 1 }}
        >
          <MinusIcon width={20} height={20} />
        </button>
        <span className="min-w-[3ch] text-center font-bold tabular-nums" aria-live="polite">
          {app.settings.fontScale}
        </span>
        <button
          type="button"
          className="tap"
          aria-label="كبّر الخط"
          disabled={app.settings.fontScale >= 5}
          onClick={() => app.updateSettings({ fontScale: (app.settings.fontScale + 1) as never })}
          style={{ opacity: app.settings.fontScale >= 5 ? 0.45 : 1 }}
        >
          <PlusIcon width={20} height={20} />
        </button>
        <Link
          to="/settings"
          className="tap mr-auto"
          aria-label="كل خيارات الإعدادات"
          title="الإعدادات"
        >
          <SettingsIcon width={20} height={20} />
        </Link>
      </div>

      {/* بطاقات الأذكار */}
      <div className="space-y-4">
        {data.items.map((dhikr, i) => (
          <div key={dhikr.id}>
            <p className="mb-1.5 px-1 text-xs font-bold tabular-nums" style={{ color: "var(--text-faint)" }}>
              {i + 1} / {data.items.length}
            </p>
            <DhikrCard dhikr={dhikr} section={section} />
          </div>
        ))}
      </div>

      {/* لا نقول للقارئ إنه أتمّ ما لم يُتمّه — يظهر فقط عند اكتمال القسم */}
      {progress.total > 0 && progress.done >= progress.total && (
        <p className="pb-4 text-center text-sm font-bold" style={{ color: "var(--accent-strong)" }}>
          تمّت قراءة الأذكار كلها — تقبّل الله منك.
        </p>
      )}
    </div>
  );
}
