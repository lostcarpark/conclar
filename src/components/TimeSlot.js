// import PropTypes from 'prop-types'
import ProgramItem from "./ProgramItem";
import { LocalTime } from "../utils/LocalTime";

const TimeSlot = ({ time, offset, showLocalTime, show12HourTime, items, handler }) => {
	if (!time)
		return "";
  const conTime = (
    <div className="time-convention">
      {LocalTime.formatTimeInConventionTimeZone(time, show12HourTime)}
    </div>
  );
  const localTime =
    offset !== null && offset !== 0 && showLocalTime ? (
      <div className="time-local">
        {LocalTime.formatTimeInLocalTimeZone(time, offset, show12HourTime)}
      </div>
    ) : (
      ""
    );
  const rows = [];
  items.forEach((item) => {
    rows.push(<ProgramItem key={item.id} item={item} handler={handler} />);
  });

  return (
    <div id={time} className="timeslot">
      <div className="timeslot-time">
        {conTime}
        {localTime}
      </div>
      <div className="timeslot-items">{rows}</div>
    </div>
  );
};

// Day.PropTypes = {
//     date: PropTypes.string
// }

export default TimeSlot;
