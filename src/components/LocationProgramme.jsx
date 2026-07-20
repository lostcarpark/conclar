import { useEffect } from "react";
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
  // Sync the URL's location list into the store in an effect, not during
  // render - a render-time store update re-renders every subscriber, which
  // re-renders this component, and the fresh option objects created each
  // pass turn that into an endless per-frame loop.
  useEffect(() => {
    const locations = params.locList
      .split("~")
      .map((loc) => decodeURIComponent(loc));
    setSelLoc(
      locations.map((loc) => ({
        value: loc,
        label: labelForLocationValue(loc, configData),
      }))
    );
  }, [params.locList, setSelLoc]);

  return (
    <FilterableProgram />
  );
};

export default LocationProgramme;
