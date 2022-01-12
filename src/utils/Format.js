import configData from "../config.json";

// Class containing finctions for formatting values for ConClár.
export class Format {
  // Format the date as a string in user's language.
  static formatDateForLocaleAsUTC(date) {
    let language = window.navigator.userLanguage || window.navigator.language;
    // Assume UTC timezone for purpose of formatting date headings.
    let dateTime = new Date(date + "T00:00:00.000Z");
    return dateTime.toLocaleDateString(language, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  // Get the offset from the convention time to the user's local time in miliseconds.
  static getTimeZoneOffset() {
    let language = window.navigator.userLanguage || window.navigator.language;
    let localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date();
    const localDate = new Date(
      date.toLocaleString(language, { timeZone: localTimeZone })
    );
    const conDate = new Date(
      date.toLocaleString(language, { timeZone: configData.TIMEZONE })
    );
    return (localDate - conDate) / 1000;
  }

  // Format the time in the convention time zone. Currently this is not reformatted, but it may be in future.
  static formatTimeInConventionTimeZone(time) {
    return time;
  }

  static formatTimeInLocalTimeZone(time, offset) {
    const HOUR = 3600;
    const MINUTE = 60;
    const matches = time.match(/^(\d{1,2})[^\d](\d{2})$/);
    if (matches) {
      const conTime = matches[1] * HOUR + matches[2] * MINUTE;
      const localTime = conTime + offset;
      let hours = Math.floor(localTime / HOUR);
      let note = "";
      if (hours < 0) {
        hours += 24;
        note = configData.LOCAL_TIME.PREV_DAY;
      }
      if (hours > 23) {
        hours -= 24;
        note = configData.LOCAL_TIME.NEXT_DAY;
      }
      const mins = Math.floor((localTime % HOUR) / MINUTE);
      return hours + ":" + (mins < 10 ? "0" : "") + mins + note;
    }
    return time;
  }

  // If tag contains a ":", capitalise the part before the colon, and add a space after the colon.
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
