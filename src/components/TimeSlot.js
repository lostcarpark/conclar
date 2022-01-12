// import PropTypes from 'prop-types'
import ProgramItem from "./ProgramItem";
import { Format } from "../utils/Format";

const TimeSlot = ({ time, offset, showLocalTime, items, handler }) => {
  const conTime = (
    <div className="time-convention">
      {Format.formatTimeInConventionTimeZone(time)}
    </div>
  );
  const localTime =
    offset !== 0 && showLocalTime ? (
      <div className="time-local">
        {Format.formatTimeInLocalTimeZone(time, offset)}
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
