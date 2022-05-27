import { useStoreState } from "easy-peasy";
import { Temporal } from "@js-temporal/polyfill";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";

const MySchedule = () => {
  const mySchedule = useStoreState((state) => state.getMySchedule);
  const showPastItems = useStoreState((state) => state.showPastItems);

  const filterSchedule = (program) => {
    if (!LocalTime.isDuringCon(program) || showPastItems) {
      return program;
    }
    // Filter by past item state.  Quick hack to treat this as a filter.
    const cutOff = Temporal.Now.zonedDateTimeISO("UTC").add({
      minutes: configData.SHOW_PAST_ITEMS.ADJUST_MINUTES,
    });
    return program.filter((item) => {
      // eslint-disable-next-line
      return Temporal.ZonedDateTime.compare(cutOff, item.dateAndTime) <= 0;
    });
  };

  return (
    <div className="my-schedule">
      <div className="result-filters">
        <div className="filter-options">
          <ShowPastItems />
        </div>
      </div>
      <ProgramList program={filterSchedule(mySchedule)} />
    </div>
  );
};

export default MySchedule;
