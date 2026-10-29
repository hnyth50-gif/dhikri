import { useEffect, useRef } from "react";
import { useToast } from "./Toast";
import { useCloudSession } from "../lib/cloudNotes";

/**
 * مُراقِب الجلسة — يفعل شيئين صغيرين لا غير:
 *  1. يبدأ مراقبة الدخول مع أول تركيب للهيكل العام، فيُلتقط استبدال رابط
 *     البريد (؟code=) حتى لو هبط المستخدم في الصفحة الرئيسية لا في «ملاحظاتي».
 *  2. يُعلم المستخدم بتحقيق الدخول برسالة واحدة قصيرة، لأن رابط البريد
 *     يفتح في تبويب جديد وقد ينصرف عن موضعه.
 * لا يُظهر ولا يُخفي أي واجهة، ولا يُرسل أي طلب بحد ذاته.
 */
export default function SignInWatcher() {
  const toast = useToast();
  const { session, loading } = useCloudSession();
  const baseline = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    const email = session?.user?.email ?? null;
    if (baseline.current === undefined) {
      baseline.current = email; // أول قراءة: خط أساس بلا إعلان
      return;
    }
    if (email && !baseline.current) {
      toast.show(`تم تسجيل الدخول بحساب ${email} — افتح «ملاحظاتي» لرؤية ملاحظاتك`, "success");
    }
    baseline.current = email;
  }, [session, loading, toast]);

  return null;
}
