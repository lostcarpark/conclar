import React, { useState } from "react";
import ReactSelect from "react-select";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Temporal } from "@js-temporal/polyfill";
import ProgramList from "./ProgramList";
import ShowPastItems from "./ShowPastItems";
import configData from "../config.json";
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

  const [search, setSearch] = useState("");
  const [selLoc, setSelLoc] = useState([]);
  const [selTags, setSelTags] = useState({});

  const filtered = applyFilters(program);
  const total = filtered.length;
  const totalMessage = `Listing ${total} items`;

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
    if (LocalTime.isDuringCon(program) && !showPastItems) {
      // Filter by past item state.  Quick hack to treat this as a filter.
      const cutOff = Temporal.Now.zonedDateTimeISO("UTC").add({
        minutes: configData.SHOW_PAST_ITEMS.ADJUST_MINUTES,
      });
      filtered = filtered.filter((item) => {
        // eslint-disable-next-line
        return Temporal.ZonedDateTime.compare(cutOff, item.dateAndTime) <= 0;
      });
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

  // TODO: Probably should move the tags filter to its own component.
  const tagFilters = [];
  for (const tag in tags) {
    const tagData = configData.TAGS.SEPARATE.find((item) => {
      return item.PREFIX === tag;
    });
    // Only add drop-down if tag type actually contains elements.
    if (tags[tag].length) {
      const placeholder = tagData
        ? tagData.PLACEHOLDER
        : configData.TAGS.PLACEHOLDER;
      const searchable = tagData
        ? tagData.SEARCHABLE
        : configData.TAGS.SEARCHABLE;
      tagFilters.push(
        <div key={tag} className={"filter-tags filter-tags-" + tag}>
          <ReactSelect
            placeholder={placeholder}
            options={tags[tag]}
            isMulti
            isSearchable={searchable}
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
        <div className="search-filters">
          <div className="filter-locations">
            <ReactSelect
              placeholder="Select locations"
              options={locations}
              isMulti
              isSearchable={configData.LOCATIONS.SEARCHABLE}
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
