import PropTypes from "prop-types";
import Day from "./Day";

const ProgramList = ({ program, handler }) => {
  const rows = [];
  let itemRows = [];
  let curDate = null;
  console.log(program);
  program.forEach((item) => {
    if (item.date !== curDate) {
      if (itemRows.length > 0) {
        console.log("%s: %d", curDate, itemRows.length);
        rows.push(<Day key={curDate} date={curDate} items={itemRows} handler={handler} />);
        itemRows = [];
      }
      curDate = item.date;
    }
    itemRows.push(item);
  });
  console.log("%s: %d", curDate, itemRows.length);
  rows.push(<Day key={curDate} date={curDate} items={itemRows} handler={handler} />);
  return <div className="program">{rows}</div>;
};

ProgramList.propTypes = {
  program: PropTypes.array,
};

export default ProgramList;
