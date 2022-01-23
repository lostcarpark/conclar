import configData from "./config.json";

export class ProgramSelection {
  static getAllSelections() {
    // Get stored selections for application ID.
    let store = localStorage.getItem("selections_" + configData.APP_ID);
    if (store) {
      let selections = JSON.parse(store);
      if (Array.isArray(selections)) return selections;
    }
    return [];
  }
  static setAllSelections(selections) {
    localStorage.setItem(
      "selections_" + configData.APP_ID,
      JSON.stringify(selections)
    );
  }
  static processMySchedule(program, selectedItems) {
    let mySchedule = program.filter((item) => {
      if (selectedItems && selectedItems[item.id])
        return selectedItems[item.id];
      return false;
    });
    return mySchedule;
  }
}
