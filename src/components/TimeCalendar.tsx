import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { findCity } from "../data/cities";
import {
  formatClock,
  gregorianDate,
  hijriDate,
  isSupportedZone,
  localZone,
  zonedInfo,
} from "../lib/time";
import { useApp } from "../state/AppContext";
import { ChevronIcon, ClockIcon } from "./Icons";

/**
 * الوقت والتقويم — مكوّنات مشتركة بين الصفحة الرئيسية والصفحة المستقلة `/time`.
 *
 * مبدأ واحد يحكم هذا الملف: مؤقّت واحد لكل مكوّن منضبط على حافة الثانية،
 * ويُنظَّف عند الإزالة (timeout + interval معًا) — لا مؤقّتات متعددة ولا متبقّية.
 * التواريخ تُعاد حسابها مع كل تكّة، فتتحدّث آليًا لحظة تبدّل اليوم بلا منطق إضافي.
 */

/** ساعة حيّة: قيمة واحدة تُحدَّث مرة في الثانية، مع تنظيف كامل عند الإزالة */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval = 0;
    // نؤجّل أول تكّة إلى حافة الثانية التالية بدل مزامنة عشوائية، ثم نثبّت الإيقاع
    const first = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 1000);
    }, 1000 - (Date.now() % 1000));

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  return now;
}

/**
 * المدينة المحفوظة في الإعدادات إن كانت صالحة ومدعومة في هذا المتصفح،
 * وإلا نرجع توقيت الجهاز — قيمة قديمة تالفة لا تُسقط الصفحة.
 */
export function useSavedCity(): { cityId: string; zone: string; label: string } {
  const { settings } = useApp();
  return useMemo(() => {
    const stored = typeof settings.homeCity === "string" ? settings.homeCity : "";
    const city = stored ? findCity(stored) : undefined;
    const zone = city && isSupportedZone(city.zone) ? city.zone : localZone();
    return { cityId: city ? city.id : "", zone, label: city ? city.name : "توقيت الجهاز" };
  }, [settings.homeCity]);
}

/**
 * بطاقة مختصرة في الصفحة الرئيسية: الساعة المحلية (بالثواني)، وتاريخا اليوم،
 * وتوقيت المدينة المحفوظة إن وُجدت. الروابط كلها إلى صفحة «الوقت والتقويم».
 */
export function TimeCalendarCard() {
  const now = useNow();
  const { settings } = useApp();
  const hour12 = settings.timeFormat === "12";
  const { cityId, zone, label } = useSavedCity();

  const g = gregorianDate(now);
  const h = hijriDate(now);
  const localTime = formatClock(now, hour12);
  const cityInfo = cityId ? zonedInfo(now, zone, hour12) : null;

  return (
    <Link
      to="/time"
      aria-label="الوقت والتقويم: الساعة والتاريخان وتوقيت مدينتك"
      className="surface flex flex-col gap-1.5 p-4 no-underline transition-colors hover:bg-[var(--surface-hover)]"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-bold" style={{ color: "var(--primary)" }}>
          <ClockIcon width={18} height={18} />
          الوقت والتقويم
        </span>
        <ChevronIcon width={16} height={16} style={{ color: "var(--text-faint)" }} />
      </span>

      <span className="flex flex-wrap items-baseline gap-x-3">
        <time
          className="text-3xl font-bold tabular-nums"
          dateTime={now.toISOString()}
          style={{ color: "var(--text)" }}
        >
          {localTime}
        </time>
        {cityInfo && (
          <span className="text-sm font-semibold" style={{ color: "var(--text-soft)" }}>
            {label}: <span className="tabular-nums">{cityInfo.time}</span>
          </span>
        )}
      </span>

      <span className="text-sm" style={{ color: "var(--text-soft)" }}>
        {g.text}
      </span>
      <span className="text-sm" style={{ color: "var(--text-faint)" }}>
        {h.supported ? `التاريخ الهجري: ${h.text}` : "التقويم الهجري غير مدعوم في هذا المتصفح"}
      </span>
    </Link>
  );
}
