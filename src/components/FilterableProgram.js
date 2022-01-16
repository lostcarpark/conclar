import React, { useState } from "react";
import ReactSelect from "react-select";
import ProgramList from "./ProgramList";
import configData from "../config.json";

const FilterableProgram = ({ program, locations, tags, offset, handler }) => {
  const [search, setSearch] = useState("");
  const [selLoc, setSelLoc] = useState([]);
  const [selTags, setSelTags] = useState({});
  const storedLocalTime = localStorage.getItem("show_local_time"); // Get default show local time from local storage.
  const [showLocalTime, setShowLocalTime] = useState(
    storedLocalTime === "false" ? false : true
  );
  const stored12HourTime = localStorage.getItem("twelve_hour_time");
  const [show12HourTime, setShow12HourTime] = useState(
    stored12HourTime === configData.TIME_FORMAT.DEFAULT_12HR
      ? "false" // If defaulting to 12 hour, assume true unless "false" saved.
        ? false
        : true
      : "true" // If defaulting to 24 hour, assume false unless "true" saved.
      ? true
      : false
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

  const show12HourTimeCheckbox = configData.TIME_FORMAT.SHOW_CHECKBOX ? (
    <div className="twelve_hour_time-checkbox">
      <input
        id="twelve_hour_time"
        name="twelve_hour_time"
        type="checkbox"
        checked={show12HourTime}
        onChange={handleShow12HourTime}
      />
      <label htmlFor="twelve_hour_time">
        {configData.TIME_FORMAT.CHECKBOX_LABEL}
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
    localStorage.setItem(
      "show_local_time",
      event.target.checked ? "true" : "false"
    );
  }

  function handleShow12HourTime(event) {
    setShow12HourTime(event.target.checked);
    localStorage.setItem(
      "12_hour_time",
      event.target.checked ? "true" : "false"
    );
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
        {localTimeCheckbox}
        {show12HourTimeCheckbox}
      </div>
      <div className="program-container">
        <ProgramList program={filtered} offset={offset} handler={handler} />
      </div>
    </div>
  );
};

export default FilterableProgram;
