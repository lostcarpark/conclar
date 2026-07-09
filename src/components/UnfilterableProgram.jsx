import React from "react";
import { useStoreState } from "easy-peasy";
import ProgramList from "./ProgramList";
import Info from "./Info";
import { LocalTime } from "../utils/LocalTime";
import { useTickingNow } from "../hooks/useTickingNow";

const UnfilterableProgram = () => {
  const program = useStoreState((state) => state.program);

  const showPastItems = useStoreState((state) => state.showPastItems);
  const now = useTickingNow();

  const filtered =
    LocalTime.isDuringCon(program, now) && !showPastItems
      ? LocalTime.filterPastItems(program, now)
      : program;

  return (
    <div className="uninteractive">
      <div className="program-page">
        <ProgramList program={filtered} now={now} />
      </div>
      <hr />
      <Info />
    </div>
  );
};

export default UnfilterableProgram;
