import React from "react";
import { useStoreState } from "easy-peasy";
import ProgramList from "./ProgramList";
import Info from "./Info";
import { useProgramTime } from "../hooks/useProgramTime";

const UnfilterableProgram = () => {
  const program = useStoreState((state) => state.program);

  const showPastItems = useStoreState((state) => state.showPastItems);
  const programTime = useProgramTime();

  const filtered = programTime.hidePastItems(program, showPastItems);

  return (
    <div className="uninteractive">
      <div className="program-page">
        <ProgramList program={filtered} programTime={programTime} />
      </div>
      <hr />
      <Info />
    </div>
  );
};

export default UnfilterableProgram;
