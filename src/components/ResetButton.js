import { useState } from "react";
import { MdClear } from "react-icons/md";
import configData from "../config.json";

const ResetButton = ({ isFiltered, resetFilters }) => {
  // const resetFilterHelpIsShown = useStoreState(
  //   (state) => state.resetFilterHelpIsShown
  // );
  // const hideResetFilterHelp = useStoreActions(
  //   (actions) => actions.hideResetFilterHelp
  // );
  // const [state, actions] = useLocalStore(() => ({
  //   helpIsShown: true,
  //   hideHelp: action((_state) => {
  //     _state.helpIsShown = false;
  //   }),
  // }));
  const storedHideBubble = localStorage.getItem("hide_reset_bubble");
  const [hideBubble, setHideBubble] = useState(storedHideBubble === "true");

  const storeHideState = (hide) => {
    localStorage.setItem("hide_reset_bubble", hide ? "true" : "false");
  };

  const bubble =
    isFiltered && !hideBubble ? (
      <div>
        <div className="reset-bubble">
          <div className="pointer blurred"></div>
          <div className="bubble blurred"></div>
        </div>
        <div className="reset-bubble">
          <div className="pointer"></div>
          <div className="bubble">
            <p>{configData.FILTER.RESET.MESSAGE}</p>
            <button
              onClick={() => {
                setHideBubble(true);
                storeHideState(true);
              }}
            >
              {configData.FILTER.RESET.HIDE_MESSAGE}
            </button>
          </div>
        </div>
      </div>
    ) : (
      ""
    );
  return (
    <div className="reset">
      <button className="reset-button" onClick={() => resetFilters()}>
        <MdClear />
      </button>
      {bubble}
    </div>
  );
};

export default ResetButton;
