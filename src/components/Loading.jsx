import { useStoreState } from "easy-peasy";
import configData from "../config.json";

const Loading = ({ children }) => {
  const isLoading = useStoreState((state) => state.isLoading);
  const loadError = useStoreState((state) => state.loadError);

  if (loadError) {
    return (
      <div className="load-error">
        <h1>{configData.APPLICATION.LOADING.MESSAGE}</h1>
        <p>Sorry, the program could not be loaded.</p>
      </div>
    );
  }

  if (isLoading) return <h1>{configData.APPLICATION.LOADING.MESSAGE}</h1>;

  return <>{children}</>;
};

export default Loading;
