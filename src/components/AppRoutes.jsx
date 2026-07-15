import { useEffect, lazy, Suspense } from "react";
import { useStoreState, useStoreActions } from "easy-peasy";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import configData from "../config.json";
import { isSyncEnabled } from "../SyncService";
import InfoPopup from "./InfoPopup";
import ScrollToTop from "./ScrollToTop";
import Timer from "./Timer";
import Debug from "./Debug";
import Header from "./Header";
import HelpText from "./HelpText";
import Sidebar from "./Sidebar";
import NotFound from "./NotFound";
import Loading from "./Loading";
import FilterableProgram from "./FilterableProgram";
import UnfilterableProgram from "./UnfilterableProgram";
import MySchedule from "./MySchedule";
import ItemById from "./ItemById";
import ItemByIdList from "./ItemByIdList";
import LocationProgramme from "./LocationProgramme";
import People from "./People";
import Person from "./Person";
import Settings from "./Settings";
import Footer from "./Footer";

const Info = lazy(() => import("./Info"));

const AppRoutes = () => {
  const appClasses =
    "App" + (configData.DEBUG_MODE.ENABLE ? " debug-mode" : "");
  const darkMode = useStoreState((state) => state.darkMode);
  const showSyncWarning = useStoreState((state) => state.showSyncWarning);
  const userProfile = useStoreState((state) => state.userProfile);
  const setShowSyncWarning = useStoreActions((actions) => actions.setShowSyncWarning);

  useEffect(() => {
    document.title = configData.APP_TITLE;
  }, []);

  // Resolve the dark-mode setting onto <html data-theme="light|dark">, which
  // darkmode.css keys off. "light"/"dark" force the theme; "browser" follows the
  // OS preference and keeps tracking it via the matchMedia change listener.
  useEffect(() => {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark =
        darkMode === "dark" ||
        (darkMode !== "light" && !!prefersDark?.matches);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    };
    apply();
    if (darkMode !== "browser" || !prefersDark) return;
    prefersDark.addEventListener("change", apply);
    return () => prefersDark.removeEventListener("change", apply);
  }, [darkMode]);

  const theApp = configData.INTERACTIVE ? (
    <div className={appClasses}>
      <Timer tick={configData.TIMER.TIMER_TICK_SECS} />
      <Debug />
      <Sidebar />
      <div className="main-column">
        <HelpText />
        <Routes>
          <Route path="/">
            {/* FilterableProgram manages its own loading state so the filter
                bar can appear immediately (disabled placeholders) instead of
                waiting behind the generic loading spinner. */}
            <Route index element={<FilterableProgram />} />
            <Route path="/index.html" element={<FilterableProgram />} />
            <Route path="id/:id" element={<Loading><ItemById /></Loading>} />
            <Route path="ids/:idList" element={<Loading><ItemByIdList /></Loading>} />
            <Route path="loc/:locList" element={<Loading><LocationProgramme /></Loading>} />
            <Route path="people">
              <Route index element={<Loading><People /></Loading>} />
              <Route path=":id" element={<Loading><Person /></Loading>} />
            </Route>
            <Route path="myschedule" element={<Loading><MySchedule /></Loading>} />
            <Route
              path="info"
              element={
                <Loading>
                  <Suspense fallback={null}>
                    <Info />
                  </Suspense>
                </Loading>
              }
            />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {isSyncEnabled() && (
        <InfoPopup
          isOpen={showSyncWarning}
          graphic={
            <svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {/* Laptop screen frame */}
              <rect x="5" y="5" width="95" height="62" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              {/* Laptop screen surface */}
              <rect x="10" y="10" width="85" height="51" rx="2" fill="currentColor" fillOpacity="0.1" />
              {/* Laptop base */}
              <rect x="0" y="67" width="105" height="8" rx="4" fill="currentColor" fillOpacity="0.7" />
              {/* Dashed line: laptop to lock */}
              <line x1="103" y1="50" x2="115" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
              {/* Lock shackle */}
              <path d="M 121,42 L 121,30 Q 130,22 139,30 L 139,42" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Lock body */}
              <rect x="117" y="40" width="26" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
              {/* Keyhole */}
              <circle cx="130" cy="48" r="2.5" fill="currentColor" fillOpacity="0.6" />
              <rect x="129" y="50" width="2" height="4" rx="1" fill="currentColor" fillOpacity="0.6" />
              {/* Dashed line: lock to phone */}
              <line x1="145" y1="50" x2="157" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
              {/* Phone body */}
              <rect x="159" y="5" width="40" height="70" rx="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
              {/* Phone screen */}
              <rect x="164" y="18" width="30" height="48" rx="2" fill="currentColor" fillOpacity="0.1" />
              {/* Phone camera */}
              <circle cx="179" cy="12" r="2" fill="currentColor" fillOpacity="0.5" />
              {/* Phone home bar */}
              <rect x="171" y="70" width="16" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.5" />
            </svg>
          }
          heading={configData.SYNC.WARNING.HEADING}
          title={configData.SYNC.WARNING.TITLE}
          details={configData.SYNC.WARNING.DETAILS}
          detailsLabel={configData.SYNC.WARNING.DETAILS_LABEL}
          primaryAction={
            userProfile && userProfile.login_url
              ? { label: configData.SYNC.WARNING.LOGIN_LABEL, href: userProfile.login_url }
              : undefined
          }
          dismissLabel={configData.SYNC.WARNING.DISMISS_LABEL}
          onDismiss={() => setShowSyncWarning(false)}
        />
      )}
    </div>
  ) : (
    <div className="App App--single-column">
      <div className="main-column">
        <Header title={configData.APP_TITLE} showNavigation={false} />
        <Loading>
          <Routes>
            <Route path="/">
              <Route index element={<UnfilterableProgram />} />
              <Route path="/index.html" element={<UnfilterableProgram />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Loading>
        <Footer />
      </div>
    </div>
  );

  const fetchProgram = useStoreActions((actions) => actions.fetchProgram);
  const fetchProfile = useStoreActions((actions) => actions.fetchProfile);

  useEffect(() => {
    fetchProgram(true);
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  return (
    <Router basename={window.publicUrl}>
      <ScrollToTop>{theApp}</ScrollToTop>
    </Router>
  );
};

export default AppRoutes;
