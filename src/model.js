import { action, thunk, computed } from "easy-peasy";
import { ProgramData } from "./ProgramData";
import { ProgramSelection } from "./ProgramSelection";
import { LocalTime } from "./utils/LocalTime";
import configData from "./config.json";

const model = {
  program: [],
  people: [],
  locations: [],
  tags: [],
  personTags: [],
  lastFetchTime: null,
  timeSinceLastFetch: null,
  showLocalTime: LocalTime.getStoredLocalTime(),
  show12HourTime: LocalTime.getStoredTwelveHourTime(),
  showTimeZone: LocalTime.getStoredShowTimeZone(),
  useTimeZone: LocalTime.getStoredUseTimeZone(),
  selectedTimeZone: LocalTime.getStoredSelectedTimeZone(),
  showPastItems: LocalTime.getStoredPastItems(),
  expandedItems: [],
  mySelections: ProgramSelection.getAllSelections(),
  programSelectedLocations: [],
  programSelectedTags: {},
  programSearch: "",
  peopleSelectedTags: {},
  peopleSearch: "",
  showThumbnails: localStorage.getItem("thumbnails") === "false" ? false : true,
  sortByFullName: localStorage.getItem("sort_people") === "true" ? true : false,
  onLine: window.navigator.onLine,
  // Thunks
  fetchProgram: thunk(async (actions) => {
    actions.setData(await ProgramData.fetchData());
    actions.resetLastFetchTime();
    actions.updateTimeSinceLastFetch();
  }),
  // Actions.
  setData: action((state, data) => {
    state.program = data.program;
    state.people = data.people;
    state.locations = data.locations;
    state.tags = data.tags;
    state.personTags = data.personTags;
  }),
  resetLastFetchTime: action((state) => {
    state.lastFetchTime = new Date().getTime();
  }),
  updateTimeSinceLastFetch: action((state) => {
    const milisecondsPerSec = 1000;
    state.timeSinceLastFetch = Math.floor(
      (new Date().getTime() - state.lastFetchTime) / milisecondsPerSec
    );
  }),
  setShowLocalTime: action((state, showLocalTime) => {
    state.showLocalTime = showLocalTime;
    LocalTime.setStoredLocalTime(showLocalTime);
  }),
  setShow12HourTime: action((state, show12HourTime) => {
    state.show12HourTime = show12HourTime;
    LocalTime.setStoredTwelveHourTime(show12HourTime);
  }),
  setShowTimeZone: action((state, showTimeZone) => {
    state.showTimeZone = showTimeZone;
    LocalTime.setStoredShowTimeZone(showTimeZone);
  }),
  setUseTimeZone: action((state, useTimeZone) => {
    state.useTimeZone = useTimeZone;
    LocalTime.setStoredUseTimeZone(useTimeZone);
  }),
  setSelectedTimeZone: action((state, selectedTimeZone) => {
    state.selectedTimeZone = selectedTimeZone;
    LocalTime.setStoredSelectedTimeZone(selectedTimeZone);
  }),
  setShowPastItems: action((state, showPastItems) => {
    state.showPastItems = showPastItems;
    LocalTime.setStoredPastItems(showPastItems);
  }),
  setShowThumbnails: action((state, showThumbnails) => {
    state.showThumbnails = showThumbnails;
    localStorage.setItem("thumbnails", showThumbnails ? "true" : "false");
  }),
  setSortByFullName: action((state, sortByFullName) => {
    state.sortByFullName = sortByFullName;
    localStorage.setItem("sort_people", sortByFullName ? "true" : "false");
  }),
  setOnLine: action((state, onLine) => {
    state.onLine = onLine;
  }),

  // Actions for expanding program items.
  expandItem: action((state, id) => {
    state.expandedItems.push(id);
  }),
  collapseItem: action((state, id) => {
    state.expandedItems = state.expandedItems.filter((item) => item !== id);
  }),
  expandAll: action((state) => {
    state.expandedItems = state.program.map((item) => item.id);
  }),
  collapseAll: action((state) => {
    state.expandedItems = [];
  }),

  // Actions for filtering program and people.
  setProgramSelectedLocations: action((state, selectedLocations) => {
    state.programSelectedLocations = selectedLocations;
  }),
  setProgramSelectedTags: action((state, selectedTags) => {
    state.programSelectedTags = selectedTags;
  }),
  setProgramSearch: action((state, search) => {
    state.programSearch = search;
  }),
  resetProgramFilters: action((state) => {
    state.programSelectedLocations = [];
    const newTags = {};
    for (const tag in state.programSelectedTags) {
      newTags[tag] = [];
    }
    state.programSelectedTags = newTags;
    state.programSearch = "";
  }),
  setPeopleSelectedTags: action((state, selectedTags) => {
    state.peopleSelectedTags = selectedTags;
  }),
  setPeopleSearch: action((state, search) => {
    state.peopleSearch = search;
  }),
  resetPeopleFilters: action((state) => {
    const newTags = {};
    for (const tag in state.peopleSelectedTags) {
      newTags[tag] = [];
    }
    state.peopleSelectedTags = newTags;
    state.peopleSearch = "";
  }),

  // Actions for selected items.
  setSelection: action((state, selection) => {
    state.mySelections = selection;
  }),
  addSelection: action((state, id) => {
    state.mySelections.push(id);
    ProgramSelection.setAllSelections(state.mySelections); // ToDo: Move sude effect to thunk.
  }),
  removeSelection: action((state, id) => {
    state.mySelections = state.mySelections.filter(
      (selection) => selection !== id
    );
    ProgramSelection.setAllSelections(state.mySelections);
  }),

  // Computed.
  timeToNextFetch: computed((state) => {
    return configData.TIMER.FETCH_INTERVAL_MINS * 60 - state.timeSinceLastFetch;
  }),
  timeZoneIsShown: computed((state) => {
    return (
      state.showTimeZone === "always" ||
      (state.showTimeZone === "if_local" &&
        (state.showLocalTime === "always" ||
          (state.showLocalTime === "differs" &&
            LocalTime.timezonesDiffer)))
    );
  }),
  programIsFiltered: computed((state) => {
    if (state.programSelectedLocations.length > 0) return true;
    for (const tag in state.programSelectedTags)
      if (state.programSelectedTags[tag].length > 0) return true;
    if (state.programSearch.length > 0) return true;
    return false;
  }),
  peopleAreFiltered: computed((state) => {
    for (const tag in state.peopleSelectedTags)
      if (state.peopleSelectedTags[tag].length > 0) return true;
    if (state.peopleSearch.length > 0) return true;
    return false;
  }),
  isSelected: computed((state) => {
    return (id) => state.mySelections.find((item) => item === id) || false;
  }),
  isExpanded: computed((state) => {
    return (id) => state.expandedItems.find((item) => item === id) || false;
  }),
  noneExpanded: computed((state) => state.expandedItems.length === 0),
  allExpanded: computed((state) => {
    // Loop through all items in progrm. If any not found in expanded list, return false.
    for (let item of state.program)
      if (!state.expandedItems.find((id) => item.id === id)) return false;
    // All found, so can return true.
    return true;
  }),
  getMySchedule: computed((state) =>
    state.program.filter((item) =>
      state.mySelections.find((id) => item.id === id)
    )
  ),
};

export default model;
