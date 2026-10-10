import { NavLink, Outlet, Link } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { BookIcon, HomeIcon, Logo, MoonIcon, SearchIcon, SettingsIcon, SunIcon } from "./Icons";

/**
 * الهيكل العام: رأس علوي + شريط تنقل سفلي.
 * التنقّل السفلي مقصود: يجعل الوظائف الأساسية قابلة للوصول بإبهام واحد على الهاتف.
 */
export default function Layout() {
  const { updateSettings, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

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

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <nav className="bottom-nav no-print fixed inset-x-0 bottom-0 z-40" aria-label="التنقل الرئيسي">
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          <NavItem to="/" label="الرئيسية" icon={<HomeIcon width={22} height={22} />} end />
          <NavItem to="/morning" label="الصباح" icon={<SunIcon width={22} height={22} />} />
          <NavItem to="/evening" label="المساء" icon={<MoonIcon width={22} height={22} />} />
          <NavItem to="/search" label="بحث ومفضلة" icon={<SearchIcon width={22} height={22} />} />
          <NavItem to="/sources" label="المراجع" icon={<BookIcon width={22} height={22} />} />
        </ul>
      </nav>
    </div>
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
        className={({ isActive }) =>
          `flex min-w-[3.6rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[0.72rem] font-semibold no-underline transition-colors ${
            isActive ? "" : ""
          }`
        }
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
