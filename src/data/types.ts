/**
 * أنواع بيانات الأذكار.
 *
 * هذه الطبقة منفصلة تمامًا عن الواجهة: يمكن استبدال `src/data/adhkar.ts`
 * أو تعديله دون لمس أي مكوّن، والاختبارات تتحقق من سلامة الملف تلقائيًا.
 */

export type DhikrTime = "morning" | "evening" | "both";

export type DhikrKind = "quran" | "hadith" | "adhkar";

/**
 * درجة التحقق من الذكر.
 *
 * - verified-source: نص الذكر ومصدره الأولي مطابقان لما هو منشور على
 *   sunnah.com (حصن المسلم) بعد فتح الصفحة ومراجعتها.
 * - needs-review:   المصدر مذكور، لكن الرقم أو الدرجة أو الصياغة النهائية
 *   لم تُكتمل مراجعتها — يُعرض بوضوح في الواجهة وفي صفحة المراجعة.
 */
export type Verification = "verified-source" | "needs-review";

/**
 * هل تم التحقق من رقم الحديث في ترقيم المجموعة الأصلية بفتح الصفحة فعليًا؟
 * - confirmed:   فُتحت الصفحة على sunnah.com وطابق النص والرقم.
 * - unconfirmed: المصدر مذكور كما ورد في «حصن المسلم»، لكن الرقم في ترقيم
 *                المجموعة الأصلية (دار السلام وغيره) لم يُفتح ويُتحقق منه بعد.
 *                لا يُعرض هذا الرقم على أنه مُتحقَّق منه.
 */
export type NumberVerification = "confirmed" | "unconfirmed";

export interface SourceRef {
  /** اسم المصدر كما يُقرأ عربيًا */
  book: string;
  /** رقم الحديث حسب الترقيم المستخدم */
  hadith?: string;
  /** أي توضيح على الترقيم، مثل «ترقيم دار السلام» */
  numberingNote?: string;
  /** رابط قابل للتحقق من الصفحة الفعلية */
  url?: string;
  /** درجة الصحة كما وردت في المصدر الموثوق */
  grade?: string;
  numberVerification: NumberVerification;
  /** ملاحظة على تعارض محتمل في التخريج أو الدرجة */
  gradeNote?: string;
}

export interface QuranRef {
  surah: string;
  surahNumber: number;
  from: number;
  to: number;
}

export interface Dhikr {
  /** معرّف ثابت لا يتغير — يُبنى عليه كل تقدّم المستخدم */
  id: string;
  title: string;
  /** النص الشرعي كما ورد، دون اختصار أو إعادة صياغة */
  text: string;
  /** صيغة المساء إن اختلفت عن الصيغة الصباحية */
  eveningText?: string;
  kind: DhikrKind;
  time: DhikrTime;
  /** عدد التكرار المنقول في المصدر. 1 يعني مرة واحدة أو لا تكرار مذكور */
  count: number;
  /** الصياغة الأصلية للعدد كما وردت في المصدر */
  countLabel: string;
  /** خيار إضافي وارد في المصدر (مثل «أو مرّة واحدة عند الكسل») */
  countAlternative?: string;
  /** عدد التكرار المسائي إن اختلف */
  eveningCount?: number;
  eveningCountLabel?: string;
  /** الفضيلة كما وردت في المصدر — تُنقل بلا زيادة ولا نقصان */
  virtue?: string;
  sources: SourceRef[];
  quran?: QuranRef[];
  /** رقم الذكر في حصن المسلم (الطبعة المعتمدة على sunnah.com) */
  hisn: number;
  /**
   * رابط التلاوة الصوتية من موقع حصن المسلم الأصلي.
   * خارجي بالكامل: يتطلب اتصالًا بالإنترنت، ولا يُخزَّن في ذاكرة العمل دون اتصال.
   */
  audio?: string;
  verification: Verification;
  verificationNote: string;
}

export interface AdhkarSection {
  id: "morning" | "evening";
  title: string;
  subtitle: string;
  items: Dhikr[];
}
