import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";
import Switch from "./Switch";

const ShowPastItems = () => {
  const program = useStoreState((state) => state.program);
  const showPastItems = useStoreState((state) => state.showPastItems);
  const setShowPastItems = useStoreActions(
    (actions) => actions.setShowPastItems
  );
  return LocalTime.isDuringCon(program) &&
    configData.SHOW_PAST_ITEMS.SHOW_CHECKBOX ? (
    <Switch
      id={LocalTime.pastItemsClass}
      label={configData.SHOW_PAST_ITEMS.CHECKBOX_LABEL}
      checked={showPastItems}
      onChange={setShowPastItems} />
  ) : (
    ""
  );
};

export default ShowPastItems;
