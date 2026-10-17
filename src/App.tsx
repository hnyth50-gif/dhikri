import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AdhkarPage from "./pages/AdhkarPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import SourcesPage from "./pages/SourcesPage";
import FavoritesPage from "./pages/FavoritesPage";
import WirdPage from "./pages/WirdPage";
import TasbihPage from "./pages/TasbihPage";
import AdhkarIndexPage from "./pages/AdhkarIndexPage";
import AboutPage from "./pages/AboutPage";
import FaqPage from "./pages/FaqPage";
import GuidePage from "./pages/GuidePage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import ChangelogPage from "./pages/ChangelogPage";
import NotFound from "./pages/NotFound";

/**
 * التوجيه عبر HashRouter عن قصد:
 * الموقع يُنشر كملفات ثابتة بدون خادم، وHashRouter يعمل من أي مسار ثابت
 * أو حتى من ملف محلي، ولا يحتاج قواعد إعادة توجيه على مستوى الخادم.
 */
export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="morning" element={<AdhkarPage section="morning" />} />
              <Route path="evening" element={<AdhkarPage section="evening" />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="wird" element={<WirdPage />} />
              <Route path="tasbih" element={<TasbihPage />} />
              <Route path="adhkar" element={<AdhkarIndexPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="sources" element={<SourcesPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="changelog" element={<ChangelogPage />} />
              <Route path="home" element={<Navigate to="/" replace />} />
              {/* أسماء قديمة أو مترددة → أقرب صفحة صحيحة بدل صفحة خطأ */}
              <Route path="index" element={<Navigate to="/adhkar" replace />} />
              <Route path="about-us" element={<Navigate to="/about" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
}
