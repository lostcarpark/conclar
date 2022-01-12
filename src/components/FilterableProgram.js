import React, { useState } from "react";
import ReactSelect from "react-select";
import ProgramList from "./ProgramList";
import configData from "../config.json";

const FilterableProgram = ({ program, locations, tags, offset, handler }) => {
  const [search, setSearch] = useState("");
  const [selLoc, setSelLoc] = useState([]);
  const [selTags, setSelTags] = useState([]);
  const storedLocalTime = localStorage.getItem("show_local_time"); // Get default show local time from local storage.
  const [showLocalTime, setShowLocalTime] = useState(
    storedLocalTime === "false" ? false : true
  );

  const filtered = applyFilters(program);
  const total = filtered.length;
  const totalMessage = `Listing ${total} items`;

  const localTimeCheckbox =
    offset === 0 ? (
      ""
    ) : (
      <div className="local-time-checkbox">
        <input
          id="show_local_time"
          name="show_local_time"
          type="checkbox"
          checked={showLocalTime}
          onChange={handleShowLocalTime}
        />
        <label htmlFor="show_local_time">
          {configData.LOCAL_TIME.CHECKBOX_LABEL}
        </label>
      </div>
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
    // Filter by tags
    if (selTags.length) {
      filtered = filtered.filter((item) => {
        for (const tag of item.tags) {
          for (const selected of selTags) {
            if (selected.value === tag) return true;
          }
        }
        return false;
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

  function handleTags(value) {
    setSelTags(value);
  }

  function handleShowLocalTime(event) {
    setShowLocalTime(event.target.checked);
    localStorage.setItem(
      "show_local_time",
      event.target.checked ? "true" : "false"
    );
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
        <div className="filter-tags">
          <ReactSelect
            placeholder="Select tags"
            options={tags}
            isMulti
            value={selTags}
            onChange={handleTags}
          />
        </div>
        <div className="filter-search">
          <input
            type="text"
            placeholder="Enter search text"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div className="filter-total">{totalMessage}</div>
        {localTimeCheckbox}
      </div>
      <div className="program-container">
        <ProgramList
          program={filtered}
          offset={offset}
          showLocalTime={showLocalTime}
          handler={handler}
        />
      </div>
    </div>
  );
};

export default FilterableProgram;
