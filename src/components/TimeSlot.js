// import PropTypes from 'prop-types'
import ProgramItem from "./ProgramItem";

const TimeSlot = ({ time, items, handler }) => {
  const rows = [];
  items.forEach((item) => {
    rows.push(<ProgramItem key={item.id} item={item} handler={handler} />);
  });

  return (
    <div id={time} className="timeslot">
      <div className="timeslot-time">{time}</div>
      <div className="timeslot-items">{rows}</div>
    </div>
  );
};

// Day.PropTypes = {
//     date: PropTypes.string
// }

export default TimeSlot;
