import { useEffect, useState } from "react";
import { useApp, type FontChoice, type ThemeChoice } from "../state/AppContext";
import { useToast } from "../components/Toast";
import { BellIcon, MinusIcon, OfflineIcon, PlusIcon } from "../components/Icons";
import { requestPermission, permissionState, scheduleReminder, clearReminders } from "../lib/reminders";
import { probeStorage } from "../lib/storage";
import { audioUrls, savedAudio, downloadAllAudio, clearDownloadedAudio } from "../lib/audioOffline";

const FONTS: Array<[FontChoice, string, string]> = [
  ["naskh", "نسخ (Amiri)", "خط كلاسيكي مريح للنصوص الطويلة — الافتراضي"],
  ["naskh-noto", "نوتو نسخ", "نسخ رقمي حديث بوضوح عالٍ"],
  ["kufi", "بلكس عربي", "خط هندسي واضح مناسب لمن يفضل البساطة"],
  ["cairo", "القاهرة", "خط واجهات متماسك للنصوص المختصرة"],
];

export default function SettingsPage() {
  const app = useApp();
  const toast = useToast();
  const s = app.settings;
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [audioDl, setAudioDl] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let alive = true;
    savedAudio()
      .then((list) => {
        if (alive) setSavedCount(list.length);
      })
      .catch(() => {
        if (alive) setSavedCount(0);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setPerm(permissionState());
    document.title = "الإعدادات — ذِكري";
    return () => {
      document.title = "ذِكري — أذكار الصباح والمساء";
    };
  }, []);

  const toggleReminder = async (kind: "morning" | "evening", enabled: boolean) => {
    if (!enabled) {
      app.updateSettings(kind === "morning" ? { morningReminder: false } : { eveningReminder: false });
      clearReminders();
      toast.show("أُوقف التذكير", "success");
      return;
    }

    if (permissionState() === "unsupported") {
      toast.show("هذا المتصفح لا يدعم التنبيهات", "error");
      return;
    }

    const permission = await requestPermission();
    setPerm(permission);
    if (permission !== "granted") {
      toast.show("لم يُمنح إذن التنبيهات — يمكنك تغييره من إعدادات المتصفح", "error");
      return;
    }

    const time = kind === "morning" ? s.morningTime : s.eveningTime;
    try {
      await scheduleReminder(kind, time);
      app.updateSettings(
        kind === "morning" ? { morningReminder: true } : { eveningReminder: true }
      );
      toast.show("فُعّل التذكير", "success");
    } catch (e) {
      toast.show((e as Error).message || "تعذّر جدولة التذكير", "error");
    }
  };

  const changeTime = async (kind: "morning" | "evening", value: string) => {
    app.updateSettings(kind === "morning" ? { morningTime: value } : { eveningTime: value });
    const enabled = kind === "morning" ? s.morningReminder : s.eveningReminder;
    if (enabled && permissionState() === "granted") {
      try {
        await scheduleReminder(kind, value);
      } catch {
        toast.show("حُفظ الوقت، لكن تعذّرت إعادة جدولة التنبيه", "error");
      }
    }
  };

  const storage = probeStorage();
  const audioTotal = audioUrls().length;

  /** تنزيل كل التلاوات غير المحفوظة — مرة واحدة يختارها المستخدم، مع تقدّم */
  const startAudioDownload = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.show("تحتاج اتصالًا بالإنترنت لتنزيل التلاوات", "error");
      return;
    }
    setAudioDl({ done: 0, total: audioTotal });
    try {
      const result = await downloadAllAudio((p) => setAudioDl({ done: p.done, total: p.total }));
      const list = await savedAudio();
      setSavedCount(list.length);
      setAudioDl(null);
      if (result.failed === 0) {
        toast.show("اكتمل تنزيل التلاوات — تعمل الآن دون اتصال", "success");
      } else {
        toast.show(
          `حُفظت ${result.ok} وتبقّى ${result.failed} — أعد المحاولة لاحقًا`,
          "error"
        );
      }
    } catch {
      setAudioDl(null);
      toast.show("تعذّر تنزيل التلاوات", "error");
    }
  };

  /** مسح التلاوات المحفوظة فقط — لا يمسّ التقدّم أو الإعدادات */
  const clearAudioDownloads = async () => {
    await clearDownloadedAudio();
    setSavedCount(0);
    toast.show("مُسحت التلاوات المحفوظة", "success");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
        الإعدادات
      </h1>
      <p className="text-sm" style={{ color: "var(--text-soft)" }}>
        تُحفظ اختياراتك على هذا الجهاز فقط، وتُستعاد تلقائيًا في المرة القادمة.
      </p>

      {/* المظهر */}
      <Section title="المظهر">
        <Field label="الوضع">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["light", "فاتح"],
                ["dark", "ليلي"],
                ["system", "حسب الجهاز"],
              ] as Array<[ThemeChoice, string]>
            ).map(([value, label]) => (
              <Choice key={value} active={s.theme === value} onClick={() => app.updateSettings({ theme: value })}>
                {label}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="حجم خط الأذكار" hint="يُحدَّث فورًا في كل الصفحات، ودون قص النصوص.">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="tap"
              aria-label="صغّر الخط"
              disabled={s.fontScale <= 1}
              onClick={() => app.updateSettings({ fontScale: (s.fontScale - 1) as never })}
              style={{ opacity: s.fontScale <= 1 ? 0.45 : 1 }}
            >
              <MinusIcon width={20} height={20} />
            </button>
            <div className="flex gap-1" role="group" aria-label="مستويات حجم الخط">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="tap"
                  style={{ width: "2.4rem", height: "2.4rem", fontSize: "0.8rem", fontWeight: 700 }}
                  aria-pressed={s.fontScale === n}
                  aria-label={`مستوى ${n}`}
                  onClick={() => app.updateSettings({ fontScale: n as never })}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="tap"
              aria-label="كبّر الخط"
              disabled={s.fontScale >= 5}
              onClick={() => app.updateSettings({ fontScale: (s.fontScale + 1) as never })}
              style={{ opacity: s.fontScale >= 5 ? 0.45 : 1 }}
            >
              <PlusIcon width={20} height={20} />
            </button>
          </div>
          <p
            className="dhikr-text mt-3 rounded-xl p-3"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
          </p>
        </Field>

        <Field label="خط النصوص" hint="خط «ثمانية» لم يُستخدم لأن ترخيصه يمنع تضمينه على الويب. استُبدل بخطوط مفتوحة الترخيص.">
          <div className="flex flex-wrap gap-2">
            {FONTS.map(([value, label, desc]) => (
              <Choice key={value} active={s.font === value} onClick={() => app.updateSettings({ font: value })} title={desc}>
                {label}
              </Choice>
            ))}
          </div>
        </Field>
      </Section>

      {/* العدّاد */}
      <Section title="المسبحة والعدّاد">
        <Toggle
          label="السماح بتجاوز العدد المستهدف"
          hint="عند الإيقاف، يتوقف العدّاد عند العدد المنقول في المصدر. هذا إعداد اختياري ولا يغيّر عدد المصدر نفسه."
          checked={s.allowOverCount}
          onChange={(v) => app.updateSettings({ allowOverCount: v })}
        />
        <Toggle
          label="اهتزاز خفيف عند كل ضغطة"
          hint="اختياري، ومعطّل افتراضيًا. لا يوجد أي صوت تلقائي في الموقع."
          checked={s.haptics}
          onChange={(v) => app.updateSettings({ haptics: v })}
        />
      </Section>

      {/* التذكيرات */}
      <Section title="التذكيرات" icon={<BellIcon width={18} height={18} />}>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          التذكيرات تظهر عبر إشعارات المتصفح، وتتطلب إذنًا منك أول مرة. تعمل عندما يكون
          الموقع مفتوحًا أو مثبّتًا على الجهاز، وقد تختلف بحسب المتصفح ونظام التشغيل.
        </p>

        {perm === "denied" && (
          <p className="badge-review rounded-xl p-3 text-sm font-semibold">
            رُفض إذن التنبيهات. لتغيير ذلك: افتح إعدادات الموقع في المتصفح ثم امنح الإذن، ثم عُد إلى هنا.
          </p>
        )}
        {perm === "unsupported" && (
          <p className="badge-review rounded-xl p-3 text-sm font-semibold">
            هذا المتصفح لا يدعم واجهة التنبيهات، لذا التذكيرات غير متاحة هنا.
          </p>
        )}

        <ReminderRow
          label="تذكير الصباح"
          time={s.morningTime}
          enabled={s.morningReminder}
          onToggle={(v) => toggleReminder("morning", v)}
          onTime={(v) => changeTime("morning", v)}
        />
        <ReminderRow
          label="تذكير المساء"
          time={s.eveningTime}
          enabled={s.eveningReminder}
          onToggle={(v) => toggleReminder("evening", v)}
          onTime={(v) => changeTime("evening", v)}
        />
      </Section>

      {/* الاستماع دون اتصال */}
      <Section title="الاستماع دون اتصال" icon={<OfflineIcon width={18} height={18} />}>
        <Field
          label="التلاوات الصوتية"
          hint="24 تلاوة من موقع حصن المسلم — تُحفظ على هذا الجهاز فقط (≈12MB) ويمكن مسحها في أي وقت. أي تلاوة تشغّلها تُحفَظ تلقائيًا؛ والتنزيل هنا يكفي لتنزيل البقية دفعة واحدة."
        >
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            {savedCount === null
              ? "جارٍ فحص المحفوظ…"
              : `المحفوظ على هذا الجهاز: ${savedCount} من ${audioTotal}`}
          </p>

          {audioDl ? (
            <div className="mt-2">
              <span
                className="progress-track block"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={audioDl.total}
                aria-valuenow={audioDl.done}
                aria-label={`تنزيل التلاوات: ${audioDl.done} من ${audioDl.total}`}
              >
                <span
                  className="progress-fill block"
                  style={{ width: `${(audioDl.done / audioDl.total) * 100}%` }}
                />
              </span>
              <p className="mt-1.5 text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
                تمّ {audioDl.done} من {audioDl.total}
              </p>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={startAudioDownload}
                disabled={savedCount !== null && savedCount >= audioTotal}
              >
                {savedCount !== null && savedCount >= audioTotal
                  ? "التلاوات منزَّلة كاملة ✓"
                  : savedCount !== null && savedCount > 0
                    ? `متابعة التنزيل (${savedCount} من ${audioTotal})`
                    : `تنزيل كل التلاوات (≈12MB)`}
              </button>
              {savedCount !== null && savedCount > 0 && (
                <button type="button" className="btn btn-ghost" onClick={clearAudioDownloads}>
                  مسح المحفوظ
                </button>
              )}
            </div>
          )}
        </Field>
      </Section>

      {/* السجل والبيانات */}
      <Section title="السجل والبيانات">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="سلسلة الأيام" value={app.streak} />
          <Stat label="أطول سلسلة" value={app.best} />
          <Stat label="مجموع التكرارات" value={app.lifetimeRepeats} />
        </dl>

        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          اليوم الجديد يبدأ عند منتصف الليل بتوقيت الجهاز. «يوم مُنجز» هو ما أُنِّج فيه ذكر
          واحد على الأقل، والسلسلة هي عدد الأيام المتتالية المُنجزة.
        </p>

        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">سيُمحى كل تقدّمك وسجلك. متأكد؟</span>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                app.resetAll();
                clearReminders();
                setConfirmReset(false);
                toast.show("مُسح كل البيانات المحلية", "success");
              }}
            >
              نعم، امسح كل شيء
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              تراجع
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            مسح كل بياناتي المحلية
          </button>
        )}

        {!storage.available && (
          <p className="badge-review rounded-xl p-3 text-sm font-semibold">
            التخزين المحلي غير متاح: {storage.reason}
          </p>
        )}
      </Section>

      <Section title="عن التطبيق">
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-soft)" }}>
          <li>
            <strong>ذِكري</strong> — لحظات ذكر، وسكينة تتجدد.
          </li>
          <li>النصوص مأخوذة عن «حصن المسلم»، والآيات برسم عثماني.</li>
          <li>
            <a href="#/sources" className="underline" style={{ color: "var(--accent-strong)" }}>
              راجع حالة توثيق المراجع
            </a>
          </li>
          <li>لا يجمع الموقع أي بيانات شخصية، ولا يحتاج حسابًا أو اتصالًا بخادم.</li>
        </ul>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* مكوّنات مساعدة                                                      */
/* ------------------------------------------------------------------ */

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold" style={{ color: "var(--primary)" }}>
        {icon}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold">{label}</p>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="btn"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        minHeight: "2.4rem",
        fontSize: "0.88rem",
        background: active ? "var(--accent)" : "var(--surface-2)",
        color: active ? "var(--on-accent)" : "var(--text-soft)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold">{label}</p>
        {hint && (
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
            {hint}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ insetInlineStart: checked ? "1.5rem" : "0.2rem" }}
        />
      </button>
    </div>
  );
}

function ReminderRow({
  label,
  time,
  enabled,
  onToggle,
  onTime,
}: {
  label: string;
  time: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onTime: (v: string) => void;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={label}
          onClick={() => onToggle(!enabled)}
          className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
          style={{ background: enabled ? "var(--accent)" : "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
            style={{ insetInlineStart: enabled ? "1.5rem" : "0.2rem" }}
          />
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <span style={{ color: "var(--text-soft)" }}>الوقت</span>
        <input
          type="time"
          value={time}
          onChange={(e) => onTime(e.target.value)}
          className="rounded-lg px-2 py-1"
          style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
          aria-label={`وقت ${label}`}
        />
      </label>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <dt className="text-xs" style={{ color: "var(--text-soft)" }}>
        {label}
      </dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
