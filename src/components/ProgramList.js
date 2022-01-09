import PropTypes from "prop-types";
import Day from "./Day";

const ProgramList = ({ program, handler }) => {
  const rows = [];
  let itemRows = [];
  let curDate = null;
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
    <Day key={curDate} date={curDate} items={itemRows} handler={handler} />
  );
  return <div className="program">{rows}</div>;
};

ProgramList.propTypes = {
  program: PropTypes.array,
};

export default ProgramList;
