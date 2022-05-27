import React from "react";
import { useStoreState } from "easy-peasy";
import { Temporal } from "@js-temporal/polyfill";
import ProgramList from "./ProgramList";
import Info from "./Info";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";

const UnfilterableProgram = () => {
  const program = useStoreState((state) => state.program);

  const showPastItems = useStoreState((state) => state.showPastItems);

  const filtered = applyFilters(program);

  function applyFilters(program) {
    let filtered = program;

    if (LocalTime.isDuringCon(program) && !showPastItems) {
      // Filter by past item state.  Quick hack to treat this as a filter.
      const cutOff = Temporal.Now.zonedDateTimeISO("UTC").add({
        minutes: configData.SHOW_PAST_ITEMS.ADJUST_MINUTES,
      });
      filtered = filtered.filter((item) => {
        // eslint-disable-next-line
        return Temporal.ZonedDateTime.compare(cutOff, item.dateAndTime) <= 0;
      });
    }
    return filtered;
  }

  return (
    <div className="uninteractive">
      <div className="program-page">
        <ProgramList program={filtered} />
      </div>
      <hr />
      <Info />
    </div>
  );
};

export default UnfilterableProgram;
