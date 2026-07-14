import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import ShareLink from "./ShareLink";
import { LocalTime } from "../utils/LocalTime";
import { useProgramTime } from "../hooks/useProgramTime";

const MySchedule = () => {
  const mySchedule = useStoreState((state) => state.getMySchedule);
  const showPastItems = useStoreState((state) => state.showPastItems);
  const { expandSelected, collapseSelected } = useStoreActions((actions) => ({
    expandSelected: actions.expandSelected,
    collapseSelected: actions.collapseSelected,
  }));
  const noneExpanded = useStoreState((state) => state.noneExpanded);
  const allSelectedExpanded = useStoreState(
    (state) => state.allSelectedExpanded
  );
  const programTime = useProgramTime();

  const pageHeading = (
    <div className="page-heading">
      <h2>{configData.PROGRAM.MY_SCHEDULE.TITLE}</h2>
    </div>
  );

  if (mySchedule.length === 0) {
    return (
      <div className="my-schedule">
        {pageHeading}
        <div>{configData.PROGRAM.MY_SCHEDULE.EMPTY.TEXT}</div>
      </div>
    );
  }

  const filtered = programTime.hidePastItems(mySchedule, showPastItems);

  return (
    <div className="my-schedule">
      {pageHeading}
      <div className="introduction">
        {configData.PROGRAM.MY_SCHEDULE.INTRO}
      </div>
      <div className="result-filters">
        <div className="stack">
          <div className="filter-expand">
            <button disabled={allSelectedExpanded} onClick={expandSelected}>
              {configData.EXPAND.EXPAND_ALL_LABEL}
            </button>
            <button disabled={noneExpanded} onClick={collapseSelected}>
              {configData.EXPAND.COLLAPSE_ALL_LABEL}
            </button>
          </div>
        </div>
        <div className="filter-options">
          <ShowPastItems programTime={programTime} />
        </div>
      </div>
      <ProgramList program={filtered} programTime={programTime} />
      <ShareLink />
    </div>
  );
};

export default MySchedule;
