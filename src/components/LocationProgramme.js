import { useStoreActions } from "easy-peasy";
import { useParams } from "react-router-dom";
import FilterableProgram from "./FilterableProgram";

const LocationProgramme = () => {
  const setSelLoc = useStoreActions(
    (actions) => actions.setProgramSelectedLocations
  );

  const params = useParams();
  const locations = params.locList.split("~");
  if (locations.length) {
    setSelLoc(locations.map((loc) => { return {value: loc, label: loc}; }));
  }

  return (
    <FilterableProgram />
  );
};

export default LocationProgramme;
