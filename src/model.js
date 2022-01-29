import { action, thunk, computed } from "easy-peasy";
import { ProgramData } from "./ProgramData";
import { ProgramSelection } from "./ProgramSelection";
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
  onLine: window.navigator.onLine,
  // Thunks
  fetchProgram: thunk(async (actions) => {
    actions.setData(await ProgramData.fetchData());
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
