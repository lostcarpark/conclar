import { StoreProvider, createStore } from "easy-peasy";

import model from "./model";
import AppRoutes from "./components/AppRoutes";
import Notification from "./components/Notification";

import "./App.css";

const store = createStore(model);

const App = () => {
  return (
    <StoreProvider store={store}>
      <AppRoutes />
      <Notification />
    </StoreProvider>
  );
};

export default App;
