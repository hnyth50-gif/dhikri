import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import ContentPage, { RelatedLinks, usePageTitle } from "../components/ContentPage";
import { BookIcon } from "../components/Icons";
import { useToast } from "../components/Toast";
import {
  BODY_MAX,
  TITLE_MAX,
  type CloudNote,
  addNote,
  cloudConfigured,
  editNote,
  fetchNotes,
  formatNoteDate,
  getCloud,
  isValidEmail,
  removeNote,
  sendLoginLink,
  signOutCloud,
  useCloudSession,
} from "../lib/cloudNotes";

/**
 * «ملاحظاتي» — ميزة اختيارية كاملة فوق Supabase:
 *  • من لم يسجّل الدخول يرى شرحًا صريحًا ونموذج رابط سحري، لا وعودًا.
 *  • من سجّل يرى قائمة ملاحظاته (جلب/إضافة/تعديل/حذف) — والحدود نفسها
 *    المفروضة في قاعدة البيانات (200 عنوانًا / 5000 حرفًا) تُفرض هنا أولًا.
 *  • بلا إعداد أو بلا CDN أو بلا شبكة: حالات صادقة تشرح السبب، ولا ادّعاء
 *    بالعمل يتجاوز ما هو موجود فعلًا.
 */

/** عدّ عربي سليم للصفر والمفرد والمثنى والجمع */
function notesCountLabel(n: number): string {
  if (n === 0) return "لا ملاحظات بعد";
  if (n === 1) return "ملاحظة واحدة";
  if (n === 2) return "ملاحظتان";
  if (n <= 10) return `${n} ملاحظات`;
  return `${n} ملاحظة`;
}

/* نسق الحقول نفسه المستعمل في «تواصل معنا» و«الإعدادات» (بلا صنف عام موحّد) */
const fieldClass = "min-h-11 w-full rounded-xl px-3 outline-none";
const areaClass = "w-full rounded-xl p-3 leading-relaxed outline-none resize-y";
const fieldStyle: CSSProperties = {
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

export default function NotesPage() {
  const toast = useToast();
  usePageTitle("ملاحظاتي");

  const [cloud] = useState(() => getCloud());
  const { session, loading: authLoading } = useCloudSession();
  const email = session?.user?.email ?? null;

  const configured = Boolean(cloud) || cloudConfigured();
  const [online, setOnline] = useState(() => navigator.onLine);

  const [notes, setNotes] = useState<CloudNote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* نموذج الدخول */
  const [loginEmail, setLoginEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  /* نموذج الإضافة */
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  /* التعديل والحذف داخل البطاقة */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* مراقبة الاتصال — الميزة تحتاج شبكة ولا ندّعي العكس */
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* جلب الملاحظات عند دخول حساب أو مغادرته */
  useEffect(() => {
    if (!cloud || !email) {
      setNotes(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadError(null);
    fetchNotes().then(({ notes: list, error }) => {
      if (!alive) return;
      setLoading(false);
      if (error) setLoadError(error);
      else setNotes(list);
    });
    return () => {
      alive = false;
    };
  }, [cloud, email]);

  /** إعادة جلب صامتة بعد كل عملية ناجحة (المصدر الوحيد للحقيقة) */
  async function reload(): Promise<void> {
    const { notes: list, error } = await fetchNotes();
    if (error) {
      setLoadError(error);
      return;
    }
    setLoadError(null);
    setNotes(list);
  }

  async function handleSendLink(e: FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    const value = loginEmail.trim();
    if (!isValidEmail(value)) {
      setLoginError("اكتب بريدًا إلكترونيًا صحيحًا.");
      return;
    }
    setSending(true);
    const error = await sendLoginLink(value);
    setSending(false);
    if (error) setLoginError(error);
    else {
      setSentTo(value);
      toast.show("أرسلنا رابط الدخول إلى بريدك", "info");
    }
  }

  async function handleAdd(e: FormEvent): Promise<void> {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    const error = await addNote(newTitle, newBody);
    setAdding(false);
    if (error) {
      setAddError(error);
      return;
    }
    setNewTitle("");
    setNewBody("");
    toast.show("أُضيفت الملاحظة", "success");
    await reload();
  }

  async function handleSaveEdit(id: string): Promise<void> {
    setSavingId(id);
    const error = await editNote(id, editTitle, editBody);
    setSavingId(null);
    if (error) {
      toast.show(error, "error");
      return;
    }
    setEditingId(null);
    toast.show("حُفظت التعديلات", "success");
    await reload();
  }

  async function handleDelete(id: string): Promise<void> {
    setBusyId(id);
    const error = await removeNote(id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (error) {
      toast.show(error, "error");
      return;
    }
    toast.show("حُذفت الملاحظة", "info");
    await reload();
  }

  async function handleSignOut(): Promise<void> {
    const error = await signOutCloud();
    if (error) toast.show(error, "error");
    else toast.show("سجّلت الخروج — ملاحظاتك تبقى محفوظة في حسابك", "info");
  }

  /* ------------------------------ الحالات ------------------------------ */

  /* 1) نسخة بلا إعداد Supabase — نص صريح لا واجهة وهمية */
  if (!configured) {
    return (
      <ContentPage
        title="ملاحظاتي"
        lead="ملاحظات شخصية اختيارية بحساب بريدي — وهي الوحيدة في الموقع التي تحتاج حسابًا."
      >
        <div className="surface p-6 text-center">
          <p className="font-bold" style={{ color: "var(--primary)" }}>
            ميزة الملاحظات غير مفعّلة في هذه النسخة
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
            تُفعَّل بخطوة إعداد واحدة من صاحب الموقع. حتى ذلك الحين: كل بقية
            الوظائف (الأذكار، العدّادات، المفضلة، المسبحة) تعمل على جهازك بلا حساب
            وبلا اتصال — كما كانت تمامًا.
          </p>
        </div>
        <RelatedLinks
          links={[
            { to: "/settings", label: "الإعدادات", note: "المظهر والتذكيرات — كلها محلية" },
            { to: "/privacy", label: "سياسة الخصوصية", note: "ما الذي يخرج من جهازك ومتى" },
          ]}
        />
      </ContentPage>
    );
  }

  /* 2) جارٍ فحص الجلسة */
  if (authLoading) {
    return (
      <ContentPage title="ملاحظاتي" lead="ملاحظاتك الشخصية — محفوظة في حسابك الاختياري.">
        <div className="surface p-6 text-center text-sm" role="status" aria-busy="true" style={{ color: "var(--text-soft)" }}>
          …جارٍ فحص حالة الدخول
        </div>
      </ContentPage>
    );
  }

  /* 3) الإعداد موجود لكن مكتبة الدخول لم تصل (أو مُنع تحميلها) — نص صادق */
  if (!cloud) {
    return (
      <ContentPage title="ملاحظاتي" lead="ملاحظاتك الشخصية — محفوظة في حسابك الاختياري.">
        <div className="surface p-6 text-center">
          <p className="font-bold" style={{ color: "var(--primary)" }}>
            تعذّر تحميل خدمة الدخول الآن
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
            لم تصل مكتبة Supabase إلى هذا التحميل (قد تكون الشبكة انقطعت في أول
            زيارة أو يمنع إضافةً تحميلها). أعد فتح الصفحة وستعمل — وبقية الموقع
            تعمل في هذه اللحظة دون أي عطل.
          </p>
        </div>
      </ContentPage>
    );
  }

  /* 4) لم يسجّل الدخول */
  if (!email) {
    return (
      <ContentPage
        title="ملاحظاتي"
        lead="ملاحظات شخصية اختيارية: عنوان ونص — تُحفظ في حسابك وتتبعك بين أجهزتك."
      >
        <div className="surface p-5">
          <h2 className="font-bold" style={{ color: "var(--primary)" }}>
            دخول برابط سحري — بلا كلمة مرور
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
            تكتب بريدك فيصلك رابط يفتح الجلسة على هذا الجهاز. ما لم تستخدم
            «ملاحظاتي» فلن يُطلب منك بريد، ولن يخرج من جهازك أي شيء — بقية
            الموقع كله محلية دون حساب.{" "}
            <a href="#/privacy" className="underline" style={{ color: "var(--accent-strong)" }}>
              اقرأ الخصوصية كاملة
            </a>
            .
          </p>

          {sentTo ? (
            <div className="mt-4 rounded-xl p-4" role="status" style={{ background: "var(--accent-soft)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--accent-strong)" }}>
                أُرسل رابط الدخول إلى <span dir="ltr">{sentTo}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>
                افتحه من هذا الجهاز — الرابط صالح لفترة قصيرة. لم يصل؟ تحقّق من
                مجلد المزعج.
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-3"
                onClick={() => {
                  setSentTo(null);
                  setLoginEmail("");
                }}
              >
                جرّب بريدًا آخر
              </button>
            </div>
          ) : (
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleSendLink} noValidate>
              <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="notes-email">
                بريدك الإلكتروني
                <input
                  id="notes-email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  className={fieldClass}
                  style={fieldStyle}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  maxLength={254}
                  aria-describedby={loginError ? "notes-login-error" : undefined}
                />
              </label>
              {loginError && (
                <p id="notes-login-error" role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
                  {loginError}
                </p>
              )}
              <div>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? "…جارٍ الإرسال" : "أرسل رابط الدخول"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="surface p-4 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
          لا توجد كلمات مرور في هذه الطريقة ولا نسخة من بريدك في الموقع — الرابط
          يُسلَّم من خدمة الدخول (Supabase) مباشرة إلى صندوقك.
        </div>

        <RelatedLinks
          links={[
            { to: "/privacy", label: "سياسة الخصوصية", note: "ما الذي يخرج من جهازك ومتى" },
            { to: "/faq", label: "الأسئلة الشائعة", note: "سؤال الحساب وملاحظاتي" },
          ]}
        />
      </ContentPage>
    );
  }

  /* 4) داخل حساب */
  return (
    <ContentPage
      title="ملاحظاتي"
      lead="ملاحظاتك: عنوان ونص — تُحفظ في حسابك، والأحدث أولًا. العدد كله لك وحدك."
    >
      {/* شريط الحساب */}
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="min-w-0 text-sm" style={{ color: "var(--text-soft)" }}>
          حسابك:{" "}
          <span dir="ltr" className="font-semibold" style={{ color: "var(--primary)" }}>
            {email}
          </span>
        </p>
        <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
          خروج
        </button>
      </div>

      {!online && (
        <p className="surface p-4 text-sm font-semibold" role="status" style={{ color: "var(--danger)" }}>
          لا اتصال بالشبكة الآن — الملاحظات تحتاج اتصالًا. بقية الموقع تعمل دون
          اتصال كالمعتاد.
        </p>
      )}

      {/* إضافة ملاحظة */}
      <form className="surface flex flex-col gap-3 p-4" onSubmit={handleAdd} noValidate>
        <h2 className="font-bold" style={{ color: "var(--primary)" }}>
          ملاحظة جديدة
        </h2>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="note-title">
          العنوان
          <input
            id="note-title"
            type="text"
            className={fieldClass}
            style={fieldStyle}
            placeholder="مثلًا: فضل قيام رمضان"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={TITLE_MAX}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="note-body">
          النص
          <textarea
            id="note-body"
            className={areaClass}
            style={fieldStyle}
            placeholder="اكتب ملاحظتك هنا…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            maxLength={BODY_MAX}
            rows={4}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
            {newTitle.length}/{TITLE_MAX} عنوان · {newBody.length}/{BODY_MAX} نص
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={adding || newTitle.trim().length === 0}
          >
            {adding ? "…جارٍ الحفظ" : "أضف ملاحظة"}
          </button>
        </div>
        {addError && (
          <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
            {addError}
          </p>
        )}
      </form>

      {/* حالة الجلب */}
      {loading && (
        <div className="surface p-6 text-center text-sm" role="status" aria-busy="true" style={{ color: "var(--text-soft)" }}>
          …جارٍ جلب ملاحظاتك
        </div>
      )}

      {!loading && loadError && (
        <div className="surface p-5 text-center">
          <p role="alert" className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
            {loadError}
          </p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => void reload()}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !loadError && notes && (
        <>
          <p className="text-sm font-semibold" style={{ color: "var(--text-faint)" }}>
            <span className="tabular-nums">{notesCountLabel(notes.length)}</span>
          </p>

          {notes.length === 0 ? (
            <div className="surface flex flex-col items-center gap-3 p-8 text-center">
              <span aria-hidden style={{ color: "var(--text-faint)" }}>
                <BookIcon width={36} height={36} />
              </span>
              <p className="font-bold" style={{ color: "var(--primary)" }}>
                لا ملاحظات بعد
              </p>
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                اكتب أول ملاحظة في النموذج أعلاه — تظهر هنا فورًا.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => {
                const editing = editingId === note.id;
                const confirming = confirmDeleteId === note.id;
                return (
                  <li key={note.id} className="surface p-4">
                    {editing ? (
                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`edit-title-${note.id}`}>
                          العنوان
                          <input
                            id={`edit-title-${note.id}`}
                            type="text"
                            className={fieldClass}
                            style={fieldStyle}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            maxLength={TITLE_MAX}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`edit-body-${note.id}`}>
                          النص
                          <textarea
                            id={`edit-body-${note.id}`}
                            className={areaClass}
                            style={fieldStyle}
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            maxLength={BODY_MAX}
                            rows={5}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={savingId === note.id || editTitle.trim().length === 0}
                            onClick={() => void handleSaveEdit(note.id)}
                          >
                            {savingId === note.id ? "…جارٍ الحفظ" : "حفظ التعديلات"}
                          </button>
                          <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="font-bold" style={{ color: "var(--primary)" }}>
                              {note.title}
                            </h2>
                            {note.body && (
                              <p
                                className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed"
                                style={{ color: "var(--text-soft)" }}
                                dir="rtl"
                              >
                                {note.body}
                              </p>
                            )}
                            <p className="mt-2 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
                              آخر تعديل: <time dateTime={note.updated_at}>{formatNoteDate(note.updated_at)}</time>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {confirming ? (
                            <>
                              <span className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
                                حذف نهائيًا؟
                              </span>
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busyId === note.id}
                                onClick={() => void handleDelete(note.id)}
                              >
                                نعم، احذف
                              </button>
                              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                                تراجع
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ minHeight: "2.4rem", fontSize: "0.85rem" }}
                                onClick={() => {
                                  setEditingId(note.id);
                                  setEditTitle(note.title);
                                  setEditBody(note.body);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ minHeight: "2.4rem", fontSize: "0.85rem", color: "var(--danger)" }}
                                onClick={() => setConfirmDeleteId(note.id)}
                              >
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <RelatedLinks
        links={[
          { to: "/settings", label: "الإعدادات", note: "كل ما عدا الملاحظات يبقى محليًا هنا" },
          { to: "/privacy", label: "سياسة الخصوصية", note: "ما الذي يخرج من جهازك ومتى" },
        ]}
      />
    </ContentPage>
  );
}
