import { useEffect } from "react";
import { useStoreActions } from "easy-peasy";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import configData from "../config.json";
import ScrollToTop from "./ScrollToTop";
import Header from "./Header";
import Navigation from "./Navigation";
import NotFound from "./NotFound";
import FilterableProgram from "./FilterableProgram";
import MySchedule from "./MySchedule";
import People from "./People";
import Person from "./Person";
import Info from "./Info";
import Footer from "./Footer";

const AppRoutes = () => {
  const fetchProgram = useStoreActions((actions) => actions.fetchProgram);

  useEffect(() => {
    fetchProgram();
    // eslint-disable-next-line
  }, []);

  return (
    <Router basename={configData.BASE_PATH}>
      <ScrollToTop>
        <div className="App">
          <Header title={configData.APP_TITLE} />
          <Navigation />

          <Routes>
            <Route path="/">
              <Route index element={<FilterableProgram />} />
              <Route path="people">
                <Route index element={<People />} />
                <Route path=":id" element={<Person />} />
              </Route>
              <Route path="myschedule" element={<MySchedule />} />
              <Route path="info" element={<Info />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </div>
      </ScrollToTop>
    </Router>
  );
};

export default AppRoutes;
