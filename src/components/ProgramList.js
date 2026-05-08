import { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import { LocalTime } from "../utils/LocalTime";
import Day from "./Day";
import configData from "../config.json";
import { Temporal } from "@js-temporal/polyfill";
import { extractParentId } from "../model";

const ProgramList = ({ program, forceExpanded }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  useEffect(() => {
    LocalTime.storeCachedTimes();
  });

  const [now, setNow] = useState(Temporal.Now.zonedDateTimeISO("UTC"));
  useEffect(() => {
    setInterval(() => {
      setNow(Temporal.Now.zonedDateTimeISO("UTC"));
    }, 10000);
  }, []);

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

  // PR 1: when an item is a child whose parent is also in the current
  // (filtered) program list, skip it at the top level — it'll render
  // nested inside its parent (ProgramItem renders children inline).
  // Children whose parent is *not* in the current list still appear at
  // top level so they aren't lost in filter results.
  const filteredIds = new Set(program.map((it) => it.id));

  program.forEach((item) => {
    const pid = extractParentId(item);
    if (pid && filteredIds.has(pid)) {
      return; // rendered inside the parent
    }

    const itemDate = item.startDateAndTime
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
            now={now}
          />
        );
        itemRows = [];
      }
      curDate = itemDate;
    }
    itemRows.push(item);
  });
  // Guard: with PR 1's child-skipping, every item could be skipped
  // (everything in the filter is a child of something else in the filter),
  // in which case curDate stays null and we have no final Day to flush.
  if (curDate !== null && itemRows.length > 0) {
    rows.push(
      <Day
        key={curDate.toString()}
        date={curDate}
        items={itemRows}
        forceExpanded={forceExpanded}
        now={now}
      />
    );
  }
  const conventionTime = (
    <div className="time-convention-message" aria-hidden="true">
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
