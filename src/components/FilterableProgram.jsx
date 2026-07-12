import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import ReactSelect from "react-select";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Temporal } from "@js-temporal/polyfill";
import configData from "../config.json";
import TagSelectors from "./TagSelectors";
import ResetButton from "./ResetButton";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import LoadError from "./LoadError";
import { LocalTime } from "../utils/LocalTime";
import { buildLocationOptions, locationMatchesSelection } from "../utils/Venues";
import { useTickingNow } from "../hooks/useTickingNow";
import { INFINITE_SCROLL } from "../utils/AdaptivePageSize";

// The drop-down and "Show more" flow needs a default limit even when a
// deployed config.json predates the LIMIT block.
const DEFAULT_DISPLAY_LIMIT = configData.PROGRAM.LIMIT?.DEFAULT ?? 100;

/**
 * Apply hide before time filter.
 * @param {array} program Program to filter.
 * @param {string} minDay Earliest selected day.
 * @param {string} hideBefore Time of day to hide items before.
 * @returns {array} The program with items before start removed.
 */
function filterHideBefore(program, minDay, hideBefore) {
  const beforeDate = Temporal.ZonedDateTime.from(
    minDay + "T" + hideBefore + "[" + configData.TIMEZONE + "]"
  );
  return program.filter(
    (item) =>
      Temporal.ZonedDateTime.compare(beforeDate, item.startDateAndTime) <= 0
  );
}

/**
 * Apply filters to the program array.
 * @param {array} program Array of program items.
 * @param {object} filters Current filter selections.
 * @returns {array} The filtered array.
 */
function applyFilters(program, { search, selLoc, selTags, showPastItems, hideBefore, tags, now }) {
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
          if (locationMatchesSelection(location, selected.value, configData)) return true;
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
  if (LocalTime.isDuringCon(program, now) && !showPastItems) {
    filtered = LocalTime.filterPastItems(filtered, now);
  }
  if (!configData.HIDE_BEFORE.HIDE && hideBefore) {
    if (
      "days" in selTags &&
      Array.isArray(selTags.days) &&
      selTags.days.length > 0
    ) {
      // if days selected, take start time for first selected day.
      const minDay = selTags.days.reduce(
        (acc, curr) => (curr.value < acc ? curr.value : acc),
        selTags.days[0].value
      );
      filtered = filterHideBefore(filtered, minDay, hideBefore);
    } else if (filtered[0] && "tags" in filtered[0]) {
      // If days tag present on items get date of first programme item.
      const tag = filtered[0].tags.find((item) => item.category === "days");
      if (tag && "value" in tag) {
        const minDay = tag.value;
        filtered = filterHideBefore(filtered, minDay, hideBefore);
      }
    } else {
      // As backup get date from drop-down items.
      const labelledDays = tags.days.filter((item) => typeof item.label !== "undefined");
      const minDay = labelledDays.reduce(
        (acc, curr) => (curr.value < acc ? curr.value : acc),
        labelledDays[0].value
      );
      filtered = filterHideBefore(filtered, minDay, hideBefore);
    }
  }
  return filtered;
}

const FilterableProgram = () => {
  const navigate = useNavigate();

  const isLoading = useStoreState((state) => state.isLoading);
  const loadError = useStoreState((state) => state.loadError);

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
  const hideBefore = useStoreState((state) => state.programHideBefore);
  const setHideBefore = useStoreActions(
    (actions) => actions.setProgramHideBefore
  );
  const show12HourTime = useStoreState((state) => state.show12HourTime);
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
  // The user's selected limit as a number ("all" and other non-numeric
  // selections parse to NaN, which every comparison treats as unlimited).
  const selectedLimit = () =>
    parseInt(
      programDisplayLimit === null ? DEFAULT_DISPLAY_LIMIT : programDisplayLimit
    );
  // Current display limit, changes when user presses "show more". Resets whenever filters change.
  const [displayLimit, setDisplayLimit] = useState(selectedLimit);

  const now = useTickingNow();

  const deferredSearch = useDeferredValue(search);
  const filtered = useMemo(
    () =>
      applyFilters(program, {
        search: deferredSearch,
        selLoc,
        selTags,
        showPastItems,
        hideBefore,
        tags,
        now,
      }),
    [program, deferredSearch, selLoc, selTags, showPastItems, hideBefore, tags, now]
  );
  const total = filtered.length;
  const totalMessage =
    !INFINITE_SCROLL && displayLimit < total
      ? `Listing ${displayLimit} of ${total} items`
      : `Listing ${total} items`;
  // Memoized so ProgramList only sees a new `program` reference when the
  // visible items actually change - otherwise unrelated re-renders (the
  // ticking clock, etc.) would hand it a fresh array each time, defeating
  // the memoization inside it. Under infinite scroll ProgramList paces the
  // mounting itself, so it gets the whole filtered list.
  const display = useMemo(
    () =>
      !INFINITE_SCROLL && configData.PROGRAM.LIMIT.SHOW && !isNaN(displayLimit)
        ? filtered.slice(0, displayLimit)
        : filtered,
    [filtered, displayLimit]
  );

  // Any filter change - including via the reset button or the location URL
  // route - puts the display limit back to the selection.
  useEffect(() => {
    setDisplayLimit(selectedLimit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selLoc, selTags, hideBefore]);

  function limitDropDown() {
    function normalizeLimit(limit) {
      if (limit === null) return DEFAULT_DISPLAY_LIMIT;
      if (limit === "all") return limit;
      if (isNaN(limit)) return DEFAULT_DISPLAY_LIMIT;
      return limit;
    }
    if (!INFINITE_SCROLL && configData.PROGRAM.LIMIT.SHOW) {
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
            id="display_limit"
            name="display_limit"
            value={normalizeLimit(programDisplayLimit)}
            disabled={isLoading}
            onChange={(e) => {
              setProgramDisplayLimit(e.target.value);
              setDisplayLimit(parseInt(e.target.value));
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
      <button
        className="show-more-button"
        onClick={() =>
          setDisplayLimit(
            parseInt(displayLimit) +
              configData.PROGRAM.LIMIT.SHOW_MORE.NUM_EXTRA
          )
        }
      >
        {configData.PROGRAM.LIMIT.SHOW_MORE.LABEL}
      </button>
    ) : (
      <span>{configData.PROGRAM.LIMIT.SHOW_MORE.NO_MORE}</span>
    );

  // create list of options for hide before time drop-down.
  const hideBeforeOptions = [
    <option value="" key="0">
      {configData.HIDE_BEFORE.PLACEHOLDER}
    </option>,
  ];
  for (const time of configData.HIDE_BEFORE.TIMES) {
    hideBeforeOptions.push(
      <option value={time.TIME} key={time.TIME}>
        {show12HourTime ? time.LABEL_12H : time.LABEL_24H}
      </option>
    );
  }
  const hideBeforeSelect = configData.HIDE_BEFORE.HIDE ? (
    <></>
  ) : (
    <div className="filter-hide-before">
      <label htmlFor="hide-before">{configData.HIDE_BEFORE.PLACEHOLDER}</label>
      <select
        id="hide-before"
        placeholder={configData.HIDE_BEFORE.PLACEHOLDER}
        value={hideBefore}
        disabled={isLoading}
        onChange={(e) => {
          setHideBefore(e.target.value);
        }}
      >
        {hideBeforeOptions}
      </select>
    </div>
  );

  if (loadError) return <LoadError />;

  return (
    <div>
      <div className="filter" role="search">
        <div className="search-filters">
          <div className="filter-locations">
            <ReactSelect
              placeholder="Select locations"
              options={buildLocationOptions(locations, configData)}
              isMulti
              isDisabled={isLoading}
              isSearchable={configData.LOCATIONS.SEARCHABLE}
              value={selLoc}
              onChange={(value) => {
                setSelLoc(value);
                if (value.length) {
                  const locList = value.map((location) => encodeURIComponent(location.value)).join('~');
                  navigate('/loc/' + locList);
                }
                else {
                  navigate('/');
                }
              }}
              className="filter-container"
              classNamePrefix="filter-select"
            />
          </div>
          <TagSelectors
            tags={tags}
            selTags={selTags}
            setSelTags={setSelTags}
            isLoading={isLoading}
            tagConfig={configData.TAGS}
          />
          {hideBeforeSelect}
          <div className="filter-search">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              type="search"
              placeholder={configData.PROGRAM.SEARCH.SEARCH_LABEL}
              value={search}
              disabled={isLoading}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="reset-filters">
          <ResetButton
            isFiltered={programIsFiltered}
            resetFilters={resetProgramFilters}
          />
        </div>
        {limitDropDown()}
        <div className="result-filters">
          <div className="stack">
            <div className="filter-total">
              {isLoading ? configData.APPLICATION.LOADING.MESSAGE : totalMessage}
            </div>
            <div className="filter-expand">
              <button disabled={isLoading || allExpanded} onClick={expandAll}>
                {configData.EXPAND.EXPAND_ALL_LABEL}
              </button>
              <button disabled={isLoading || noneExpanded} onClick={collapseAll}>
                {configData.EXPAND.COLLAPSE_ALL_LABEL}
              </button>
            </div>
          </div>
          <div className="filter-options">
            <ShowPastItems now={now} />
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="program-page">
          <div className="program-container">
            <div className="time-convention-message" aria-hidden="true">
              {configData.CONVENTION_TIME.NOTICE.replace(
                "@timezone",
                configData.TIMEZONE
              )}
            </div>
            <div className="program-empty">{"\u00A0"}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="program-page">
            <ProgramList program={display} now={now} />
          </div>
          <div className="result-filters">
            <div className="stack">
              <div className="filter-total">{totalMessage}</div>
            </div>
          </div>
          {!INFINITE_SCROLL && (
            <div className="result-more-button">{moreButton}</div>
          )}
        </>
      )}
    </div>
  );
};

export default FilterableProgram;
