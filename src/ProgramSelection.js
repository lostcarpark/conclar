export class ProgramSelection {
  static getAllSelections() {
    let store = localStorage.getItem("selections");
    if (store) {
      let selections = JSON.parse(store);
      if (Array.isArray(selections)) return selections;
    }
    return [];
  }
  static getSelection(id) {
    let selections = this.getAllSelections();
    if (selections && selections[id]) return selections[id];
    return false;
  }
  static setSelection(id, value) {
    let selections = this.getAllSelections();
    selections[id] = value;
    localStorage.setItem("selections", JSON.stringify(selections));
  }
}
