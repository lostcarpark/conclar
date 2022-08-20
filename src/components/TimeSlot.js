import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import ProgramItem from "./ProgramItem";
import { LocalTime } from "../utils/LocalTime";

const TimeSlot = ({ dateAndTime, items, forceExpanded }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const timeZoneIsShown = useStoreState((state) => state.timeZoneIsShown);
  if (!dateAndTime) return "";
  const conTime = (
    <div className="time-convention">
      {LocalTime.formatTimeInConventionTimeZone(
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
      <ProgramItem key={item.id} item={item} forceExpanded={forceExpanded} />
    );
  });

  return (
    <div id={dateAndTime.toString()} className="timeslot">
      <div className={timeSlotClass}>
        {conTime}
        {localTime}
      </div>
      <div className="timeslot-items">{rows}</div>
    </div>
  );
};

TimeSlot.defaultProps = {
  forceExpanded: false,
};

TimeSlot.propTypes = {
  items: PropTypes.array,
  forceExpanded: PropTypes.bool,
};

export default TimeSlot;
