import { action, thunk, computed } from "easy-peasy";
import configData from "./config.json";
import { ProgramData } from "./ProgramData";
import { ProgramSelection } from "./ProgramSelection";
import { JsonParse } from "./utils/JsonParse";
import { LocalTime } from "./utils/LocalTime";

const model = {
  program: [],
  people: [],
  locations: [],
  tags: [],
  showLocalTime: LocalTime.getStoredLocalTime(),
  show12HourTime: LocalTime.getStoredTwelveHourTime(),
  showPastItems: LocalTime.getStoredPastItems(),
  expandedItems: [],
  mySelections: ProgramSelection.getAllSelections(),
  showThumbnails: localStorage.getItem("thumbnails") === "false" ? false : true,
  sortByFullName: localStorage.getItem("sort_people") === "true" ? true : false,
  offset: LocalTime.getTimeZoneOffset(),
  // Thunks
  fetchProgram: thunk(async (actions) => {
    // If only one data source, we can use a single fetch.
    if (configData.PROGRAM_DATA_URL === configData.PEOPLE_DATA_URL) {
      const res = await fetch(configData.PROGRAM_DATA_URL);
      const data = await res.text();
      const entities = JsonParse.extractJson(data);
      actions.setData(ProgramData.processData(entities[0], entities[1]));
    } else {
      // Separate program and people sources, so need to create promise for each fetch.
      const progPromise = fetch(configData.PROGRAM_DATA_URL).then((res) =>
        res.text()
      );
      const pplPromise = fetch(configData.PEOPLE_DATA_URL).then((res) =>
        res.text()
      );
      const data = await Promise.all([progPromise, pplPromise]);
      const rawProgram = JsonParse.extractJson(data[0])[0];
      const rawPeople = JsonParse.extractJson(data[1])[0];
      // Called with an array containing result of each promise.
      actions.setData(ProgramData.processData(rawProgram, rawPeople));
    }
  }),
  // Actions.
  setData: action((state, data) => {
    state.program = data.program;
    state.people = data.people;
    state.locations = data.locations;
    state.tags = data.tags;
  }),
  setShowLocalTime: action((state, showLocalTime) => {
    state.showLocalTime = showLocalTime;
  }),
  setShow12HourTime: action((state, show12HourTime) => {
    state.show12HourTime = show12HourTime;
  }),
  setShowPastItems: action((state, showPastItems) => {
    state.showPastItems = showPastItems;
  }),
  setShowThumbnails: action((state, showThumbnails) => {
    state.showThumbnails = showThumbnails;
    localStorage.setItem("thumbnails", showThumbnails ? "true" : "false");
  }),
  setSortByFullName: action((state, sortByFullName) => {
    state.sortByFullName = sortByFullName;
    localStorage.setItem("sort_people", sortByFullName ? "true" : "false");
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
