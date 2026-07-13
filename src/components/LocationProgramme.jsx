import { useStoreActions } from "easy-peasy";
import { useParams } from "react-router-dom";
import FilterableProgram from "./FilterableProgram";
import configData from "../config.json";
import { labelForLocationValue } from "../utils/Venues";

const LocationProgramme = () => {
  const setSelLoc = useStoreActions(
    (actions) => actions.setProgramSelectedLocations
  );

  const params = useParams();
  const locations = params.locList.split("~").map((loc) => decodeURIComponent(loc));
  if (locations.length) {
    setSelLoc(locations.map((loc) => {
      return { value: loc, label: labelForLocationValue(loc, configData) };
    }));
  }

  return (
    <FilterableProgram />
  );
};

export default LocationProgramme;
