import React from "react";
import { useStoreState } from "easy-peasy";
import ProgramList from "./ProgramList";
import Info from "./Info";
import { LocalTime } from "../utils/LocalTime";

const UnfilterableProgram = () => {
  const program = useStoreState((state) => state.program);

  const showPastItems = useStoreState((state) => state.showPastItems);

  const filtered = applyFilters(program);

  function applyFilters(program) {
    let filtered = program;

    if (isDuringCon(program) && !showPastItems) {
      // Filter by past item state.  Quick hack to treat this as a filter.
      const now = LocalTime.dateToConTime(new Date());
      filtered = filtered.filter((item) => {
        // eslint-disable-next-line
        return (
          now.date < item.date ||
          (now.date === item.date && now.time <= item.time)
        );
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
      <hr />
      <Info />
    </div>
  );
};

export default UnfilterableProgram;
