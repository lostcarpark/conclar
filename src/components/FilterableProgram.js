import React, { useState } from "react";
import ReactSelect from "react-select";
import ProgramList from "./ProgramList";

const FilterableProgram = ({ program, locations, handler }) => {
  const [search, setSearch] = useState("");
  const [selLoc, setSelLoc] = useState([]);
  let filtered = applyFilters();
  let total = filtered.length;
  let totalMessage = `Listing ${total} items`;
  
  function applyFilters() {
    const term = search.trim().toLowerCase();

    // If no filters, return full program;
    if (term.length === 0 && selLoc.length === 0) return program;

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
    return filtered;
  }

  function handleSearch(event) {
    setSearch(event.target.value);
  }

  function handleLoc(value) {
    setSelLoc(value);
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
        <div className="filter-search">
          <input
            type="text"
            placeholder="Enter search text"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div className="filter-total">{totalMessage}</div>
      </div>
      <div className="program-container">
        <ProgramList program={filtered} handler={handler} />
      </div>
    </div>
  );
};

export default FilterableProgram;
