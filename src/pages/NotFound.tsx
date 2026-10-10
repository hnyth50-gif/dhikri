import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="surface mx-auto max-w-md p-8 text-center">
      <p className="mb-2 text-5xl font-bold" style={{ color: "var(--primary)" }}>
        ٤٠٤
      </p>
      <h1 className="mb-2 text-xl font-bold">هذه الصفحة غير موجودة</h1>
      <p className="mb-6" style={{ color: "var(--text-soft)" }}>
        ربما تغيّر الرابط، أو أنهى عنوان الصفحة.
      </p>
      <Link to="/" className="btn btn-primary no-underline">
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  );
}
