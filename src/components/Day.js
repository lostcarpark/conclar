// import PropTypes from 'prop-types'
import TimeSlot from "./TimeSlot";
import { Format } from "../utils/Format";

const Day = ({ date, offset, showLocalTime, items, handler }) => {
  const day = Format.formatDateForLocaleAsUTC(date);
  const rows = [];
  let itemRows = [];
  let curTime = null;
  items.forEach((item) => {
    if (item.time !== curTime) {
      if (itemRows.length > 0) {
        rows.push(
          <TimeSlot
            key={curTime}
            time={curTime}
            offset={offset}
            showLocalTime={showLocalTime}
            items={itemRows}
            handler={handler}
          />
        );
        itemRows = [];
      }
      curTime = item.time;
    }
    itemRows.push(item);
  });
  rows.push(
    <TimeSlot
      key={curTime}
      time={curTime}
      offset={offset}
      showLocalTime={showLocalTime}
      items={itemRows}
      handler={handler}
    />
  );

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
