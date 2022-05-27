import { useStoreState } from "easy-peasy";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import { LocalTime } from "../utils/LocalTime";

const MySchedule = () => {
  const mySchedule = useStoreState((state) => state.getMySchedule);
  const showPastItems = useStoreState((state) => state.showPastItems);

  const filtered =
    LocalTime.isDuringCon(mySchedule) && !showPastItems
      ? LocalTime.filterPastItems(mySchedule)
      : mySchedule;

  return (
    <div className="my-schedule">
      <div className="result-filters">
        <div className="filter-options">
          <ShowPastItems />
        </div>
      </div>
      <ProgramList program={filtered} />
    </div>
  );
};

export default MySchedule;
