import React, { useState } from "react";
import { useStoreState, useStoreActions } from "easy-peasy";
import ProgramList from "./ProgramList";
import Info from "./Info";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";

const UnfilterableProgram = () => {
  const program = useStoreState((state) => state.program);
  const offset = useStoreState((state) => state.offset);

  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const showPastItems = useStoreState((state) => state.showPastItems);

  const { expandAll, collapseAll } = useStoreActions((actions) => ({
    expandAll: actions.expandAll,
    collapseAll: actions.collapseAll,
  }));
  const noneExpanded = useStoreState((state) => state.noneExpanded);
  const allExpanded = useStoreState((state) => state.allExpanded);

  const filtered = applyFilters(program);
  const total = filtered.length;

  function applyFilters(program) {

    let filtered = program;

    if (isDuringCon(program) && !showPastItems) {
      // Filter by past item state.  Quick hack to treat this as a filter.
      const now = LocalTime.dateToConTime(new Date());
      //console.log("Showing items after", now.date, now.time, "(adjusted con time).");
      filtered = filtered.filter((item) => {
        // eslint-disable-next-line
        return (now.date < item.date) || (now.date === item.date && now.time <= item.time);
      });
    }
    return filtered;
  }

  function isDuringCon(program) {
    return program && program.length ? LocalTime.inConTime(program) : false;
  }

  return (
    <div className="uninteractive">
      <div className="program-page">
        <ProgramList program={filtered} />
      </div>
      <hr/>
      <Info/>
    </div>
  );
};

export default UnfilterableProgram;
