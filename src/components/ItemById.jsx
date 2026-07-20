import { useStoreState } from "easy-peasy";
import { useParams } from "react-router-dom";
import ProgramList from "./ProgramList";
import { useProgramTime } from "../hooks/useProgramTime";

const ItemById = () => {
  const program = useStoreState((state) => state.program);
  const params = useParams();
  const programTime = useProgramTime();

  // Filter to select only the specified ID.
  const filteredProgram = program.filter(
    (item) => item.id.toString() === params.id
  );
  return <ProgramList program={filteredProgram} forceExpanded={true} programTime={programTime} />;
};

export default ItemById;
