/**
 * التذكيرات الصباحية والمسائية.
 *
 * ما يمكن فعليًا وما لا يمكن — مُصرَّح به هنا وفي الواجهة:
 *  - هذه الطبقة تستخدم واجهة Notification في المتصفح مع مؤقّت داخلي.
 *  - التنبيه يظهر فقط بينما يكون الموقع مفتوحًا في تبويب، أو مثبّتًا كتطبيق
 *    ومفتوح في الخلفية. لا يمكن جدولة تنبيه في وقت لاحق بعد إغلاق المتصفح
 *    دون خدمة خارجية (Web Push + خادم)، وهي خارج نطاق هذه النسخة.
 *  - لذلك نطلب الإذن أول مرة فقط، ولا نعرض أي دعوة قبل طلبه فعلًا.
 */

export type PermissionState = NotificationPermission | "unsupported";

export function permissionState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<PermissionState> {
  if (permissionState() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

const timers: Record<"morning" | "evening", number> = {
  morning: 0,
  evening: 0,
};

const COPY = {
  morning: {
    title: "أذكار الصباح",
    body: "لحظات ذكر، وسكينة تتجدّد — ابدأ أذكار الصباح.",
  },
  evening: {
    title: "أذكار المساء",
    body: "لحظات ذكر، وسكينة تتجدّد — ابدأ أذكار المساء.",
  },
} as const;

/** يجدول تنبيهًا داخليًا للوقت المحدد، ويلغي أي تنبيه سابق لنفس القسم */
export function scheduleReminder(kind: "morning" | "evening", time: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (permissionState() !== "granted") {
      reject(new Error("إذن التنبيهات غير ممنوح"));
      return;
    }
    const delay = msUntil(time);
    if (delay === null) {
      reject(new Error("صيغة الوقت غير صحيحة"));
      return;
    }

    clearReminder(kind);

    const fire = () => {
      try {
        new Notification(COPY[kind].title, {
          body: COPY[kind].body,
          tag: `dhikri-${kind}`,
          lang: "ar",
          dir: "rtl",
        });
      } catch {
        /* بعض المتصفحات تتطلب Service Worker للإشعارات — نتجاهل بصمت */
      }
      // نعيد الجدولة ليوم الغد
      timers[kind] = window.setTimeout(() => scheduleReminder(kind, time).catch(() => undefined), 24 * 60 * 60 * 1000);
    };

    timers[kind] = window.setTimeout(fire, delay);
    resolve();
  });
}

export function clearReminder(kind: "morning" | "evening"): void {
  if (timers[kind]) {
    window.clearTimeout(timers[kind]);
    timers[kind] = 0;
  }
}

export function clearReminders(): void {
  clearReminder("morning");
  clearReminder("evening");
}

/** مللي ثانية حتى التوقيت القادم بنفس الساعة والدقيقة — أو null عند خطأ الصيغة */
function msUntil(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
