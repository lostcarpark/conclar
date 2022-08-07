import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";

const ShowPastItems = () => {
  const program = useStoreState((state) => state.program);
  const showPastItems = useStoreState((state) => state.showPastItems);
  const setShowPastItems = useStoreActions(
    (actions) => actions.setShowPastItems
  );
  return LocalTime.isDuringCon(program) &&
    configData.SHOW_PAST_ITEMS.SHOW_CHECKBOX ? (
    <div className="past-items-checkbox switch-wrapper">
      <input
        id={LocalTime.pastItemsClass}
        name={LocalTime.pastItemsClass}
        className="switch"
        type="checkbox"
        checked={showPastItems}
        onChange={(e) => {setShowPastItems(e.target.checked)}}
      />
      <label htmlFor={LocalTime.pastItemsClass}>
        {configData.SHOW_PAST_ITEMS.CHECKBOX_LABEL}
      </label>
    </div>
  ) : (
    ""
  );
};

export default ShowPastItems;
