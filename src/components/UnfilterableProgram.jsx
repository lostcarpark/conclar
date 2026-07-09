import React from "react";
import { useStoreState } from "easy-peasy";
import ProgramList from "./ProgramList";
import Info from "./Info";
import { LocalTime } from "../utils/LocalTime";

const UnfilterableProgram = () => {
  const program = useStoreState((state) => state.program);

  const showPastItems = useStoreState((state) => state.showPastItems);

  const filtered =
    LocalTime.isDuringCon(program) && !showPastItems
      ? LocalTime.filterPastItems(program)
      : program;

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
