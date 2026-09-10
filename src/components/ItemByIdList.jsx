import { useStoreState, useStoreActions } from "easy-peasy";
import { useParams } from "react-router-dom";
import configData from "../config.json";
import ProgramList from "./ProgramList";
import { useProgramTime } from "../hooks/useProgramTime";

const ItemByIdList = () => {
  const { addSelection } = useStoreActions((actions) => ({
    addSelection: actions.addSelectionAndSync,
  }));

  const params = useParams();
  const itemIds = params.idList.split("~");
  const program = useStoreState((state) => state.program);
  const programTime = useProgramTime();
  if (program.length === 0) return <></>;

  // Filter to select only the specified ID.
  const filteredProgram = program.filter((item) =>
    itemIds.includes(item.id.toString())
  );
  return (
    <div>
      <div className="page-heading">
        <h2>{configData.PROGRAM.SHARED.TITLE}</h2>
      </div>
      <div className="page-body">{configData.PROGRAM.SHARED.DESCRIPTION}</div>
      <ProgramList program={filteredProgram} programTime={programTime} />
      <div className="buttons">
        <button
          className="button-add-all"
          onClick={() => {
            itemIds.forEach((id) => {
              addSelection(id);
            });
          }}
        >
          {configData.PROGRAM.SHARED.BUTTON_LABEL}
        </button>
      </div>
    </div>
  );
};

export default ItemByIdList;
