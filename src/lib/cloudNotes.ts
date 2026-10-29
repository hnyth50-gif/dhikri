/**
 * ملاحظاتي — الاتصال الاختياري بـSupabase (دخول بريدي + ملاحظات محفوظة).
 *
 * قواعد هذا الاتصال (موثّقة في سياسة الخصوصية وسؤال الشائع):
 *  • اختياري كله: ما لم تُفتح «ملاحظاتي» فلا يُنشأ طلب، وما لم يسجّل المستخدم
 *    دخوله فلا يخرج من جهازه أي شيء. كل وظائف الموقع الأخرى تبقى في
 *    localStorage وتعمل دون اتصال كما كانت — لم يُنقل شيء منها إلى السحابة.
 *  • الإعداد (رابط المشروع + المفتاح القابل للنشر) يأتي من متغيّرات البيئة
 *    VITE_*: ملفات الإعداد محلية (gitignored) أو GitHub Secrets — لا مفتاح
 *    في المستودع. المفتاح السري sb_secret_* لا يُقرأ هنا ولا في أي مكان آخر.
 *  • المكتبة نفسها تصل عبر وسم CDN في index.html (window.supabase): نفحصها
 *    لحظة الاستخدام، وغيابها يعني «الميزة غير مفعّلة» لا انهيار الموقع.
 *  • الأمان الحقيقي على الخادم قيود RLS (docs/supabase-notes.sql): المفتاح
 *    القابل للنشر معروف للجميع بتصميم Supabase ولا يمنح وحده أي صلاحية —
 *    كل مستخدم يرى ملاحظاته وحدها ولا يرى غيرها.
 *
 * لا استيراد لأي شيء من هذا الملف في src/sw.ts: عامل الخدمة لا يعرف Supabase.
 */
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* أنواع مصغّرة بنيوية لما نستعمله من SDK عبر CDN (المكتبة بلا أنواع)  */
/* ------------------------------------------------------------------ */

export interface CloudNote {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface CloudError {
  message: string;
}

interface AuthSessionLike {
  user?: { email?: string };
}

interface AuthApi {
  getSession(): Promise<{ data: { session: AuthSessionLike | null } }>;
  onAuthStateChange(
    callback: (event: string, session: AuthSessionLike | null) => void
  ): { data: { subscription: { unsubscribe(): void } } };
  signInWithOtp(options: {
    email: string;
    options?: { emailRedirectTo?: string };
  }): Promise<{ error: CloudError | null }>;
  signOut(): Promise<{ error: CloudError | null }>;
}

interface NotesSelectBuilder {
  order(
    column: string,
    options?: { ascending?: boolean }
  ): PromiseLike<{ data: CloudNote[] | null; error: CloudError | null }>;
}

interface NotesTable {
  select(columns?: string): NotesSelectBuilder;
  insert(row: { title: string; body: string }): PromiseLike<{ error: CloudError | null }>;
  update(row: { title?: string; body?: string }): {
    eq(column: string, value: string): PromiseLike<{ error: CloudError | null }>;
  };
  delete(): { eq(column: string, value: string): PromiseLike<{ error: CloudError | null }> };
}

interface CloudClientLike {
  auth: AuthApi;
  from(table: string): NotesTable;
}

declare global {
  interface Window {
    /** يضعها وسم CDN في index.html (supabase-js UMD) — تُفحص لحظة الاستخدام */
    supabase?: {
      createClient(url: string, key: string, options?: object): unknown;
    };
  }
}

/* ------------------------------------------------------------------ */
/* الإعداد — من متغيّرات البيئة وحدها                                  */
/* ------------------------------------------------------------------ */

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** هل بُنيت هذه النسخة بإعدادات Supabase أصلًا؟ */
export function cloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

let cachedClient: CloudClientLike | null | undefined;

/**
 * العميل الحالي: يُنشأ عند أول استخدام فعلي.
 *  • بلا إعداد بيئة → null محفوظ (نسخة مبنية بلا أسرار — الميزة مطفأة).
 *  • بإعداد ولم يصل وسم CDN بعد → null غير محفوظ (نُجرّب في النداء التالي).
 *  • المكتبة ناقصة أو رمت استثناء → null (رسالة الواجهة تشرح ذلك صراحةً).
 */
export function getCloud(): CloudClientLike | null {
  if (cachedClient !== undefined) return cachedClient;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    cachedClient = null;
    return null;
  }
  const factory = window.supabase?.createClient;
  if (!factory) return null; // لم يصل الـCDN بعد — بلا تثبيت، نُعيد المحاولة لاحقًا
  try {
    cachedClient = factory(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }) as CloudClientLike;
  } catch {
    cachedClient = null;
  }
  return cachedClient;
}

/* ------------------------------------------------------------------ */
/* حالة الجلسة — مستودع مشترك صغير مع استماع React                     */
/* ------------------------------------------------------------------ */

export interface CloudSessionState {
  session: AuthSessionLike | null;
  loading: boolean;
}

let sessionState: CloudSessionState = { session: null, loading: true };
let authStarted = false;
const sessionListeners = new Set<(state: CloudSessionState) => void>();

function publishSession(next: CloudSessionState): void {
  sessionState = next;
  for (const listener of sessionListeners) listener(sessionState);
}

/**
 * يبدأ مراقبة الجلسة مرة واحدة: قراءة الجلسة المحفوظة + كل تغيّر لاحق
 * (دخول، خروج، عودة من رابط البريد في تبويب آخر عبر أحداث التخزين).
 * يُستدعى من عند التركيب (SignInWatcher في الهيكل العام) حتى يُلتقط
 * استبدال رمز الرابط السحري (؟code=) ولو هبط المستخدم في الصفحة الرئيسية.
 */
function ensureAuthStarted(): void {
  if (authStarted) return;
  const cloud = getCloud();
  if (!cloud) {
    if (!cloudConfigured()) publishSession({ session: null, loading: false });
    return; // بلا عميل بعد: نُجرّب مرة أخرى عند الاستدعاء القادم
  }
  authStarted = true;
  cloud.auth
    .getSession()
    .then(({ data }) => publishSession({ session: data.session, loading: false }))
    .catch(() => publishSession({ session: null, loading: false }));
  cloud.auth.onAuthStateChange((_event, session) => {
    publishSession({ session, loading: false });
  });
}

/** خطّاف حالة الدخول: يبدأ المراقبة عند أول تركيب ويبقي المتجرًا متزامنًا */
export function useCloudSession(): CloudSessionState {
  const [snapshot, setSnapshot] = useState<CloudSessionState>(sessionState);
  useEffect(() => {
    ensureAuthStarted();
    setSnapshot(sessionState);
    const listener = (state: CloudSessionState) => setSnapshot(state);
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  }, []);
  return snapshot;
}

/* ------------------------------------------------------------------ */
/* رسالة الخطأ → نص عربي صريح                                          */
/* ------------------------------------------------------------------ */

function mapError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed"))
    return "لا اتصال بالشبكة — تحقّق من الإنترنت ثم أعد المحاولة.";
  if (m.includes("invalid redirect"))
    return "إعدادات روابط الدخول غير مكتملة في لوحة Supabase (Redirect URLs).";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "تجاوزتَ حد الإرسال المتكرر — انتظر دقائق ثم أعد المحاولة.";
  if (m.includes("email rate limit"))
    return "تجاوزتَ حد رسائل البريد — انتظر قليلًا قبل إعادة الإرسال.";
  if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized") || m.includes("jwt"))
    return "انتهت صلاحية الجلسة أو لا تملك إذنًا — أعد تسجيل الدخول.";
  if (m.includes("does not exist"))
    return "لم يُجهَّز جدول الملاحظات على الخادم بعد — خطوة إعداد واحدة لدى صاحب الموقع.";
  if (m.includes("invalid format") || m.includes("invalid email") || (m.includes("email address") && m.includes("invalid")))
    return "رفضت خدمة الدخول صيغة هذا البريد — اكتبه بريدًا صالحًا فعليًا (النطاقات المحاكية مثل example.com مرفوضة من الخدمة).";
  if (m.includes("user not found"))
    return "لا حساب بهذا البريد بعد — أول رابط يفتح لك حسابًا جديدًا.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "التسجيل موقوف مؤقتًا في إعدادات المشروع.";
  return `تعذّر تنفيذ الطلب: ${raw}`;
}

/* ------------------------------------------------------------------ */
/* الدخول برابط سحري (بلا كلمات مرور أبدًا)                            */
/* ------------------------------------------------------------------ */

export const EMAIL_MAX = 254;

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  return value.length > 0 && value.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * يرسل رابط دخول إلى البريد. نجاح = null (الرسالة تُبلَّغ من الواجهة).
 * رابط العودة: نفس صفحة الموقع الحالية — يُضاف في لوحة Supabase ضمن
 * Redirect URLs قبل أول استخدام (راجع docs/SUPABASE-SETUP.md).
 */
export async function sendLoginLink(email: string): Promise<string | null> {
  const cloud = getCloud();
  if (!cloud) return "خدمة الدخول غير مفعّلة في هذه النسخة.";
  const redirect = `${window.location.origin}${window.location.pathname}`;
  const { error } = await cloud.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirect },
  });
  return error ? mapError(error.message) : null;
}

/** خروج يمحو الجلسة من هذا الجهاز (ومفتاح توكنها المحلي) */
export async function signOutCloud(): Promise<string | null> {
  const cloud = getCloud();
  if (!cloud) return null;
  const { error } = await cloud.auth.signOut();
  return error ? mapError(error.message) : null;
}

/* ------------------------------------------------------------------ */
/* الملاحظات — جلب وإضافة وتعديل وحذف                                  */
/* ------------------------------------------------------------------ */

/** الحدود نفسها المكتوبة في SQL (check constraints) — نفرضها قبل الإرسال */
export const TITLE_MAX = 200;
export const BODY_MAX = 5000;

export async function fetchNotes(): Promise<{ notes: CloudNote[] | null; error: string | null }> {
  const cloud = getCloud();
  if (!cloud) return { notes: null, error: "خدمة الملاحظات غير مفعّلة في هذه النسخة." };
  const { data, error } = await cloud
    .from("notes")
    .select("id, title, body, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return { notes: null, error: mapError(error.message) };
  return { notes: data ?? [], error: null };
}

export async function addNote(title: string, body: string): Promise<string | null> {
  const cloud = getCloud();
  if (!cloud) return "خدمة الملاحظات غير مفعّلة في هذه النسخة.";
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) return "اكتب عنوانًا للملاحظة.";
  if (trimmedTitle.length > TITLE_MAX) return `العنوان أطول من ${TITLE_MAX} حرفًا.`;
  if (trimmedBody.length > BODY_MAX) return `النص أطول من ${BODY_MAX} حرفًا.`;
  const { error } = await cloud.from("notes").insert({ title: trimmedTitle, body: trimmedBody });
  return error ? mapError(error.message) : null;
}

export async function editNote(id: string, title: string, body: string): Promise<string | null> {
  const cloud = getCloud();
  if (!cloud) return "خدمة الملاحظات غير مفعّلة في هذه النسخة.";
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) return "لا يمكن ترك العنوان فارغًا.";
  if (trimmedTitle.length > TITLE_MAX) return `العنوان أطول من ${TITLE_MAX} حرفًا.`;
  if (trimmedBody.length > BODY_MAX) return `النص أطول من ${BODY_MAX} حرفًا.`;
  // updated_at يضبطه مشغّل قاعدة البيانات تلقائيًا (trigger في SQL الإعداد)
  const { error } = await cloud.from("notes").update({ title: trimmedTitle, body: trimmedBody }).eq("id", id);
  return error ? mapError(error.message) : null;
}

export async function removeNote(id: string): Promise<string | null> {
  const cloud = getCloud();
  if (!cloud) return "خدمة الملاحظات غير مفعّلة في هذه النسخة.";
  const { error } = await cloud.from("notes").delete().eq("id", id);
  return error ? mapError(error.message) : null;
}

/** تاريخ عربي بأرقام لاتينية ثابتة العرض مع بقية الواجهة */
export function formatNoteDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
