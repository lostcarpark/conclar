import React, { useState } from "react";
import PropTypes from "prop-types";
import Participant from "./Participant";
import configData from "../config.json";

const People = ({ people }) => {
  const storedThumbnails = localStorage.getItem("thumbnails"); // Get default thumbnails from local storage.
  const [thumbnails, setThumbnails] = useState(
    storedThumbnails === "false" ? false : true
  ); // Default to true unless false explicitly stored.
  const storedSort = localStorage.getItem("sort_people"); // Get default sort order from local storage.
  const [sort, setSort] = useState(storedSort === "true" ? true : false);
  const [search, setSearch] = useState("");
  //console.log(people);
  const rows = [];

  // Make a copy of people array, and apply filtering and sorting.
  let displayPeople = [...people];
  if (sort)
    displayPeople.sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
  const term = search.trim().toLowerCase();
  if (term.length > 0)
    displayPeople = displayPeople.filter((person) => {
      if (person.name.toLowerCase().includes(term)) return true;
      return false;
    });
  for (const person of displayPeople) {
    rows.push(
      <Participant key={person.id} person={person} thumbnails={thumbnails} />
    );
  }

  function handleThumbnail(event) {
    setThumbnails(event.target.checked);
    localStorage.setItem("thumbnails", event.target.checked ? "true" : "false");
  }

  function handleSort(event) {
    setSort(event.target.checked);
    localStorage.setItem(
      "sort_people",
      event.target.checked ? "true" : "false"
    );
  }

  function handleSearch(event) {
    setSearch(event.target.value);
  }

  const thumbnailsCheckbox = configData.PEOPLE.THUMBNAILS.SHOW_CHECKBOX ? (
    <div className="people-thumbnails">
      <input
        id="thumbnails"
        name="thumbnails"
        type="checkbox"
        checked={thumbnails}
        onChange={handleThumbnail}
      />
      <label htmlFor="thumbnails">
        {configData.PEOPLE.THUMBNAILS.CHECKBOX_LABEL}
      </label>
    </div>
  ) : (
    ""
  );

  const sortCheckbox = configData.PEOPLE.SORT.SHOW_CHECKBOX ? (
    <div className="people-sort">
      <input
        id="sort_people"
        name="sort_people"
        type="checkbox"
        checked={sort}
        onChange={handleSort}
      />
      <label htmlFor="thumbnails">
        {configData.PEOPLE.SORT.CHECKBOX_LABEL}
      </label>
    </div>
  ) : (
    ""
  );

  const searchInput = configData.PEOPLE.SEARCH.SHOW_SEARCH ? (
    <div className="people-search">
      <input
        type="text"
        value={search}
        onChange={handleSearch}
        placeholder={configData.PEOPLE.SEARCH.SEARCH_LABEL}
      />
    </div>
  ) : (
    ""
  );

  return (
    <div className="people">
      <div className="people-settings">
        {thumbnailsCheckbox}
        {sortCheckbox}
        {searchInput}
      </div>
      <ul>{rows}</ul>
    </div>
  );
};

People.propTypes = {
  people: PropTypes.array,
};

export default People;
