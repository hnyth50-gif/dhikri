import { useRef, useState } from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { BackIcon, HomeIcon, Logo, MenuIcon, MoonIcon, SearchIcon, SettingsIcon, SunIcon } from "./Icons";
import MoreSheet, { MORE_GROUPS, SECONDARY_PATHS } from "./MoreSheet";
import InstallPrompt from "./InstallPrompt";

/**
 * الهيكل العام: رأس علوي + محتوى + تذييل + شريط تنقل سفلي.
 * التنقّل السفلي مقصود: يجعل الوظائف الأساسية قابلة للوصول بإبهام واحد على
 * الهاتف، والصفحات الثانوية مجمّعة خلف زر «المزيد» حتى لا يتضخّم الشريط.
 */
export default function Layout() {
  const { updateSettings, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const onSecondary = SECONDARY_PATHS.includes(location.pathname);

  /**
   * زر «رجوع»: يظهر فقط إن كانت هناك صفحة سابقة **داخل الموقع** في هذه الجلسة.
   * react-router يخزّن موضع الدخول (`idx`) في `history.state`: القيمة 0 هي أول
   * صفحة فُتحت بها الجلسة (رابط مباشر أو أول دخول)، وما بعدها تنقّل داخلي.
   * فلو دخل أحدهم على صفحة برابط مباشر بلا تنقل سابق، لا يظهر الزر أصلًا —
   * حتى لا يُخرج الزر المستخدم من الموقع. ويستمر العمل بعد إعادة تحميل الصفحة
   * لأن حالة الدخول تبقى محفوظة في جلسة المتصفح.
   * وهذا أهمّ في وضع التطبيق المثبَّت (PWA) حيث لا يوجد شريط متصفح بزر رجوع.
   */
  const historyState = window.history.state as { idx?: number } | null;
  const canGoBack = typeof historyState?.idx === "number" && historyState.idx > 0;

  /**
   * رابط «تخطَّ إلى المحتوى» لا يغيّر العنوان: الموقع يوجّه كل `#` عبر
   * HashRouter، فلو تركنا الرابط يعمل لتنقّل المستخدم إلى صفحة غير موجودة
   * بدل أن يقفز إلى المحتوى. نمنع السلوك الافتراضي وننقل التركيز يدويًا.
   */
  const skipToMain = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const main = document.getElementById("main");
    if (!main) return;
    main.setAttribute("tabindex", "-1");
    // نؤجّل التركيز جولة واحدة: المتصفح يعيد ضبط التركيز بعد انتهاء سلوك
    // الرابط الافتراضي، وبدون ذلك يبقى التركيز على الرابط نفسه.
    window.setTimeout(() => {
      main.focus();
      main.addEventListener("blur", () => main.removeAttribute("tabindex"), { once: true });
    }, 0);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-3 pb-24 pt-3 sm:px-5">
      <a
        href="#main"
        onClick={skipToMain}
        // بعض المتصفحات لا تُطلق `click` من مفتاح Enter على الروابط، فنتكفّل بأنفسنا
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") skipToMain(e);
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:right-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:font-bold"
      >
        تخطَّ إلى المحتوى
      </a>

      <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <Logo size={38} />
          <span>
            <span className="block text-xl font-bold leading-tight" style={{ color: "var(--primary)" }}>
              ذِكري
            </span>
            <span className="block text-[0.72rem]" style={{ color: "var(--text-faint)" }}>
              لحظات ذكر، وسكينة تتجدد
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="tap"
            aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الليلي"}
            title={isDark ? "الوضع الفاتح" : "الوضع الليلي"}
            onClick={() => updateSettings({ theme: isDark ? "light" : "dark" })}
          >
            {isDark ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
          </button>
          <Link to="/settings" className="tap" aria-label="الإعدادات" title="الإعدادات">
            <SettingsIcon width={20} height={20} />
          </Link>
        </div>
      </header>

      {canGoBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="الرجوع إلى الصفحة السابقة"
          className="btn btn-ghost mb-2 self-start"
        >
          <BackIcon width={16} height={16} />
          رجوع
        </button>
      )}

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />

      <nav className="bottom-nav no-print fixed inset-x-0 bottom-0 z-40" aria-label="التنقل الرئيسي">
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          <NavItem to="/" label="الرئيسية" icon={<HomeIcon width={22} height={22} />} end />
          <NavItem to="/morning" label="الصباح" icon={<SunIcon width={22} height={22} />} />
          <NavItem to="/evening" label="المساء" icon={<MoonIcon width={22} height={22} />} />
          <NavItem to="/search" label="بحث ومفضلة" icon={<SearchIcon width={22} height={22} />} />
          <li>
            <button
              ref={moreBtnRef}
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-current={onSecondary ? "page" : undefined}
              className="flex min-w-[3.6rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[0.72rem] font-semibold transition-colors"
              style={{
                color: onSecondary ? "var(--accent-strong)" : "var(--text-faint)",
                background: onSecondary ? "var(--accent-soft)" : "transparent",
              }}
            >
              <MenuIcon width={22} height={22} />
              <span>المزيد</span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} triggerRef={moreBtnRef} />

      {/* تنبيه التثبيت: يظهر وحده إن كان التثبيت ممكنًا فعلًا — راجع src/lib/installPrompt.ts */}
      <InstallPrompt />
    </div>
  );
}

function Footer() {
  return (
    <footer className="no-print mt-10 border-t pt-6" style={{ borderColor: "var(--border)" }}>
      <div className="grid gap-5 sm:grid-cols-3">
        {MORE_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--text-faint)" }}>
              {group.title}
            </h2>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm font-semibold no-underline"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-xs" style={{ color: "var(--text-faint)" }}>
        <Logo size={26} />
        <p style={{ color: "var(--text-soft)" }}>ذِكري — لحظات ذكر، وسكينة تتجدد</p>
        <p>
          مصادر الأذكار معلنة ومراجَعة في{" "}
          <Link to="/sources" className="underline" style={{ color: "var(--accent-strong)" }}>
            صفحة المصادر
          </Link>{" "}
          — راجعها قبل الاعتماد.
        </p>
        <p>
          الموقع لا يجمع بياناتك ولا يرسلها إلى أحد، التفاصيل في{" "}
          <Link to="/privacy" className="underline" style={{ color: "var(--accent-strong)" }}>
            سياسة الخصوصية
          </Link>
          .
        </p>
        <p dir="ltr">آخر تحديث: 2026-10-17</p>
      </div>
    </footer>
  );
}

function NavItem({
  to,
  label,
  icon,
  end,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className="flex min-w-[3.6rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[0.72rem] font-semibold no-underline transition-colors"
        style={({ isActive }) => ({
          color: isActive ? "var(--accent-strong)" : "var(--text-faint)",
          background: isActive ? "var(--accent-soft)" : "transparent",
        })}
      >
        {icon}
        <span>{label}</span>
      </NavLink>
    </li>
  );
}
