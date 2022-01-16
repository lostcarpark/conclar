import PropTypes from "prop-types";
import Day from "./Day";
import configData from "../config.json";

const ProgramList = ({ program, offset, handler }) => {
  const rows = [];
  let itemRows = [];
  let curDate = null;
  const showLocalTime = localStorage.getItem("show_local_time") !== "false";
  const show12HourTime = localStorage.getItem("12_hour_time") === "true";
  //console.log(program);

  if (program.length === 0) {
    return (
      <div className="program">
        <div className="program-empty">No items found.</div>
      </div>
    );
  }
  program.forEach((item) => {
    if (item.date !== curDate) {
      if (itemRows.length > 0) {
        rows.push(
          <Day
            key={curDate}
            date={curDate}
            offset={offset}
            showLocalTime={showLocalTime}
            show12HourTime={show12HourTime}
            items={itemRows}
            handler={handler}
          />
        );
        itemRows = [];
      }
      curDate = item.date;
    }
    itemRows.push(item);
  });
  rows.push(
    <Day
      key={curDate}
      date={curDate}
      offset={offset}
      showLocalTime={showLocalTime}
      show12HourTime={show12HourTime}
      items={itemRows}
      handler={handler}
    />
  );
  const localTime =
    offset === null ? (
      <div className="time-local">{configData.LOCAL_TIME.FAILURE}</div>
    ) : offset !== 0 && showLocalTime ? (
      <div className="time-local">{configData.LOCAL_TIME.NOTICE}</div>
    ) : (
      ""
    );
  return (
    <div className="program-container">
      {localTime}
      <div className="program">{rows}</div>
    </div>
  );
};

ProgramList.propTypes = {
  program: PropTypes.array,
};

export default ProgramList;
