import PropTypes from "prop-types";
import { useStoreState, useStoreActions } from "easy-peasy";
import TagSelectors from "./TagSelectors";
import ResetButton from "./ResetButton";
import Participant from "./Participant";
import Switch from "./Switch";
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
  const setSearch = useStoreActions((actions) => actions.setPeopleSearch);
  const peopleAreFiltered = useStoreState((state) => state.peopleAreFiltered);

  const resetPeopleFilters = useStoreActions((actions) => actions.resetPeopleFilters);

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
    <Switch
      id="thumbnails"
      label={thumbnailCheckboxLabel}
      checked={showThumbnails}
      onChange={setShowThumbnails} />
  ) : (
    ""
  );

  const sortCheckbox = configData.PEOPLE.SORT.SHOW_CHECKBOX ? (
    <Switch
      id="sort_people"
      label={configData.PEOPLE.SORT.CHECKBOX_LABEL}
      checked={sortByFullName}
      onChange={setSortByFullName} />
  ) : (
    ""
  );

  const searchInput = configData.PEOPLE.SEARCH.SHOW_SEARCH ? (
    <div className="people-search">
      <label htmlFor="people-search">Search people</label>
      <input
        id="people-search"
        type="search"
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
      <div role="search">
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
        </div>
        <div className="reset-filters">
          <ResetButton
            isFiltered={peopleAreFiltered}
            resetFilters={resetPeopleFilters}
          />
        </div>
      </div>
      <main>
        <ul>{rows}</ul>
      </main>
    </div>
  );
};

People.propTypes = {
  people: PropTypes.array,
};

export default People;
