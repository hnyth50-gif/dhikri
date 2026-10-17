import { useMemo, useState } from "react";
import ContentPage, { Block, RelatedLinks } from "../components/ContentPage";
import { TimeCalendarCard, useNow, useSavedCity } from "../components/TimeCalendar";
import { useToast } from "../components/Toast";
import { normalize } from "../data/adhkar";
import { CITIES, type City } from "../data/cities";
import { formatClock, gregorianDate, hijriDate, localZone, UTC_NOTE, zonedInfo } from "../lib/time";
import { useApp } from "../state/AppContext";

/**
 * صفحة «الوقت والتقويم»: التاريخان (ميلادي وهجري)، الساعة المحلية بنظامي
 * 12 و24، التوقيت العالمي UTC، وتوقيت مدينة يختارها المستخدم من قائمة IANA.
 *
 * الالتزامات:
 * - كل الحساب محلي عبر Intl — لا خدمة خارجية، ويعمل دون إنترنت.
 * - تنسيق الساعة والمدينة يُحفظان في إعدادات الموقع نفسها (dhikri:settings:v1).
 * - لا مؤقّت مخفي: مؤقّت واحد ينظّف عند مغادرة الصفحة (من useNow).
 * - التاريخ الهجري حسابي ويُذكر أنه قد يخالف التاريخ الرسمي المعتمد على الرؤية.
 */
export default function TimeCalendarPage() {
  const now = useNow();
  const app = useApp();
  const toast = useToast();
  const hour12 = app.settings.timeFormat === "12";
  const { cityId, zone } = useSavedCity();
  const [query, setQuery] = useState("");

  const deviceZone = localZone();
  const g = gregorianDate(now);
  const h = hijriDate(now);
  const utc = zonedInfo(now, "UTC", hour12);
  const city = cityId ? CITIES.find((c) => c.id === cityId) : undefined;
  const cityInfo = city ? zonedInfo(now, zone, hour12) : null;

  /* تصفية المدن بالعربية (بلا تشكيل) أو بالدولة أو بمعرّف المنطقة */
  const results = useMemo(() => {
    const raw = query.trim();
    const q = normalize(raw);
    if (!q) return CITIES.slice(0, 10);
    const lower = raw.toLowerCase();
    return CITIES.filter(
      (c) => normalize(c.name).includes(q) || normalize(c.country).includes(q) || c.zone.toLowerCase().includes(lower)
    ).slice(0, 12);
  }, [query]);

  const pick = (c: City) => {
    app.updateSettings({ homeCity: c.id });
    setQuery("");
    toast.show(`حُفظت «${c.name}» — توقيتها الحالي ${formatClock(new Date(), hour12, false, c.zone)}`, "success");
  };

  const useDevice = () => {
    app.updateSettings({ homeCity: "" });
    setQuery("");
    toast.show("يُعتمد توقيت جهازك الآن بلا مدينة محفوظة", "info");
  };

  const setFormat = (f: "12" | "24") => {
    if (app.settings.timeFormat === f) return;
    app.updateSettings({ timeFormat: f });
    toast.show(f === "24" ? "الساعة الآن بنظام 24 ساعة" : "الساعة الآن بنظام 12 ساعة", "info");
  };

  return (
    <ContentPage
      title="الوقت والتقويم"
      lead="تاريخا اليوم بالميلادي والهجري، الساعة المحلية بالثواني، التوقيت العالمي UTC، وتوقيت مدينة تختارها — كلها محسوبة داخل متصفحك وتعمل دون إنترنت."
    >
      {/* التاريخان */}
      <section className="surface p-4 sm:p-5" aria-labelledby="tc-dates">
        <h2 id="tc-dates" className="mb-3 text-lg font-bold" style={{ color: "var(--primary)" }}>
          التاريخان
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--text-faint)" }}>
              التاريخ الميلادي
            </p>
            <p className="mt-1 text-lg font-bold">
              <time dateTime={g.iso}>{g.text}</time>
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--text-faint)" }}>
              التاريخ الهجري
            </p>
            {h.supported ? (
              <p className="mt-1 text-lg font-bold">{h.text}</p>
            ) : (
              <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
                لا يدعم متصفحك التقويم الهجري، فيُعرض الميلادي فقط.
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
          الهجري المعروض هنا <strong style={{ color: "var(--text)" }}>حسابي</strong> بتقويم أم القرى عبر متصفحك،{" "}
          <strong style={{ color: "var(--text)" }}>وقد يختلف بيوم</strong> عن التاريخ الهجري الرسمي المعتمد في بلدك على رؤية الهلال؛ فلتوزن الأمرين قبل الاعتماد.
        </p>
      </section>

      {/* الساعة المحلية */}
      <section className="surface p-4 sm:p-5" aria-labelledby="tc-clock">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="tc-clock" className="text-lg font-bold" style={{ color: "var(--primary)" }}>
            الساعة المحلية
          </h2>
          <div className="flex gap-1.5" role="group" aria-label="نظام الساعة">
            {(["24", "12"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className="chip"
                aria-pressed={app.settings.timeFormat === f}
                onClick={() => setFormat(f)}
                style={{
                  background: app.settings.timeFormat === f ? "var(--accent)" : "var(--surface-2)",
                  color: app.settings.timeFormat === f ? "var(--on-accent)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {f === "24" ? "24 ساعة" : "12 ساعة"}
              </button>
            ))}
          </div>
        </div>

        <p className="text-4xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
          <time dateTime={now.toISOString()}>{formatClock(now, hour12)}</time>
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
          {g.text}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
          ساعة جهازك — المنطقة الزمنية: <span dir="ltr">{deviceZone}</span>، ولا يستطيع الموقع تغييرها.
        </p>
      </section>

      {/* UTC */}
      <section className="surface p-4 sm:p-5" aria-labelledby="tc-utc">
        <h2 id="tc-utc" className="mb-2 text-lg font-bold" style={{ color: "var(--primary)" }}>
          التوقيت العالمي UTC
        </h2>
        <p className="text-3xl font-bold tabular-nums" dir="ltr" style={{ color: "var(--text)" }}>
          {utc.time}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
          فرقه عن مرجع التوقيت العالمي: <span dir="ltr">{utc.offset}</span> (ثابت طوال السنة).
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
          {UTC_NOTE}
        </p>
      </section>

      {/* المدينة */}
      <section className="surface p-4 sm:p-5" aria-labelledby="tc-city">
        <h2 id="tc-city" className="mb-2 text-lg font-bold" style={{ color: "var(--primary)" }}>
          توقيت مدينة تختارها
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--text-soft)" }}>
          اختر مدينة لتظهر في بطاقتك الرئيسية مع ساعات فارقها، وتُحفظ اختيارك على جهازك وحده ولا يتغيّر توقيت جهازك بفعلها.
        </p>

        {city && cityInfo ? (
          <div
            className="mb-3 rounded-xl p-3"
            style={{ background: "var(--primary-soft)", border: "1px solid var(--border)" }}
            aria-live="polite"
          >
            <p className="font-bold" style={{ color: "var(--primary)" }}>
              {city.name} — {city.country}
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
              {cityInfo.time}
            </p>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              {cityInfo.date} — الفرق عن UTC: <span dir="ltr">{cityInfo.offset}</span>
            </p>
          </div>
        ) : (
          <p
            className="mb-3 rounded-xl p-3 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
          >
            لا توجد مدينة محفوظة — يُعرض توقيت جهازك. اختر مدينة من القائمة أدناه لتضيفها.
          </p>
        )}

        <label htmlFor="tc-city-search" className="mb-1 block text-sm font-bold">
          ابحث عن مدينة أو دولة
        </label>
        <input
          id="tc-city-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثال: طرابلس، الرياض، لندن"
          className="mb-2 min-h-11 w-full rounded-xl px-3 outline-none"
          style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
        />

        <p className="mb-2 text-xs" style={{ color: "var(--text-faint)" }} aria-live="polite">
          {query.trim()
            ? `${results.length} نتيجة من ${CITIES.length} مدينة`
            : `أول ${results.length} من ${CITIES.length} مدينة — اكتب اسمًا لتتصفية القائمة`}
        </p>

        {results.length === 0 ? (
          <p
            className="rounded-xl p-3 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
          >
            لا توجد مدينة بهذا الاسم في القائمة. جرّب اسمًا آخر أو راجع معرّف المنطقة الزمنية (مثل Europe/London).
          </p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {results.map((c) => {
              const selected = cityId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2"
                    aria-pressed={selected}
                    onClick={() => pick(c)}
                    style={{
                      background: selected ? "var(--primary-soft)" : "var(--surface-2)",
                      color: "var(--text)",
                      border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                    }}
                  >
                    <span className="font-semibold">
                      {c.name} <span className="text-xs" style={{ color: "var(--text-faint)" }}>— {c.country}</span>
                    </span>
                    <span dir="ltr" className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
                      {formatClock(now, hour12, false, c.zone)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {cityId && (
          <div className="mt-3">
            <button type="button" className="btn btn-ghost" onClick={useDevice}>
              ارجع لتوقيت الجهاز (بدون مدينة)
            </button>
          </div>
        )}
      </section>

      {/* لقطة بطاقة الرئيسية — تُظهر ما ستراه هناك فعلًا */}
      <section aria-labelledby="tc-preview">
        <h2 id="tc-preview" className="mb-2 text-lg font-bold" style={{ color: "var(--primary)" }}>
          هكذا تظهر في الرئيسية
        </h2>
        <TimeCalendarCard />
      </section>

      <Block
        title="كيف يعمل هذا القسم؟"
        items={[
          "كل الحساب يتم داخل متصفحك عبر Intl.DateTimeFormat: لا خدمة وقت خارجية، ولا يُرسل أي طلب شبكة — فيعمل دون إنترنت بعد تحميل الموقع.",
          "الساعة تقرأ من ساعة جهازك ومنطقة زمنيته، والموقع لا يعدّل إعدادات جهازك أبدًا.",
          "نظام الساعة (12 أو 24) والمدينة المحفوظة يُحفظان ضمن إعدادات الموقع على جهازك، وتبدّلهما متى شئت.",
          "قائمة المدن تستخدم معرّفات المناطق الزمنية القياسية (IANA)، فتتبع الفروق الصيفية تلقائيًا دون تحديث منك.",
          "الهجري المعروض حسابي وقد يخالف التاريخ الرسمي المعتمد على الرؤية في بلدك، وهذا مذكور فوق لا مخفي.",
        ]}
      />

      <RelatedLinks
        links={[
          { to: "/wird", label: "وردي اليوم", note: "أذكار الصباح والمساء بحسب وقتها" },
          { to: "/guide", label: "دليل الاستخدام", note: "شرح بقية وظائف الموقع" },
          { to: "/settings", label: "الإعدادات", note: "التذكيرات والمظهر" },
        ]}
      />
    </ContentPage>
  );
}
