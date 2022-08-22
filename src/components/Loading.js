import { useStoreState } from "easy-peasy";
import configData from "../config.json";

const Loading = ({ children }) => {
  const isLoading = useStoreState((state) => state.isLoading);

  if (isLoading) return <h1>{configData.APPLICATION.LOADING.MESSAGE}</h1>;

  return <>{children}</>;
};

export default Loading;
