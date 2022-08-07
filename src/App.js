import { StoreProvider, createStore } from "easy-peasy";

import model from "./model";
import AppRoutes from "./components/AppRoutes";

import "./App.css";

const store = createStore(model);

const App = () => {

  return (
    <StoreProvider store={store}>
      <AppRoutes />
    </StoreProvider>
  );
};

export default App;
