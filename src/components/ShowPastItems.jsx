import { useStoreState, useStoreActions } from "easy-peasy";
import PropTypes from "prop-types";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";
import { programTimePropType } from "../utils/ProgramTime";
import Switch from "./Switch";

const ShowPastItems = ({ programTime }) => {
  const showPastItems = useStoreState((state) => state.showPastItems);
  const setShowPastItems = useStoreActions(
    (actions) => actions.setShowPastItems
  );
  return programTime.isDuringCon() &&
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

ShowPastItems.propTypes = {
  programTime: programTimePropType.isRequired,
};

export default ShowPastItems;
