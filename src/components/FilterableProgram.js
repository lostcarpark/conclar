import React, { useState } from "react";
import ProgramList from "./ProgramList";

const FilterableProgram = ({ program, handler }) => {
  const [filtered, setFiltered] = useState(program);
  let total = filtered.length;
  let totalMessage = `Listing ${total} items`;

  function handleSearch(event) {
    const search = event.target.value.toLowerCase();
    if (search) {
      console.log(search);
      let filtered = program.filter((item) => {
        if (item.title && item.title.toLowerCase().includes(search))
          return true;
        if (item.desc && item.desc.toLowerCase().includes(search)) return true;
        if (item.people) {
          for (let person of item.people) {
            if (person.name && person.name.toLowerCase().includes(search))
              return true;
          }
        }
        return false;
      });
      setFiltered(filtered);
      return;
    }
    setFiltered(program);
  }

  return (
    <div>
      <div className="filter">
        <div className="filter-search">
          <input
            type="text"
            placeholder="Enter search text"
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
