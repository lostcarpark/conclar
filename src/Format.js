// Class containing finctions for formatting values for ConClár.
export class Format {
  static formatTag(raw) {
    let matches = raw.match(/^(.+):(.+)$/);
    if (matches.length >= 3)
      return (
        matches[1].charAt(0).toUpperCase() +
        matches[1].substr(1).toLowerCase() +
        ": " +
        matches[2]
      );
    return raw;
  }
}
