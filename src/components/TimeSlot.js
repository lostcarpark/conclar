// import PropTypes from 'prop-types'
import { useStoreState } from "easy-peasy";
import ProgramItem from "./ProgramItem";
import { LocalTime } from "../utils/LocalTime";

const TimeSlot = ({ time, items }) => {
  const showLocalTime = useStoreState((state)=>state.showLocalTime);
  const show12HourTime = useStoreState((state)=>state.show12HourTime);
  const offset = useStoreState(state => state.offset);
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
    rows.push(<ProgramItem key={item.id} item={item} />);
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
