import PropTypes from "prop-types";
import { memo } from "react";
import { useStoreState } from "easy-peasy";
import ProgramItem from "./ProgramItem";
import { LocalTime } from "../utils/LocalTime";
import { programTimePropType } from "../utils/ProgramTime";

const TimeSlot = ({ timeSlot, dateAndTime, items, forceExpanded = false, programTime }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const timeZoneIsShown = useStoreState((state) => state.timeZoneIsShown);
  if (!dateAndTime) return "";
  const conTime = (
    <div className="time-convention">
      {LocalTime.formatTimeInConventionTimeZone(
        timeSlot,
        dateAndTime,
        show12HourTime,
        timeZoneIsShown
      )}
    </div>
  );
  const localTime =
    showLocalTime === "always" ||
    (showLocalTime === "differs" && LocalTime.timezonesDiffer) ? (
      <div className="time-local">
        {LocalTime.formatTimeInLocalTimeZone(
          timeSlot,
          dateAndTime,
          show12HourTime,
          timeZoneIsShown
        )}
      </div>
    ) : (
      ""
    );
  const timeSlotClass =
    "timeslot-time" + (timeZoneIsShown ? " timeslot-wide" : "");
  const rows = [];
  items.forEach((item) => {
    rows.push(
      <ProgramItem
        key={item.id}
        item={item}
        forceExpanded={forceExpanded}
        programTime={programTime}
        showLocalTime={showLocalTime}
        show12HourTime={show12HourTime}
        timeZoneIsShown={timeZoneIsShown}
      />
    );
  });

  return (
    <div id={dateAndTime.toString()} className="timeslot">
      <div className={timeSlotClass} aria-hidden="true">
        <div className="time-wrapper">
          {conTime}
          {localTime}
        </div>
      </div>
      <div className="timeslot-items">{rows}</div>
    </div>
  );
};

TimeSlot.propTypes = {
  items: PropTypes.array,
  forceExpanded: PropTypes.bool,
  programTime: programTimePropType,
};

export default memo(TimeSlot);
