import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";

const Debug = () => {
  const fetchProgram = useStoreActions((actions) => actions.fetchProgram);
  const onLine = useStoreState((state) => state.onLine);
  const setOnLine = useStoreActions((actions) => actions.setOnLine);

  if (!configData.DEBUG_MODE.ENABLE) return "";

  const handleFetch = () => {
    console.log("Fetch Data Now...");
    fetchProgram();
  };

  const handleOnLine = () => {
    setOnLine(window.navigator.onLine);
  };

  const onlineClass = onLine ? "debug-online" : "debug-offline";
  const onlineLabel = onLine
    ? configData.DEBUG_MODE.ONLINE_LABEL
    : configData.DEBUG_MODE.OFFLINE_LABEL;
  return (
    <div className={"debug " + onlineClass}>
      <span className="debug-status">{onlineLabel}</span>
      <span className="debug-fetch">
        <button onClick={handleFetch}>
          {configData.DEBUG_MODE.FETCH_BUTTON_LABEL}
        </button>
      </span>
      <span className="debug-check">
        <button onClick={handleOnLine}>Check Online</button>
      </span>
    </div>
  );
};

export default Debug;
