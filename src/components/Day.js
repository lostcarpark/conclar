import PropTypes from "prop-types";
import TimeSlot from "./TimeSlot";
import { LocalTime } from "../utils/LocalTime";

const Day = ({ date, items, forceExpanded }) => {
  const day = LocalTime.formatDateForLocaleAsUTC(date);
  const rows = [];
  let itemRows = [];
  let curTimeSlot = null;
  let curDateAndTime = null;
  items.forEach((item) => {
    if (curTimeSlot === null || item.timeSlot !== curTimeSlot) {
      if (itemRows.length > 0) {
        rows.push(
          <TimeSlot
            key={curTimeSlot}
            timeSlot={curTimeSlot}
            dateAndTime={curDateAndTime}
            items={itemRows}
            forceExpanded={forceExpanded}
          />
        );
        itemRows = [];
      }
      curTimeSlot = item.timeSlot;
      curDateAndTime = item.dateAndTime;
    }
    itemRows.push(item);
  });
  rows.push(
    <TimeSlot
      key={curTimeSlot}
      timeSlot={curTimeSlot}
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
