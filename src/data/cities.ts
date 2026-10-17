/**
 * قائمة المدن للوقت والتقويم.
 *
 * القواعد:
 * - كل مدينة تحمل معرّف مناطق زمنية قياسي (IANA) حقيقي — لا حسابات يدوية،
 *   ولا افتراض أن «التوقيت الصيفي» يدوم طوال السنة.
 * - لا مفاتيح ولا خدمات خارجية: كل التحويل يتم داخل المتصفح عبر Intl.
 * - `zone` فريد؛ المدينة الاسم فقط، والمنطقة الزمنية هي المرجع للحساب.
 */

export interface City {
  /** معرّف ثابت يُحفظ في الإعدادات */
  id: string;
  /** الاسم بالعربية كما يُقرأ */
  name: string;
  /** الدولة/الإقليم بالعربية — للتمييز عند التشابه */
  country: string;
  /** معرّف IANA: مثل Africa/Tripoli */
  zone: string;
}

export const CITIES: City[] = [
  { id: "tripoli", name: "طرابلس", country: "ليبيا", zone: "Africa/Tripoli" },
  { id: "benghazi", name: "بنغازي", country: "ليبيا", zone: "Africa/Tripoli" },
  { id: "cairo", name: "القاهرة", country: "مصر", zone: "Africa/Cairo" },
  { id: "alexandria", name: "الإسكندرية", country: "مصر", zone: "Africa/Cairo" },
  { id: "riyadh", name: "الرياض", country: "السعودية", zone: "Asia/Riyadh" },
  { id: "makkah", name: "مكة المكرمة", country: "السعودية", zone: "Asia/Riyadh" },
  { id: "madinah", name: "المدينة المنورة", country: "السعودية", zone: "Asia/Riyadh" },
  { id: "jeddah", name: "جدة", country: "السعودية", zone: "Asia/Riyadh" },
  { id: "dubai", name: "دبي", country: "الإمارات", zone: "Asia/Dubai" },
  { id: "abudhabi", name: "أبوظبي", country: "الإمارات", zone: "Asia/Dubai" },
  { id: "london", name: "لندن", country: "المملكة المتحدة", zone: "Europe/London" },
  { id: "paris", name: "باريس", country: "فرنسا", zone: "Europe/Paris" },
  { id: "istanbul", name: "إسطنبول", country: "تركيا", zone: "Asia/Istanbul" },
  { id: "ankara", name: "أنقرة", country: "تركيا", zone: "Europe/Istanbul" },
  { id: "tokyo", name: "طوكيو", country: "اليابان", zone: "Asia/Tokyo" },
  { id: "newyork", name: "نيويورك", country: "الولايات المتحدة", zone: "America/New_York" },
  { id: "doha", name: "الدوحة", country: "قطر", zone: "Asia/Qatar" },
  { id: "kuwait", name: "الكويت", country: "الكويت", zone: "Asia/Kuwait" },
  { id: "manama", name: "المنامة", country: "البحرين", zone: "Asia/Bahrain" },
  { id: "muscat", name: "مسقط", country: "عُمان", zone: "Asia/Muscat" },
  { id: "sanaa", name: "صنعاء", country: "اليمن", zone: "Asia/Aden" },
  { id: "baghdad", name: "بغداد", country: "العراق", zone: "Asia/Baghdad" },
  { id: "beirut", name: "بيروت", country: "لبنان", zone: "Asia/Beirut" },
  { id: "damascus", name: "دمشق", country: "سوريا", zone: "Asia/Damascus" },
  { id: "amman", name: "عمّان", country: "الأردن", zone: "Asia/Amman" },
  { id: "jerusalem", name: "القدس", country: "فلسطين", zone: "Asia/Jerusalem" },
  { id: "gaza", name: "غزة", country: "فلسطين", zone: "Asia/Gaza" },
  { id: "khartoum", name: "الخرطوم", country: "السودان", zone: "Africa/Khartoum" },
  { id: "tunis", name: "تونس", country: "تونس", zone: "Africa/Tunis" },
  { id: "algiers", name: "الجزائر", country: "الجزائر", zone: "Africa/Algiers" },
  { id: "rabat", name: "الرباط", country: "المغرب", zone: "Africa/Casablanca" },
  { id: "casablanca", name: "الدار البيضاء", country: "المغرب", zone: "Africa/Casablanca" },
  { id: "nouakchott", name: "نواكشوط", country: "موريتانيا", zone: "Africa/Nouakchott" },
  { id: "mogadishu", name: "مقديشو", country: "الصومال", zone: "Africa/Mogadishu" },
  { id: "nairobi", name: "نيروبي", country: "كينيا", zone: "Africa/Nairobi" },
  { id: "johannesburg", name: "جوهانسبرغ", country: "جنوب أفريقيا", zone: "Africa/Johannesburg" },
  { id: "tehran", name: "طهران", country: "إيران", zone: "Asia/Tehran" },
  { id: "karachi", name: "كراتشي", country: "باكستان", zone: "Asia/Karachi" },
  { id: "delhi", name: "دلهي", country: "الهند", zone: "Asia/Kolkata" },
  { id: "dhaka", name: "دكا", country: "بنغلاديش", zone: "Asia/Dhaka" },
  { id: "kualalumpur", name: "كوالالمبور", country: "ماليزيا", zone: "Asia/Kuala_Lumpur" },
  { id: "jakarta", name: "جاكرتا", country: "إندونيسيا", zone: "Asia/Jakarta" },
  { id: "beijing", name: "بكين", country: "الصين", zone: "Asia/Shanghai" },
  { id: "moscow", name: "موسكو", country: "روسيا", zone: "Europe/Moscow" },
  { id: "berlin", name: "برلين", country: "ألمانيا", zone: "Europe/Berlin" },
  { id: "rome", name: "روما", country: "إيطاليا", zone: "Europe/Rome" },
  { id: "madrid", name: "مدريد", country: "إسبانيا", zone: "Europe/Madrid" },
  { id: "amsterdam", name: "أمستردام", country: "هولندا", zone: "Europe/Amsterdam" },
  { id: "stockholm", name: "ستوكهولم", country: "السويد", zone: "Europe/Stockholm" },
  { id: "chicago", name: "شيكاغو", country: "الولايات المتحدة", zone: "America/Chicago" },
  { id: "losangeles", name: "لوس أنجلوس", country: "الولايات المتحدة", zone: "America/Los_Angeles" },
  { id: "toronto", name: "تورونتو", country: "كندا", zone: "America/Toronto" },
  { id: "saopaulo", name: "ساو باولو", country: "البرازيل", zone: "America/Sao_Paulo" },
  { id: "sydney", name: "سيدني", country: "أستراليا", zone: "Australia/Sydney" },
];

/** معرّف المدينة المختارة افتراضيًا: فارغ = توقيت الجهاز */
export const NO_CITY = "";

export function findCity(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}
