import { StoreProvider, createStore } from "easy-peasy";

import model from "./model";
import AppRoutes from "./components/AppRoutes";

import "./App.css";

const store = createStore(model);

const App = () => {

  // if (data === null)
  //   return (
  //     <div>
  //       <h1>Program data loading...</h1>
  //     </div>
  //   );
  return (
    <StoreProvider store={store}>
      <AppRoutes />
    </StoreProvider>
  );
};

export default App;
