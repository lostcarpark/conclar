import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import { LocalTime } from "../utils/LocalTime";
import Day from "./Day";
import configData from "../config.json";
// import { Temporal } from "@js-temporal/polyfill";

const ProgramList = ({ program, forceExpanded }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const offset = useStoreState((state) => state.offset);

  const rows = [];
  let itemRows = [];
  let curDate = null;

  if (program === null || program.length === 0) {
    return (
      <div className="program">
        <div className="program-empty">No items found.</div>
      </div>
    );
  }
  program.forEach((item) => {
    const itemDate = item.dateAndTime
      .withTimeZone(LocalTime.conventionTimezone)
      .round("day");

    if (curDate === null || !itemDate.equals(curDate)) {
      if (itemRows.length > 0) {
        rows.push(
          <Day
            key={curDate.toString()}
            date={curDate}
            items={itemRows}
            forceExpanded={forceExpanded}
          />
        );
        itemRows = [];
      }
      curDate = itemDate;
    }
    itemRows.push(item);
  });
  rows.push(
    <Day
      key={curDate.toString()}
      date={curDate}
      items={itemRows}
      forceExpanded={forceExpanded}
    />
  );
  const conventionTime = (
    <div className="time-convention-message">
      {(configData.CONVENTION_TIME.NOTICE).replace("@timezone", configData.TIMEZONE)}
    </div>
  );
  const localTime =
    offset === null ? (
      <div className="time-local-message">{configData.LOCAL_TIME.FAILURE}</div>
    ) : offset !== 0 && showLocalTime ? (
      <div className="time-local-message">{(configData.LOCAL_TIME.NOTICE).replace("@timezone", LocalTime.localTimezone)}</div>
    ) : (
      ""
    );
  return (
    <div className="program-container">
      {conventionTime}
      {localTime}
      <div className="program">{rows}</div>
    </div>
  );
};

ProgramList.defaultProps = {
  forceExpanded: false,
};

ProgramList.propTypes = {
  program: PropTypes.array,
  forceExpanded: PropTypes.bool,
};

export default ProgramList;
