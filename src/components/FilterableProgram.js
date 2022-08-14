import ReactSelect from "react-select";
import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";
import TagSelectors from "./TagSelectors";
import ResetButton from "./ResetButton";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import { LocalTime } from "../utils/LocalTime";

const FilterableProgram = () => {
  const program = useStoreState((state) => state.program);
  const locations = useStoreState((state) => state.locations);
  const tags = useStoreState((state) => state.tags);

  const showPastItems = useStoreState((state) => state.showPastItems);
  const { expandAll, collapseAll } = useStoreActions((actions) => ({
    expandAll: actions.expandAll,
    collapseAll: actions.collapseAll,
  }));
  const noneExpanded = useStoreState((state) => state.noneExpanded);
  const allExpanded = useStoreState((state) => state.allExpanded);

  const selLoc = useStoreState((state) => state.programSelectedLocations);
  const setSelLoc = useStoreActions(
    (actions) => actions.setProgramSelectedLocations
  );
  const selTags = useStoreState((state) => state.programSelectedTags);
  const setSelTags = useStoreActions(
    (actions) => actions.setProgramSelectedTags
  );
  const search = useStoreState((state) => state.programSearch);
  const setSearch = useStoreActions((actions) => actions.setProgramSearch);
  const resetProgramFilters = useStoreActions(
    (actions) => actions.resetProgramFilters
  );
  const programIsFiltered = useStoreState((state) => state.programIsFiltered);

  const filtered = applyFilters(program);
  const total = filtered.length;
  const totalMessage = `Listing ${total} items`;

  /**
   * Apply filters to the program array.
   * @param {array} program Array of program items.
   * @returns {array} The filtered array.
   */
  function applyFilters(program) {
    const term = search.trim().toLowerCase();

    // If no filters, return full program;
    if (term.length === 0 && selLoc.length === 0 && selTags === 0)
      return program;

    let filtered = program;

    // Filter by search term.
    if (term.length) {
      filtered = filtered.filter((item) => {
        if (item.title && item.title.toLowerCase().includes(term)) return true;
        if (item.desc && item.desc.toLowerCase().includes(term)) return true;
        if (item.people) {
          for (const person of item.people) {
            if (person.name && person.name.toLowerCase().includes(term))
              return true;
          }
        }
        return false;
      });
    }
    // Filter by location
    if (selLoc.length) {
      filtered = filtered.filter((item) => {
        for (const location of item.loc) {
          for (const selected of selLoc) {
            if (selected.value === location) return true;
          }
        }
        return false;
      });
    }
    // Filter by each tag dropdown.
    for (const tagType in selTags) {
      if (selTags[tagType].length) {
        filtered = filtered.filter((item) => {
          for (const tag of item.tags) {
            for (const selected of selTags[tagType]) {
              if (selected.value === tag.value) return true;
            }
          }
          return false;
        });
      }
    }
    if (LocalTime.isDuringCon(program) && !showPastItems) {
      filtered = LocalTime.filterPastItems(filtered);
    }
    return filtered;
  }

  return (
    <div>
      <div className="filter">
        <div className="search-filters">
          <div className="filter-locations">
            <ReactSelect
              placeholder="Select locations"
              options={locations}
              isMulti
              isSearchable={configData.LOCATIONS.SEARCHABLE}
              value={selLoc}
              onChange={(value) => setSelLoc(value)}
            />
          </div>
          <TagSelectors
            tags={tags}
            selTags={selTags}
            setSelTags={setSelTags}
            tagConfig={configData.TAGS}
          />
          <div className="filter-search">
            <input
              type="search"
              placeholder={configData.PROGRAM.SEARCH.SEARCH_LABEL}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="reset-filters">
          <ResetButton isFiltered={programIsFiltered} resetFilters={resetProgramFilters} />
        </div>
        <div className="result-filters">
          <div className="stack">
            <div className="filter-total">{totalMessage}</div>
            <div className="filter-expand">
              <button disabled={allExpanded} onClick={expandAll}>
                {configData.EXPAND.EXPAND_ALL_LABEL}
              </button>
              <button disabled={noneExpanded} onClick={collapseAll}>
                {configData.EXPAND.COLLAPSE_ALL_LABEL}
              </button>
            </div>
          </div>
          <div className="filter-options">
            <ShowPastItems />
          </div>
        </div>
      </div>
      <div className="program-page">
        <ProgramList program={filtered} />
      </div>
    </div>
  );
};

export default FilterableProgram;
