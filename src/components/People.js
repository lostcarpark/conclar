import PropTypes from "prop-types";
import { useStoreState, useStoreActions } from "easy-peasy";
import TagSelectors from "./TagSelectors";
import ResetButton from "./ResetButton";
import Participant from "./Participant";
import configData from "../config.json";

const People = () => {
  const people = useStoreState((state) => state.people);
  const personTags = useStoreState((state) => state.personTags);
  const showThumbnails = useStoreState((state) => state.showThumbnails);
  const setShowThumbnails = useStoreActions(
    (actions) => actions.setShowThumbnails
  );
  const sortByFullName = useStoreState((state) => state.sortByFullName);
  const setSortByFullName = useStoreActions(
    (actions) => actions.setSortByFullName
  );

  const selTags = useStoreState((state) => state.peopleSelectedTags);
  const setSelTags = useStoreActions(
    (actions) => actions.setPeopleSelectedTags
  );
  const search = useStoreState((state) => state.peopleSearch);
  const setSearch = useStoreActions(
    (actions) => actions.setPeopleSearch
  );
  const peopleAreFiltered = useStoreState((state) => state.peopleAreFiltered);
  const resetPeopleFilters = useStoreActions(
    (actions) => actions.resetPeopleFilters
  );

  // Make a copy of people array, and apply filtering and sorting.
  let displayPeople = [...people];
  if (sortByFullName)
    displayPeople.sort((a, b) => a.name.localeCompare(b.name));
  // Filter by each tag dropdown.
  for (const tagType in selTags) {
    if (selTags[tagType].length) {
      displayPeople = displayPeople.filter((item) => {
        if (item.hasOwnProperty("tags")) {
          for (const tag of item.tags) {
            for (const selected of selTags[tagType]) {
              if (selected.value === tag.value) return true;
            }
          }
        }
        return false;
      });
    }
  }
  const term = search.trim().toLowerCase();
  if (term.length > 0)
    displayPeople = displayPeople.filter((person) => {
      if (person.name.toLowerCase().includes(term)) return true;
      return false;
    });
  const rows = displayPeople.map((person) => (
    <Participant
      key={person.id}
      person={person}
      thumbnails={
        configData.PEOPLE.THUMBNAILS.SHOW_THUMBNAILS && showThumbnails
      }
    />
  ));

  const thumbnailCheckboxLabel =
    configData.PEOPLE.THUMBNAILS.SHOW_THUMBNAILS ===
    configData.PEOPLE.THUMBNAILS.SHOW_CHECKBOX
      ? configData.PEOPLE.THUMBNAILS.CHECKBOX_LABEL
      : configData.USELESS_CHECKBOX.CHECKBOX_LABEL;
  const thumbnailsCheckbox = configData.PEOPLE.THUMBNAILS.SHOW_CHECKBOX ? (
    <div className="people-thumbnails switch-wrapper">
      <input
        id="thumbnails"
        name="thumbnails"
        className="switch"
        type="checkbox"
        checked={showThumbnails}
        onChange={(e) => setShowThumbnails(e.target.checked)}
      />
      <label htmlFor="thumbnails">{thumbnailCheckboxLabel}</label>
    </div>
  ) : (
    ""
  );

  const sortCheckbox = configData.PEOPLE.SORT.SHOW_CHECKBOX ? (
    <div className="people-sort switch-wrapper">
      <input
        id="sort_people"
        name="sort_people"
        className="switch"
        type="checkbox"
        checked={sortByFullName}
        onChange={(e) => setSortByFullName(e.target.checked)}
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
        onChange={(e) => setSearch(e.target.value)}
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
        <TagSelectors
          tags={personTags}
          selTags={selTags}
          setSelTags={setSelTags}
          tagConfig={configData.PEOPLE.TAGS}
        />
        {searchInput}
        <ResetButton isFiltered={peopleAreFiltered} resetFilters={resetPeopleFilters} />
      </div>
      <ul>{rows}</ul>
    </div>
  );
};

People.propTypes = {
  people: PropTypes.array,
};

export default People;
