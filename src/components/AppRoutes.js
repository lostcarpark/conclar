import { useEffect } from "react";
import { useStoreActions } from "easy-peasy";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import configData from "../config.json";
import ScrollToTop from "./ScrollToTop";
import Timer from "./Timer";
import Debug from "./Debug";
import Header from "./Header";
import Navigation from "./Navigation";
import NotFound from "./NotFound";
import Loading from "./Loading";
import FilterableProgram from "./FilterableProgram";
import UnfilterableProgram from "./UnfilterableProgram";
import MySchedule from "./MySchedule";
import ItemById from "./ItemById";
import ItemByIdList from "./ItemByIdList";
import People from "./People";
import Person from "./Person";
import Info from "./Info";
import Settings from "./Settings";
import Footer from "./Footer";

const AppRoutes = () => {
  const appClasses = "App" + (configData.DEBUG_MODE.ENABLE ? " debug-mode" : "");
  const theApp = configData.INTERACTIVE ? (
    <div className={appClasses}>
      <Timer tick={configData.TIMER.TIMER_TICK_SECS} />
      <Debug />
      <Header title={configData.APP_TITLE} />
      <Navigation />
      <Loading>
        <Routes>
          <Route path="/">
            <Route index element={<FilterableProgram />} />
            <Route path="/index.html" element={<FilterableProgram />} />
            <Route path="id/:id" element={<ItemById />} />
            <Route path="ids/:idList" element={<ItemByIdList />} />
            <Route path="people">
              <Route index element={<People />} />
              <Route path=":id" element={<Person />} />
            </Route>
            <Route path="myschedule" element={<MySchedule />} />
            <Route path="info" element={<Info />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Loading>
      <Footer />
    </div>
  ) : (
    <div className="App">
      <Header title={configData.APP_TITLE} />
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
  );

  const fetchProgram = useStoreActions((actions) => actions.fetchProgram);

  useEffect(() => {
    fetchProgram(true);
    // eslint-disable-next-line
  }, []);

  return (
    <Router basename={configData.BASE_PATH}>
      <ScrollToTop>{theApp}</ScrollToTop>
    </Router>
  );
};

export default AppRoutes;
