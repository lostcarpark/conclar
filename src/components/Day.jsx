import PropTypes from "prop-types";
import { memo } from "react";
import TimeSlot from "./TimeSlot";
import { LocalTime } from "../utils/LocalTime";
import { programTimePropType } from "../utils/ProgramTime";

const Day = ({ date, items, forceExpanded = false, programTime }) => {
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
            programTime={programTime}
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
      programTime={programTime}
    />
  );

  return (
    <div className="date">
      <h2 className="date-heading">{day}</h2>
      <div className="date-items">{rows}</div>
    </div>
  );
};

Day.propTypes = {
  items: PropTypes.array,
  forceExpanded: PropTypes.bool,
  programTime: programTimePropType,
};

export default memo(Day);
