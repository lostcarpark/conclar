export class Format {
  /**
   * If tag contains a ":", capitalise the part before the colon, and add a space after the colon.
   * @param {string} raw
   * @returns string
   */
  static formatTag(raw) {
    let matches = raw.match(/^(.+):(.+)$/);
    if (matches && matches.length >= 3)
      return (
        matches[1].charAt(0).toUpperCase() +
        matches[1].substr(1).toLowerCase() +
        ": " +
        matches[2]
      );
    return raw;
  }
}
