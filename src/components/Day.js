import PropTypes from "prop-types";
import TimeSlot from "./TimeSlot";
import { LocalTime } from "../utils/LocalTime";
//import { IoSyncCircleOutline } from "react-icons/io5";

const Day = ({ date, items, forceExpanded }) => {
  const day = LocalTime.formatDateForLocaleAsUTC(date);
  const rows = [];
  let itemRows = [];
  let curDateAndTime = null;
  items.forEach((item) => {
    if (curDateAndTime === null || !item.dateAndTime.equals(curDateAndTime)) {
      if (itemRows.length > 0) {
        rows.push(
          <TimeSlot
            key={curDateAndTime.toString()}
            dateAndTime={curDateAndTime}
            items={itemRows}
            forceExpanded={forceExpanded}
          />
        );
        itemRows = [];
      }
      curDateAndTime = item.dateAndTime;
    }
    itemRows.push(item);
  });
  rows.push(
    <TimeSlot
      key={curDateAndTime.toString()}
      dateAndTime={curDateAndTime}
      items={itemRows}
      forceExpanded={forceExpanded}
    />
  );

  return (
    <div id={day} className="date">
      <div className="date-heading">{day}</div>
      <div className="date-items">{rows}</div>
    </div>
  );
};

Day.defaultProps = {
  forceExpanded: false,
};

Day.propTypes = {
  items: PropTypes.array,
  forceExpanded: PropTypes.bool,
};

export default Day;
