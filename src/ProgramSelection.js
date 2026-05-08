import configData from "./config.json";

function getStorageKey(userId) {
  const storageKey = "selections_" + configData.APP_ID;
  return userId ? `${storageKey}_${userId}` : storageKey;
}

export class ProgramSelection {
  static getSelectionStore(userId) {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return { version: 2, selections: {} };
    }
    const parsed = JSON.parse(raw);
    // Migrate from old array format.
    if (Array.isArray(parsed)) {
      const selections = {};
      for (const id of parsed) {
        selections[id] = { selected: true, dirty: true };
      }
      const store = { version: 2, selections };
      ProgramSelection.setSelectionStore(store, userId);
      return store;
    }
    if (parsed.version === 2) {
      return parsed;
    }
    return { version: 2, selections: {} };
  }

  static setSelectionStore(store, userId) {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(store));
  }

  static clearSelectionStore(userId) {
    localStorage.removeItem(getStorageKey(userId));
  }

  static getSelectedIds(userId) {
    const store = ProgramSelection.getSelectionStore(userId);
    return Object.keys(store.selections).filter(
      (id) => store.selections[id].selected
    );
  }

}
