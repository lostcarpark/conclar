import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import Day from "./Day";
import configData from "../config.json";

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
    if (item.date !== curDate) {
      if (itemRows.length > 0) {
        rows.push(
          <Day
            key={curDate}
            date={curDate}
            items={itemRows}
            forceExpanded={forceExpanded}
          />
        );
        itemRows = [];
      }
      curDate = item.date;
    }
    itemRows.push(item);
  });
  rows.push(
    <Day
      key={curDate}
      date={curDate}
      items={itemRows}
      forceExpanded={forceExpanded}
    />
  );
  const localTime =
    offset === null ? (
      <div className="time-local-message">{configData.LOCAL_TIME.FAILURE}</div>
    ) : offset !== 0 && showLocalTime ? (
      <div className="time-local-message">{configData.LOCAL_TIME.NOTICE}</div>
    ) : (
      ""
    );
  return (
    <div className="program-container">
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
