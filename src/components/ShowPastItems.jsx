import { useStoreState, useStoreActions } from "easy-peasy";
import PropTypes from "prop-types";
import { Temporal } from "@js-temporal/polyfill";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";
import Switch from "./Switch";

const ShowPastItems = ({ now }) => {
  const program = useStoreState((state) => state.program);
  const showPastItems = useStoreState((state) => state.showPastItems);
  const setShowPastItems = useStoreActions(
    (actions) => actions.setShowPastItems
  );
  return LocalTime.isDuringCon(program, now) &&
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
  now: PropTypes.instanceOf(Temporal.ZonedDateTime).isRequired,
};

export default ShowPastItems;
