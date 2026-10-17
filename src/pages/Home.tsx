import { Link } from "react-router-dom";
import { getAdhkar } from "../data/adhkar";
import { useApp } from "../state/AppContext";
import ProgressRing from "../components/ProgressRing";
import { TimeCalendarCard } from "../components/TimeCalendar";
import { BookIcon, ChevronIcon, FlameIcon, HeartIcon, MoonIcon, SunIcon } from "../components/Icons";

export default function Home() {
  const app = useApp();
  const morning = app.sectionProgress("morning");
  const evening = app.sectionProgress("evening");
  const today = new Date();
  const isEvening = today.getHours() >= 15;
  const suggested = isEvening ? "evening" : "morning";
  const totalItems = getAdhkar("morning").length + getAdhkar("evening").length;
  const doneToday = morning.done + evening.done;

  return (
    <div className="space-y-5">
      {/* ترحيب */}
      <section className="surface relative overflow-hidden p-5 sm:p-7">
        <div className="pattern pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full" aria-hidden />
        <div className="relative">
          <p className="mb-1 text-sm font-semibold" style={{ color: "var(--text-faint)" }}>
            {greeting()}
          </p>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl" style={{ color: "var(--primary)" }}>
            أهلًا بك في ذِكري
          </h1>
          <p className="max-w-prose leading-relaxed" style={{ color: "var(--text-soft)" }}>
            ابدأ يومك وينتهي بك ذكرًا لله، مع عدّاد لكل ذكر، ومصدر موثّق لكل نص، وتقدّم تتابعه دون أن تنساه.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <ProgressRing ratio={doneToday / totalItems} label="إنجاز اليوم" size={72} />
            <div>
              <p className="font-bold">
                إنجاز اليوم: <span className="tabular-nums">{doneToday}</span> من{" "}
                <span className="tabular-nums">{totalItems}</span> ذكرًا
              </p>
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                {app.todayActive ? "أحسنت، استمر — لا يُقطع ما بدأته." : "لم تبدأ بعد اليوم. اختر قسمًا بالأسفل."}
              </p>
            </div>
          </div>

          {app.streak > 0 && (
            <p
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"
              style={{ background: "var(--gold-soft)", color: "var(--text)", border: "1px solid var(--gold)" }}
            >
              <FlameIcon width={18} height={18} />
              سلسلتك الحالية: {app.streak} {app.streak === 1 ? "يوم" : app.streak === 2 ? "يومان" : "أيام"}
              <span style={{ color: "var(--text-soft)", fontWeight: 400 }}>
                {" "}— أفضل سلسلة: {app.best}
              </span>
            </p>
          )}
        </div>
      </section>

      {/* بطاقتا الأقسام */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard
          to="/morning"
          icon={<SunIcon width={26} height={26} />}
          title="أذكار الصباح"
          subtitle="بعد صلاة الفجر إلى طلوع الشمس"
          done={morning.done}
          total={morning.total}
          highlight={suggested === "morning"}
        />
        <SectionCard
          to="/evening"
          icon={<MoonIcon width={26} height={26} />}
          title="أذكار المساء"
          subtitle="بعد صلاة العصر إلى غروب الشمس"
          done={evening.done}
          total={evening.total}
          highlight={suggested === "evening"}
        />
      </div>

      {/* اختصارات */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/search?tab=favorites"
          className="surface flex items-center gap-3 p-4 no-underline transition-colors hover:bg-[var(--surface-hover)]"
        >
          <span className="tap" aria-hidden>
            <HeartIcon width={20} height={20} filled={app.progress.favorites.length > 0} />
          </span>
          <span className="flex-1">
            <span className="block font-bold">المفضلة</span>
            <span className="block text-sm" style={{ color: "var(--text-soft)" }}>
              {app.progress.favorites.length === 0
                ? "لا توجد أذكار محفوظة بعد"
                : `${app.progress.favorites.length} ذكرًا محفوظًا`}
            </span>
          </span>
          <ChevronIcon width={16} height={16} style={{ color: "var(--text-faint)" }} />
        </Link>

        <Link
          to="/sources"
          className="surface flex items-center gap-3 p-4 no-underline transition-colors hover:bg-[var(--surface-hover)]"
        >
          <span className="tap" aria-hidden>
            <BookIcon width={20} height={20} />
          </span>
          <span className="flex-1">
            <span className="block font-bold">المراجع وحالة التحقق</span>
            <span className="block text-sm" style={{ color: "var(--text-soft)" }}>
              ما تمّ توثيقه وما يحتاج مراجعة
            </span>
          </span>
          <ChevronIcon width={16} height={16} style={{ color: "var(--text-faint)" }} />
        </Link>
      </div>

      {/* الوقت والتقويم — بطاقة مختصرة تفتح الصفحة الكاملة */}
      <TimeCalendarCard />

      {app.storage.available === false && (
        <p className="badge-review rounded-xl p-3 text-sm font-semibold">
          تنبيه: التخزين المحلي غير متاح في هذا المتصفح، لذا لن يُحفظ تقدّمك بين الجلسات.
        </p>
      )}
    </div>
  );
}

function SectionCard({
  to,
  icon,
  title,
  subtitle,
  done,
  total,
  highlight,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  done: number;
  total: number;
  highlight: boolean;
}) {
  const ratio = total === 0 ? 0 : done / total;
  return (
    <Link
      to={to}
      className="surface group relative flex flex-col gap-3 p-5 no-underline transition-transform hover:-translate-y-0.5"
      style={highlight ? { borderColor: "var(--gold)" } : undefined}
    >
      {highlight && (
        <span className="chip absolute left-4 top-4" style={{ background: "var(--gold-soft)", color: "var(--text)" }}>
          المقترح الآن
        </span>
      )}
      <span
        className="tap"
        aria-hidden
        style={{ background: "var(--primary-soft)", color: "var(--primary)", width: "3.4rem", height: "3.4rem" }}
      >
        {icon}
      </span>
      <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>
        {title}
      </span>
      <span className="text-sm" style={{ color: "var(--text-soft)" }}>
        {subtitle}
      </span>

      <span className="progress-track mt-auto" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={`${title}: ${done} من ${total}`}>
        <span className="progress-fill block" style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="flex items-center justify-between text-sm font-semibold">
        <span className="tabular-nums">
          {done} / {total}
        </span>
        <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-strong)" }}>
          ابدأ القراءة <ChevronIcon width={14} height={14} />
        </span>
      </span>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 4) return "ليلة مباركة";
  if (h < 12) return "صباح الخير";
  if (h < 15) return "نهارك طيب";
  return "مساء الخير";
}
