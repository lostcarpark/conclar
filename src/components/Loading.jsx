import { useStoreState } from "easy-peasy";
import configData from "../config.json";
import LoadError from "./LoadError";

const Loading = ({ children }) => {
  const isLoading = useStoreState((state) => state.isLoading);
  const loadError = useStoreState((state) => state.loadError);

  if (loadError) return <LoadError />;

  if (isLoading) return <h1>{configData.APPLICATION.LOADING.MESSAGE}</h1>;

  return <>{children}</>;
};

export default Loading;
