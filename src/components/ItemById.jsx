import { useStoreState } from "easy-peasy";
import { useParams } from "react-router-dom";
import ProgramList from "./ProgramList";
import { useTickingNow } from "../hooks/useTickingNow";

const ItemById = () => {
  const program = useStoreState((state) => state.program);
  const params = useParams();
  const now = useTickingNow();

  // Filter to select only the specified ID.
  const filteredProgram = program.filter(
    (item) => item.id.toString() === params.id
  );
  return <ProgramList program={filteredProgram} forceExpanded={true} now={now} />;
};

export default ItemById;
