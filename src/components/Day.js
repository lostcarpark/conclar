import PropTypes from "prop-types";
import TimeSlot from "./TimeSlot";
import { LocalTime } from "../utils/LocalTime";

const Day = ({ date, items, forceExpanded }) => {
  const day = LocalTime.formatDateForLocaleAsUTC(date);
  const rows = [];
  let itemRows = [];
  let curTime = null;
  items.forEach((item) => {
    if (item.time !== curTime) {
      if (itemRows.length > 0) {
        rows.push(
          <TimeSlot
            key={curTime}
            time={curTime}
            items={itemRows}
            forceExpanded={forceExpanded}
          />
        );
        itemRows = [];
      }
      curTime = item.time;
    }
    itemRows.push(item);
  });
  rows.push(
    <TimeSlot
      key={curTime}
      time={curTime}
      items={itemRows}
      forceExpanded={forceExpanded}
    />
  );

  return (
    <div id={date} className="date">
      <div className="date-heading">{day}</div>
      <div className="date-items">{rows}</div>
    </div>
  );
};

Day.defaultProps = {
  forceExpanded: false,
};

Day.propTypes = {
  date: PropTypes.string,
  items: PropTypes.array,
  forceExpanded: PropTypes.bool,
};

export default Day;
