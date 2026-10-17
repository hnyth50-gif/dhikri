/**
 * منطق الوقت والتقويم — كله محلي داخل المتصفح عبر Intl، بلا أي خدمة خارجية.
 *
 * ثلاث قواعد هنا:
 * 1. كل التنسيقات تحديد الصيغة (`ar-…-ca-…-nu-latn`) صراحةً حتى لا يختلف
 *    المخرج بين المتصفحات (افتراض «ar» قد يعطي تقويمًا عربيًا أو أرقامًا
 *    هندية في بعض المحرّكات).
 * 2. كائنات التنسيق تُبنى مرة واحدة وتُخزَّن، فلا يُعاد بناؤها كل ثانية.
 * 3. التاريخ الهجري المعروض **حسابي** (أم القرى عبر المتصفح) وقد يخالف
 *    التاريخ الرسمي المعتمد على رؤية الهلال — وهذا يُذكر في الواجهة لا يُخفى.
 */

/* ------------------------------------------------------------------ */
/* التنسيقات (تُبنى مرة واحدة وتُعاد استخدامها)                        */
/* ------------------------------------------------------------------ */

const AR_GREGORY = "ar-u-ca-gregory-nu-latn";
const AR_CLOCK = "ar-u-nu-latn";

/**
 * بديل التقويم الهجري: نجرّب صيغًا متتابعة لأن دعم أم القرى يختلف بين
 * المتصفحات والإصدارات. إن لم يدعم أيًّا منها نُرجع `null` ونُخبر المستخدم.
 */
const HIJRI_CANDIDATES = ["ar-SA-u-ca-islamic-umalqura-nu-latn", "ar-u-ca-islamic-nu-latn"];

let hijriLocale: string | null | undefined;

function resolveHijriLocale(): string | null {
  if (hijriLocale !== undefined) return hijriLocale;
  hijriLocale = null;
  for (const loc of HIJRI_CANDIDATES) {
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf([loc]).length > 0) {
        hijriLocale = loc;
        break;
      }
    } catch {
      /* نتجاهل هذه الصيغة ونجرّب التالية */
    }
  }
  return hijriLocale;
}

/** كائنات Intl تكلفتها ليست صفراً — نخزّنها حسب (الصيغة + الخيارات) */
const fmtCache = new Map<string, Intl.DateTimeFormat>();

function fmt(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  const hit = fmtCache.get(key);
  if (hit) return hit;
  const made = new Intl.DateTimeFormat(locale, options);
  fmtCache.set(key, made);
  return made;
}

function part(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/* ------------------------------------------------------------------ */
/* التاريخ الميلادي                                                    */
/* ------------------------------------------------------------------ */

export interface GregorianDate {
  /** مثل: الجمعة، 17 أكتوبر 2026 */
  text: string;
  weekday: string;
  day: string;
  month: string;
  year: string;
  /** YYYY-MM-DD لعنصر <time> */
  iso: string;
}

export function gregorianDate(d: Date, timeZone?: string): GregorianDate {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  };
  const f = fmt(AR_GREGORY, options);
  const parts = f.formatToParts(d);
  return {
    text: f.format(d),
    weekday: part(parts, "weekday"),
    day: part(parts, "day"),
    month: part(parts, "month"),
    year: part(parts, "year"),
    iso: fmt("en-ca", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }).format(d),
  };
}

/* ------------------------------------------------------------------ */
/* التاريخ الهجري                                                      */
/* ------------------------------------------------------------------ */

export interface HijriDate {
  /** دعم هذا المتصفح للتقويم الهجري */
  supported: boolean;
  /** مثل: 4 ربيع الأول 1448 هـ */
  text: string;
  day: string;
  month: string;
  year: string;
}

export function hijriDate(d: Date): HijriDate {
  const locale = resolveHijriLocale();
  if (!locale) return { supported: false, text: "", day: "", month: "", year: "" };

  try {
    const f = fmt(locale, { day: "numeric", month: "long", year: "numeric" });
    const parts = f.formatToParts(d);
    const day = part(parts, "day");
    const month = part(parts, "month");
    const year = part(parts, "year");
    if (!day || !month || !year) return { supported: false, text: "", day: "", month: "", year: "" };
    return {
      supported: true,
      // «هـ» تُضاف يدويًا حتى لو غابت عن نمط المحرّك، ولا تُكرَّر إن وُجدت
      text: `${day} ${month} ${year}${year.includes("هـ") ? "" : " هـ"}`,
      day,
      month,
      year,
    };
  } catch {
    return { supported: false, text: "", day: "", month: "", year: "" };
  }
}

/* ------------------------------------------------------------------ */
/* الساعة                                                              */
/* ------------------------------------------------------------------ */

/**
 * تنسيق ساعة من تاريخ، بالنظام 12 أو 24، وبثواني اختيارية.
 * الأرقام لاتينية لتطابق بقية الأرقام في الموقع.
 */
export function formatClock(d: Date, hour12: boolean, withSeconds = true, timeZone?: string): string {
  return fmt(AR_CLOCK, {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12,
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
}

/* ------------------------------------------------------------------ */
/* المناطق الزمنية                                                    */
/* ------------------------------------------------------------------ */

/** المنطقة الزمنية للجهاز، مثل Africa/Tripoli */
export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** هل يدعم المتصفح هذا المعرّف؟ (يمنع أخطاء RangeError) */
export function isSupportedZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * فرق المنطقة الزمنية عن UTC بالدقائق في لحظة معيّنة.
 * محسوب بتقنية أجزاء النص (لا بحساب يدوي) فيُصيب التوقيت الصيفي تمامًا.
 */
export function zoneOffsetMinutes(d: Date, zone: string): number {
  const parts = fmt("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const num = (t: string) => Number(part(parts, t));
  let hour = num("hour");
  if (hour === 24) hour = 0; // بعض المحرّكات تعطي 24 لمنتصف الليل
  const asUTC = Date.UTC(num("year"), num("month") - 1, num("day"), hour, num("minute"), num("second"));
  return Math.round((asUTC - d.getTime()) / 60000);
}

/** عرض الفرق بصيغة ‎+03:00‎ أو ‎-05:00‎ أو ‎+00:00‎ */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

/** الوقت والفرق والتاريخ في منطقة زمنية معيّنة */
export function zonedInfo(
  d: Date,
  zone: string,
  hour12: boolean
): { time: string; offset: string; date: string } {
  return {
    time: formatClock(d, hour12, true, zone),
    offset: formatOffset(zoneOffsetMinutes(d, zone)),
    date: gregorianDate(d, zone).text,
  };
}

/**
 * ملاحظة UTC / GMT: UTC مقياس ثابت لا يتأثر بالتوقيت الصيفي، وتوقيت غرينتش
 * (GMT) يساويه عمليًا اليوم، لكن بعض الأنظمة القانونية والتقنية تفرّق بينهما
 * (وكذلك تُستخدم GMT أحيانًا بمعنى UTC في الاتصالات)، فنعرض «UTC» باسمه الأصلي
 * ولا نسمّيه «جرينتش» في كل السياقات.
 */
export const UTC_NOTE =
  "UTC مقياس زمني ثابت لا يتأثر بالتوقيت الصيفي، وتوقيت غرينتش (GMT) يساويه عمليًا، لكن بعض الأنظمة القانونية والتقنية تفرّق بينهما — لذلك نعرض «UTC» باسمه الأصلي لا باسم جرينتش.";
