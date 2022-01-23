
import { useStoreState } from "easy-peasy";
import ProgramList from "./ProgramList";

const MySchedule = () =>{
    const mySchedule = useStoreState((state) => state.getMySchedule());
    console.log("My Schedule: ", mySchedule);
    return (
        <ProgramList program={ mySchedule } />
    )
}

export default MySchedule;