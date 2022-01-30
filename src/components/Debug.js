import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";

const Debug = () => {
  const timeToNextFetch = useStoreState((state) => state.timeToNextFetch);
  const fetchProgram = useStoreActions((actions) => actions.fetchProgram);
  const onLine = useStoreState((state) => state.onLine);

  if (!configData.DEBUG_MODE.ENABLE) return "";

  const handleFetch = () => {
    fetchProgram();
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
      <span className="debug-time-left">{timeToNextFetch} seconds</span>
    </div>
  );
};

export default Debug;
