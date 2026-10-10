import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AdhkarPage from "./pages/AdhkarPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import SourcesPage from "./pages/SourcesPage";
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
              <Route path="settings" element={<SettingsPage />} />
              <Route path="sources" element={<SourcesPage />} />
              <Route path="home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
}
