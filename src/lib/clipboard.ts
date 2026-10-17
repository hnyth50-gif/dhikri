/**
 * النسخ إلى الحافظة بسلسلة بدائل حقيقية، لا برسالة نجاح وهمية.
 * 1) Clipboard API الحديث — أول اختيار.
 * 2) الطريقة القديمة عبر textarea + execCommand — تعمل حين تُرفض صلاحية
 *    الحافظة (كما يحدث في النوافذ الآلية أو عند منع الإذن)، ويكفيها إشارة
 *    فعلية من المستخدم (نقرة أو مفتاح).
 * تُعيد true فقط إذا تأكّد النسخ فعلًا.
 *
 * ملاحظة: الدالة منفصلة عن أي صفحة حتى تُستخدم من بطاقة الذكر
 * وصفحة تواصل معنا دون نسخ الكود مرتين.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* لا نتسرّع في القول إن النسخ فشل — نجرّب البديل */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
