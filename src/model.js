import { action, thunk, computed } from "easy-peasy";
import { ProgramData } from "./ProgramData";
import { ProgramSelection } from "./ProgramSelection";
import { LocalTime } from "./utils/LocalTime";
import * as SyncService from "./SyncService";
import configData from "./config.json";

function getSelectedIdsFromStore(selectionStore) {
  return Object.keys(selectionStore).filter(
    (id) => selectionStore[id].selected
  );
}

let pushInFlight = null;
let pushNeeded = false;
const SYNC_WARNING_KEY = "sync_warning_dismissed_" + configData.APP_ID;
let syncWarningShown = !!localStorage.getItem(SYNC_WARNING_KEY);

async function coalescedSync(actions) {
  if (pushInFlight) {
    // A push is already running. Flag that another is needed and wait.
    pushNeeded = true;
    await pushInFlight;
    return;
  }

  async function run() {
    do {
      pushNeeded = false;
      await actions.syncSelections();
    } while (pushNeeded);
  }

  pushInFlight = run();
  try {
    await pushInFlight;
  } finally {
    pushInFlight = null;
  }
}

function updateLocalStore(selectionStore, userId) {
  ProgramSelection.setSelectionStore(
    { version: 2, selections: selectionStore },
    userId
  );
}

const model = {
  isLoading: true,
  program: [],
  people: [],
  locations: [],
  tags: [],
  personTags: [],
  info: "",
  lastFetchTime: null,
  timeSinceLastFetch: null,
  helpTextDismissed: () => {
    const dismissed = localStorage.getItem("help_text_dismissed_" + configData.APP_ID);
    return (dismissed) ? JSON.parse(dismissed) : [];
  },
  showLocalTime: LocalTime.getStoredLocalTime(),
  show12HourTime: LocalTime.getStoredTwelveHourTime(),
  showTimeZone: LocalTime.getStoredShowTimeZone(),
  useTimeZone: LocalTime.getStoredUseTimeZone(),
  selectedTimeZone: LocalTime.getStoredSelectedTimeZone(),
  showPastItems: LocalTime.getStoredPastItems(),
  expandedItems: [],
  programDisplayLimit: localStorage.getItem("program_display_limit"),
  selectionStore: ProgramSelection.getSelectionStore().selections,
  mySelections: ProgramSelection.getSelectedIds(),
  currentUserId: null,
  userProfile: null,
  programSelectedLocations: [],
  programSelectedTags: {},
  programHideBefore: "",
  programSearch: "",
  peopleSelectedTags: {},
  peopleSearch: "",
  showThumbnails: localStorage.getItem("thumbnails") === "false" ? false : true,
  sortByFullName: localStorage.getItem("sort_people") === "true" ? true : false,
  onLine: window.navigator.onLine,
  darkMode: localStorage.getItem("dark_mode") ? localStorage.getItem("dark_mode") : 'browser',
  showSyncWarning: false,
  // Thunks
  fetchProgram: thunk(async (actions, firstTime) => {
    actions.setData(await ProgramData.fetchData(firstTime));
    actions.resetLastFetchTime(firstTime);
    actions.updateTimeSinceLastFetch();
    actions.setIsLoadingFalse();
  }),

  // Sync thunks
  fetchProfile: thunk(async (actions) => {
    if (!SyncService.isSyncEnabled()) {
      return;
    }
    try {
      const profile = await SyncService.fetchProfile();
      actions.setUserProfile(profile);
      if (profile.authenticated) {
        const userId = profile.id;
        actions.setCurrentUserId(userId);

        // Migrate anonymous selections into the user-specific store.
        // Only carry over true selections — false values from anonymous browsing
        // should not override the user's actual server state.
        const anonStore = ProgramSelection.getSelectionStore().selections;
        const anonSelections = Object.fromEntries(
          Object.entries(anonStore).filter(([, entry]) => entry.selected)
        );
        const userStore = ProgramSelection.getSelectionStore(userId).selections;
        const merged = SyncService.mergeSelections(anonSelections, userStore);
        actions.setSelectionStore(merged);
        ProgramSelection.clearSelectionStore();

        await actions.syncSelections({ fullSync: true });
      } else {
        actions.setCurrentUserId(null);
        const anonStore = ProgramSelection.getSelectionStore().selections;
        actions.setSelectionStore(anonStore);
      }
    } catch (e) {
      console.warn("Profile fetch failed:", e);
      actions.setUserProfile({ error: true });
    }
  }),

  syncSelections: thunk(async (actions, payload, { getState }) => {
    if (!SyncService.isSyncEnabled()) {
      return;
    }
    const state = getState();
    if (!state.userProfile || !state.userProfile.authenticated) {
      return;
    }
    const fullSync = payload && payload.fullSync;
    try {
      // On full sync (page load), GET and merge everything from the server
      // so the user sees other devices' changes.
      if (fullSync) {
        const serverSelections = await SyncService.fetchSelections();
        if (!serverSelections) {
          return;
        }
        // Start from server state, then layer any unsynced local changes on top.
        const localDirty = SyncService.getDirtySelections(getState().selectionStore);
        const merged = { ...serverSelections, ...localDirty };
        actions.setSelectionStore(merged);
      }

      const localStore = getState().selectionStore;
      const dirty = SyncService.getDirtySelections(localStore);
      const pushResult = await SyncService.pushSelections(dirty);
      if (pushResult.unauthorized) {
        return;
      }
      if (pushResult.selections) {
        const current = getState().selectionStore;
        const updated = { ...current };
        for (const [id, entry] of Object.entries(pushResult.selections)) {
          // Only update entries that haven't changed since the push started.
          if (current[id].selected === dirty[id].selected) {
            updated[id] = entry;
          }
        }
        actions.setSelectionStore(updated);
      }
    } catch (e) {
      console.warn("Selection sync failed:", e);
    }
  }),

  // Actions.
  setIsLoadingFalse: action((state) => (state.isLoading = false)),
  setData: action((state, data) => {
    state.program = data.program;
    state.people = data.people;
    state.locations = data.locations;
    state.tags = data.tags;
    state.personTags = data.personTags;
    state.info = data.info;
  }),
  setInfo: action((state, info) => state.info = info),
  resetLastFetchTime: action((state, firstTime) => {
    const milisecondsPerMinute = 60000;
    const offset = firstTime ? configData.TIMER.FETCH_INTERVAL_MINS * milisecondsPerMinute : 0;
    state.lastFetchTime = new Date(new Date() - offset).getTime();
  }),
  updateTimeSinceLastFetch: action((state) => {
    const milisecondsPerSec = 1000;
    state.timeSinceLastFetch = Math.floor(
      (new Date().getTime() - state.lastFetchTime) / milisecondsPerSec
    );
  }),
  setHelpTextDismissed: action((state, helpTextDismissed) => {
    state.helpTextDismissed = helpTextDismissed;
    localStorage.setItem("help_text_dismissed_" + configData.APP_ID, JSON.stringify(helpTextDismissed));
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
  setOnLine: thunk(async (actions, onLine, { getState }) => {
    const wasOffline = !getState().onLine;
    actions._setOnLine(onLine);
    if (wasOffline && onLine) {
      await actions.syncSelections({ fullSync: true });
    }
  }),
  _setOnLine: action((state, onLine) => {
    state.onLine = onLine;
  }),
  setDarkMode: action((state, darkMode) => {
    state.darkMode = darkMode;
    localStorage.setItem("dark_mode", darkMode);
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
  expandSelected: action((state) => {
    state.expandedItems = [...state.mySelections];
  }),
  collapseSelected: action((state) => {
    state.expandedItems = [];
  }),

  // Action for number of items displayed.
  setProgramDisplayLimit: action((state, limit) => {
    if (limit === "all") {
      localStorage.setItem("program_display_limit", limit);
      state.programDisplayLimit = limit;
    }
    if (!isNaN(limit)) {
      localStorage.setItem("program_display_limit", limit);
      state.programDisplayLimit = limit;
    }
    // Take no action if limit is not numeric or null.
  }),

  // Actions for filtering program and people.
  setProgramSelectedLocations: action((state, selectedLocations) => {
    state.programSelectedLocations = selectedLocations;
  }),
  setProgramSelectedTags: action((state, selectedTags) => {
    state.programSelectedTags = selectedTags;
  }),
  setProgramHideBefore: action((state, hideBefore) => {
    state.programHideBefore = hideBefore;
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
    state.programHideBefore = "";
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
  setSelectionStore: action((state, selections) => {
    state.selectionStore = selections;
    state.mySelections = getSelectedIdsFromStore(selections);
    updateLocalStore(selections, state.currentUserId);
  }),
  setCurrentUserId: action((state, userId) => {
    state.currentUserId = userId;
  }),
  setUserProfile: action((state, profile) => {
    state.userProfile = profile;
  }),
  setSelection: action((state, selection) => {
    state.mySelections = selection;
  }),
  addSelection: action((state, id) => {
    if (!state.mySelections.includes(id)) {
      state.mySelections.push(id);
    }
    state.selectionStore[id] = { selected: true, dirty: true };
    updateLocalStore(state.selectionStore, state.currentUserId);
  }),
  removeSelection: action((state, id) => {
    state.mySelections = state.mySelections.filter(
      (selection) => selection !== id
    );
    state.selectionStore[id] = { selected: false, dirty: true };
    updateLocalStore(state.selectionStore, state.currentUserId);
  }),

  setShowSyncWarning: action((state, show) => {
    state.showSyncWarning = show;
    if (!show) {
      localStorage.setItem(SYNC_WARNING_KEY, "true");
      syncWarningShown = true;
    }
  }),

  // Thunks for sync-aware selection changes.
  addSelectionAndSync: thunk(async (actions, id, { getState }) => {
    actions.addSelection(id);
    if (SyncService.isSyncEnabled() && !syncWarningShown) {
      const state = getState();
      if (state.userProfile && !state.userProfile.authenticated && !state.userProfile.error) {
        syncWarningShown = true;
        actions.setShowSyncWarning(true);
      }
    }
    await coalescedSync(actions);
  }),
  removeSelectionAndSync: thunk(async (actions, id, { getState }) => {
    actions.removeSelection(id);
    if (SyncService.isSyncEnabled() && !syncWarningShown) {
      const state = getState();
      if (state.userProfile && !state.userProfile.authenticated && !state.userProfile.error) {
        syncWarningShown = true;
        actions.setShowSyncWarning(true);
      }
    }
    await coalescedSync(actions);
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
          (state.showLocalTime === "differs" && LocalTime.timezonesDiffer)))
    );
  }),
  programIsFiltered: computed((state) => {
    if (state.programSelectedLocations.length > 0) return true;
    for (const tag in state.programSelectedTags)
      if (state.programSelectedTags[tag].length > 0) return true;
    if (state.programHideBefore.length > 0) return true;
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
  allSelectedExpanded: computed((state) => {
    // Loop through all items in progrm. If any not found in expanded list, return false.
    for (let item of state.mySelections)
      if (!state.expandedItems.find((id) => item === id)) return false;
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
