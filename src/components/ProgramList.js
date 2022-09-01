import React, { useEffect } from 'react';
import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import { LocalTime } from "../utils/LocalTime";
import Day from "./Day";
import configData from "../config.json";
// import { Temporal } from "@js-temporal/polyfill";

const ProgramList = ({ program, forceExpanded }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  useEffect(() => {
    LocalTime.storeCachedTimes();
  });

  LocalTime.checkTimeZonesDiffer(program);

  const rows = [];
  let itemRows = [];
  let curDate = null;

  if (program === null || program.length === 0) {
    return (
      <div className="program">
        <div className="program-empty">No items found.</div>
      </div>
    );
  }

  program.forEach((item) => {
    const itemDate = item.dateAndTime
      .withTimeZone(LocalTime.conventionTimeZone)
      .round({ smallestUnit: "day", roundingMode: "floor" });

    if (curDate === null || !itemDate.equals(curDate)) {
      if (itemRows.length > 0) {
        rows.push(
          <Day
            key={curDate.toString()}
            date={curDate}
            items={itemRows}
            forceExpanded={forceExpanded}
          />
        );
        itemRows = [];
      }
      curDate = itemDate;
    }
    itemRows.push(item);
  });
  rows.push(
    <Day
      key={curDate.toString()}
      date={curDate}
      items={itemRows}
      forceExpanded={forceExpanded}
    />
  );
  const conventionTime = (
    <div className="time-convention-message">
      {configData.CONVENTION_TIME.NOTICE.replace(
        "@timezone",
        configData.TIMEZONE
      )}
    </div>
  );
  const localTime =
    showLocalTime === "always" ||
    (showLocalTime === "differs" && LocalTime.timezonesDiffer) ? (
      <div className="time-local-message">
        {configData.LOCAL_TIME.NOTICE.replace(
          "@timezone",
          LocalTime.localTimeZone
        )}
      </div>
    ) : (
      ""
    );

  return (
    <div className="program-container">
      {conventionTime}
      {localTime}
      <div className="program">{rows}</div>
    </div>
  );
};

ProgramList.defaultProps = {
  forceExpanded: false,
};

ProgramList.propTypes = {
  program: PropTypes.array,
  forceExpanded: PropTypes.bool,
};

export default ProgramList;
