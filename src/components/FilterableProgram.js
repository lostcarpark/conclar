import React, { useState } from "react";
import ReactSelect from "react-select";
import { useStoreState, useStoreActions } from "easy-peasy";
import ProgramList from "./ProgramList";
import configData from "../config.json";
import { LocalTime } from "../utils/LocalTime";

const FilterableProgram = () => {
  const program = useStoreState((state) => state.program);
  const locations = useStoreState((state) => state.locations);
  const tags = useStoreState((state) => state.tags);
  const offset = useStoreState((state) => state.offset);

  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const setShowLocalTime = useStoreActions(
    (actions) => actions.setShowLocalTime
  );
  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const setShow12HourTime = useStoreActions(
    (actions) => actions.setShow12HourTime
  );
  const showPastItems = useStoreState((state) => state.showPastItems);
  const setShowPastItems = useStoreActions(
    (actions) => actions.setShowPastItems
  );
  const { expandAll, collapseAll } = useStoreActions((actions) => ({
    expandAll: actions.expandAll,
    collapseAll: actions.collapseAll,
  }));
  const noneExpanded = useStoreState((state) => state.noneExpanded);
  const allExpanded = useStoreState((state) => state.allExpanded);

  const [search, setSearch] = useState("");
  const [selLoc, setSelLoc] = useState([]);
  const [selTags, setSelTags] = useState({});

  const filtered = applyFilters(program);
  const total = filtered.length;
  const totalMessage = `Listing ${total} items`;

  const localTimeCheckbox =
    offset === null || offset === 0 ? (
      ""
    ) : (
      <div className="local-time-checkbox">
        <input
          id={LocalTime.localTimeClass}
          name={LocalTime.localTimeClass}
          type="checkbox"
          checked={showLocalTime}
          onChange={handleShowLocalTime}
        />
        <label htmlFor="show_local_time">
          {configData.LOCAL_TIME.CHECKBOX_LABEL}
        </label>
      </div>
    );

  const show12HourTimeCheckbox = configData.TIME_FORMAT.SHOW_CHECKBOX ? (
    <div className={LocalTime.twelveHourTimeClass + "-checkbox"}>
      <input
        id={LocalTime.twelveHourTimeClass}
        name={LocalTime.twelveHourTimeClass}
        type="checkbox"
        checked={show12HourTime}
        onChange={handleShow12HourTime}
      />
      <label htmlFor={LocalTime.twelveHourTimeClass}>
        {configData.TIME_FORMAT.CHECKBOX_LABEL}
      </label>
    </div>
  ) : (
    ""
  );

  //Nice to have a check here for whether it's during con right now.
  const pastItemsCheckbox = true ? ( 
    <div className="past-items-checkbox">
      <input
        id={LocalTime.pastItemsClass}
        name={LocalTime.pastItemsClass}
        type="checkbox"
        checked={showPastItems}
        onChange={handleShowPastItems}
      />
      <label htmlFor={LocalTime.pastItemsClass}>
        {configData.SHOW_PAST_ITEMS.CHECKBOX_LABEL}
      </label>
    </div>
    ) : (
			""
		);

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
              if (selected.value === tag) return true;
            }
          }
          return false;
        });
      }
    }
    return filtered;
  }

  function handleSearch(event) {
    setSearch(event.target.value);
  }

  function handleLoc(value) {
    setSelLoc(value);
  }

  function handleTags(tag, value) {
    let selections = { ...selTags };
    selections[tag] = value;
    setSelTags(selections);
  }

  function handleShowLocalTime(event) {
    setShowLocalTime(event.target.checked);
    LocalTime.setStoredLocalTime(event.target.checked);
  }

  function handleShow12HourTime(event) {
    setShow12HourTime(event.target.checked);
    LocalTime.setStoredTwelveHourTime(event.target.checked);
  }

  function handleShowPastItems(event) {
    setShowPastItems(event.target.checked);
    LocalTime.setStoredPastItems(event.target.checked);
  }

  // TODO: Probably should move the tags filter to its own component.
  const tagFilters = [];
  for (const tag in tags) {
    const tagData = configData.TAGS.SEPARATE.find((item) => {
      return item.PREFIX === tag;
    });
    // Only add drop-down if tag type actually contains elements.
    if (tags[tag].length) {
      const placeholder = tagData ? tagData.PLACEHOLDER : "Select tags";
      tagFilters.push(
        <div key={tag} className={"filter-tags filter-tags-" + tag}>
          <ReactSelect
            placeholder={placeholder}
            options={tags[tag]}
            isMulti
            value={selTags[tag]}
            onChange={(value) => handleTags(tag, value)}
          />
        </div>
      );
    }
  }

  return (
    <div>
      <div className="filter">
        <div className="filter-locations">
          <ReactSelect
            placeholder="Select locations"
            options={locations}
            isMulti
            value={selLoc}
            onChange={handleLoc}
          />
        </div>
        {tagFilters}
        <div className="filter-search">
          <input
            type="text"
            placeholder="Enter search text"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div className="filter-total">{totalMessage}</div>
        <div className="filter-expand">
          <button disabled={allExpanded} onClick={expandAll}>{configData.EXPAND.EXPAND_ALL_LABEL}</button>
          <button disabled={noneExpanded} onClick={collapseAll}>{configData.EXPAND.COLLAPSE_ALL_LABEL}</button>
        </div>
        <div className="filter-options">
          {localTimeCheckbox}
          {show12HourTimeCheckbox}
          {pastItemsCheckbox}
        </div>
      </div>
      <div className="program-page">
        <ProgramList program={filtered} />
      </div>
    </div>
  );
};

export default FilterableProgram;
