import { useStoreState } from "easy-peasy";
import configData from "../config.json";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import ShareLink from "./ShareLink";
import { LocalTime } from "../utils/LocalTime";

const MySchedule = () => {
  const mySchedule = useStoreState((state) => state.getMySchedule);
  const program = useStoreState((state) => state.program);
  const showPastItems = useStoreState((state) => state.showPastItems);

  const filtered =
    LocalTime.isDuringCon(program) && !showPastItems
      ? LocalTime.filterPastItems(mySchedule)
      : mySchedule;

  return (
    <div className="my-schedule">
      <div className="page-heading">
        <h2>{configData.PROGRAM.MY_SCHEDULE.TITLE}</h2>
      </div>
      <div className="result-filters">
        <div className="filter-options">
          <ShowPastItems />
        </div>
      </div>
      <ProgramList program={filtered} />
      <ShareLink />
    </div>
  );
};

export default MySchedule;
