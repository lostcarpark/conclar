import React, { useState } from "react";
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

  // User selected display limit.
  const programDisplayLimit = useStoreState(
    (state) => state.programDisplayLimit
  );
  const setProgramDisplayLimit = useStoreActions(
    (actions) => actions.setProgramDisplayLimit
  );
  // Current display limit, changes when user presses "show more". Resets whenever filters change.
  const [displayLimit, setDisplayLimit] = useState(
    programDisplayLimit === null
      ? configData.PROGRAM.LIMIT.DEFAULT
      : programDisplayLimit
  );
  console.log(displayLimit);

  const filtered = applyFilters(program);
  const total = filtered.length;
  const totalMessage =
    displayLimit !== "all" && displayLimit < total
      ? `Listing ${displayLimit} of ${total} items`
      : `Listing ${total} items`;
  const display = configData.PROGRAM.LIMIT.SHOW && !isNaN(displayLimit)
    ? filtered.slice(0, displayLimit)
    : filtered;

  /**
   * When filters change, set the display limit back to the selection.
   */
  function resetDisplayLimit() {
    setDisplayLimit(programDisplayLimit);
  }

  /**
   * When reset filters pressed, reset the display limit and the program filters.
   */
  function resetLimitsAndFilters() {
    resetDisplayLimit();
    resetProgramFilters();
  }

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

  function limitDropDown() {
    function displayLimit(limit) {
      if (limit === null) return configData.PROGRAM.LIMIT.DEFAULT;
      if (limit === "all") return limit;
      if (isNaN(limit)) return configData.PROGRAM.LIMIT.DEFAULT;
      return limit;
    }
    if (configData.PROGRAM.LIMIT.SHOW) {
      const options = configData.PROGRAM.LIMIT.OPTIONS.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ));
      options.push(
        <option key="all" value="all">
          {configData.PROGRAM.LIMIT.ALL_LABEL}
        </option>
      );
      return (
        <div className="program-limit-select">
          <label htmlFor="display_limit">
            {configData.PROGRAM.LIMIT.LABEL}:{" "}
          </label>
          <select
            name="display_limit"
            value={displayLimit(programDisplayLimit)}
            onChange={(e) => {
              setProgramDisplayLimit(e.target.value);
              setDisplayLimit(e.target.value);
            }}
          >
            {options}
          </select>
        </div>
      );
    }
    return "";
  }

  const moreButton =
    displayLimit < total ? (
      <button className="show-more-button" onClick={() => setDisplayLimit(parseInt(displayLimit) + configData.PROGRAM.LIMIT.SHOW_MORE.NUM_EXTRA)}>
        {configData.PROGRAM.LIMIT.SHOW_MORE.LABEL}
      </button>
    ) : (
      <span>{configData.PROGRAM.LIMIT.SHOW_MORE.NO_MORE}</span>
    );

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
              onChange={(value) => {
                resetDisplayLimit();
                setSelLoc(value);
              }}
            />
          </div>
          <TagSelectors
            tags={tags}
            selTags={selTags}
            setSelTags={setSelTags}
            tagConfig={configData.TAGS}
            resetLimit={resetDisplayLimit}
          />
          <div className="filter-search">
            <input
              type="search"
              placeholder={configData.PROGRAM.SEARCH.SEARCH_LABEL}
              value={search}
              onChange={(e) => {
                resetDisplayLimit();
                setSearch(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="reset-filters">
          <ResetButton
            isFiltered={programIsFiltered}
            resetFilters={resetLimitsAndFilters}
          />
        </div>
        {limitDropDown()}
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
        <ProgramList program={display} />
      </div>
      <div className="result-filters">
        <div className="stack">
          <div className="filter-total">{totalMessage}</div>
        </div>
      </div>
      <div className="result-more-button">{moreButton}</div>
    </div>
  );
};

export default FilterableProgram;
