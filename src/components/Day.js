import PropTypes from "prop-types";
import TimeSlot from "./TimeSlot";
import { LocalTime } from "../utils/LocalTime";
import { Temporal } from "@js-temporal/polyfill";

const Day = ({ date, items, forceExpanded, now }) => {
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
            now={now}
          />
        );
        itemRows = [];
      }
      curTimeSlot = item.timeSlot;
      curDateAndTime = item.startDateAndTime;
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
      now={now}
    />
  );

  return (
    <div className="date">
      <h2 className="date-heading">{day}</h2>
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
  now: PropTypes.instanceOf(Temporal.ZonedDateTime),
};

export default Day;
