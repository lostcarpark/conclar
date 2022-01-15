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
  // This is a bit messy, as it convers to a string and back again, but it's the best I've found so far.
  static getTimeZoneOffset() {
    // Date conversion a bit precarious, so wrap in try...catch.
    try {
      let language = window.navigator.userLanguage || window.navigator.language;
      let localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = new Date();
      // Convert to string in user's timezone, then back to a date.
      const localDate = new Date(
        date.toLocaleString(language, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: localTimeZone,
        })
      );
      // Convert to string in convention timezone, and also back to date.
      const conDate = new Date(
        date.toLocaleString(language, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: configData.TIMEZONE,
        })
      );
      // Check if dates are valid. Return null if not.
      if (!(localDate instanceof Date) || isNaN(localDate) || !(conDate instanceof Date) || isNaN(conDate)) {
        return null;
      }
      // Subtracting the dates returns the offset in milliseconds. Divide by 1000 because we only need seconds.
      return (localDate - conDate) / 1000;
    } catch (e) {
      // Something went wrong. Return Null.
      return null;
    }
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
