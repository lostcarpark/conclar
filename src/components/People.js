import React, { useState } from "react";
import { useStoreState, useStoreActions } from "easy-peasy";
import PropTypes from "prop-types";
import Participant from "./Participant";
import configData from "../config.json";

const People = () => {
  const people = useStoreState((state) => state.people);
  const showThumbnails = useStoreState((state) => state.showThumbnails);
  const setShowThumbnails = useStoreActions(
    (actions) => actions.setShowThumbnails
  );
  const sortByFullName = useStoreState((state) => state.sortByFullName);
  const setSortByFullName = useStoreActions(
    (actions) => actions.setSortByFullName
  );

  const [search, setSearch] = useState("");
  //console.log(people);
  const rows = [];

  // Make a copy of people array, and apply filtering and sorting.
  let displayPeople = [...people];
  if (sortByFullName)
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
      <Participant
        key={person.id}
        person={person}
        thumbnails={showThumbnails}
      />
    );
  }

  function handleThumbnail(event) {
    setShowThumbnails(event.target.checked);
    console.log("Thumbnails: ", event.target.checked);
  }

  function handleSort(event) {
    setSortByFullName(event.target.checked);
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
        checked={showThumbnails}
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
        checked={sortByFullName}
        onChange={handleSort}
      />
      <label htmlFor="sort_people">
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
