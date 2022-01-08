// import PropTypes from 'prop-types'
import TimeSlot from "./TimeSlot";

const Day = ({ date, items, handler }) => {
  let language = window.navigator.userLanguage || window.navigator.language;
  let dateTime = new Date(date);
  let day = dateTime.toLocaleDateString(language, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = [];
  let itemRows = [];
  let curTime = null;
  items.forEach((item) => {
    if (item.time !== curTime) {
      if (itemRows.length > 0) {
        rows.push(<TimeSlot key={curTime} time={curTime} items={itemRows} handler={handler} />);
        itemRows = [];
      }
      curTime = item.time;
    }
    itemRows.push(item);
  });
  rows.push(<TimeSlot key={curTime} time={curTime} items={itemRows} handler={handler} />);

  return (
    <div id={date} className="date">
      <div className="date-heading">{day}</div>
      <div className="date-items">{rows}</div>
    </div>
  );
};

// Day.PropTypes = {
//     date: PropTypes.string
// }

export default Day;
