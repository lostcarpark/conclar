import { Temporal, Intl } from "@js-temporal/polyfill";
import configData from "../config.json";

// Class containing finctions for formatting values for ConClár.
export class LocalTime {
  static conventionTimezone = new Temporal.TimeZone(configData.TIMEZONE);
  static localTimezone = null;
  static timezonesDiffer = false;

  // Initialise local timezone.
  static {
    this.getLocalTimezone();
  }

  static getLocalTimezone() {
    const useTimezone = this.getStoredUseTimezone();
    const timezoneName = useTimezone
      ? this.getStoredSelectedTimezone()
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.localTimezone = new Temporal.TimeZone(timezoneName);
  }

  static get localTimeClass() {
    return "show_local_time";
  }

  static getStoredLocalTime() {
    const storedShowLocalTime = localStorage.getItem(this.localTimeClass);
    if (storedShowLocalTime === null) return "differs";
    if (storedShowLocalTime === false) return "never"; // Handle legacy boolian values.
    if (storedShowLocalTime === true) return "differs";
    return storedShowLocalTime;
  }

  static setStoredLocalTime(showLocalTime) {
    localStorage.setItem(this.localTimeClass, showLocalTime);
  }

  static get twelveHourTimeClass() {
    return "twelve_hour_time";
  }

  static getStoredUseTimezone() {
    const storedUseTimezone = localStorage.getItem(this.useTimezoneClass);
    if (storedUseTimezone === null || storedUseTimezone === "") {
      return false;
    }
    return storedUseTimezone === "default" ? false : true;
  }

  static setStoredUseTimezone(useTimezone) {
    localStorage.setItem(
      this.useTimezoneClass,
      useTimezone ? "select" : "default"
    );
  }

  static get useTimezoneClass() {
    return "use_timezone";
  }

  static getStoredSelectedTimezone() {
    const storedSelectedTimezone = localStorage.getItem(
      this.selectedTimezoneClass
    );
    if (storedSelectedTimezone === null || storedSelectedTimezone === "") {
      return Temporal.Now.timeZone().toString();
    }
    return storedSelectedTimezone;
  }

  static setStoredSelectedTimezone(timezone) {
    localStorage.setItem(this.selectedTimezoneClass, timezone);
    this.getLocalTimezone();
  }

  static get selectedTimezoneClass() {
    return "selected_timezone";
  }

  static getStoredTwelveHourTime() {
    const stored12HourTime = localStorage.getItem(this.twelveHourTimeClass);
    if (configData.TIME_FORMAT.DEFAULT_12HR)
      // If defaulting to 12 hour, assume true unless "false" saved.
      return stored12HourTime === "false" ? false : true;
    // If defaulting to 24 hour, assume false unless "true" saved.
    return stored12HourTime === "true" ? true : false;
  }

  static setStoredTwelveHourTime(twelveHour) {
    localStorage.setItem(
      this.twelveHourTimeClass,
      twelveHour ? "true" : "false"
    );
  }

  static get pastItemsClass() {
    return "show_past_items";
  }

  static getStoredPastItems() {
    const storedPastItems = localStorage.getItem(this.pastItemsClass);
    return storedPastItems === "false" ? false : true;
  }

  static setStoredPastItems(showPastItems) {
    localStorage.setItem(this.pastItemsClass, showPastItems ? "true" : "false");
  }

  // Format the date as a string in user's language.
  static formatDateForLocaleAsUTC(date) {
    let language = window.navigator.userLanguage || window.navigator.language;
    // Assume UTC timezone for purpose of formatting date headings.
    let dateTime = Temporal.PlainDate.from(date);
    //if (isNaN(dateTime.getTime())) return "";
    return dateTime.toLocaleString(language, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * Check a single date to see if different in convention and local timezone.
   * @param {Temporal.ZonedDateTime} dateAndTime
   * @returns {bool}
   */
  static checkTimezoneOffsetForDate(dateAndTime) {
    const instant = Temporal.Instant.from(dateAndTime);
    const localOffset = this.localTimezone.getOffsetNanosecondsFor(instant);
    const conventionOffset =
      this.conventionTimezone.getOffsetNanosecondsFor(instant);
    if (localOffset !== conventionOffset) {
      return true;
    }
    return false;
  }

  /**
   * Check if timezone offset different at either start or end of convention.
   *
   * @param {array} program
   * @returns {bool}
   */
  static checkTimezonesDiffer(program) {
    if (program.length === 0) {
      this.timezonesDiffer = false;
      return false;
    }
    if (this.checkTimezoneOffsetForDate(program[0].dateAndTime)) {
      this.timezonesDiffer = true;
      return true;
    }
    const [lastItem] = program.slice(-1);
    if (this.checkTimezoneOffsetForDate(lastItem.dateAndTime)) {
      this.timezonesDiffer = true;
      return true;
    }
    this.timezonesDiffer = false;
    return false;
  }

  // Format time for 24 clock.
  static formatTime(dateAndTime, ampm) {
    let language = window.navigator.userLanguage || window.navigator.language;
    const options = ampm
      ? {
          hour: "numeric",
          minute: "2-digit",
          hour12: "h12",
        }
      : {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        };
    return dateAndTime.toLocaleString(language, options);
  }

  // Format the time in the convention time zone. Currently this is not reformatted, but it may be in future.
  static formatTimeInConventionTimeZone(dateAndTime, ampm) {
    return this.formatTime(
      dateAndTime.withTimeZone(this.conventionTimezone),
      ampm
    );
  }

  static formatTimeInLocalTimeZone(dateAndTime, ampm) {
    // Convert the program item time into local time.
    const localDateAndTime = dateAndTime.withTimeZone(this.localTimezone);
    const formattedTime = this.formatTime(localDateAndTime, ampm);
    // Get the con and local dates with time stripped out.
    const conDate = Temporal.PlainDate.from(dateAndTime);
    const localDate = Temporal.PlainDate.from(localDateAndTime);
    // Compare the dates without time to see if we're showing time on next or previous day, and if so attach label.
    switch (Temporal.PlainDate.compare(localDate, conDate)) {
      case -1:
        return formattedTime + configData.LOCAL_TIME.PREV_DAY;
      case 1:
        return formattedTime + configData.LOCAL_TIME.NEXT_DAY;
      default:
        return formattedTime;
    }
  }

  /**
   * Filter out program items that have already happened.
   *
   * @param {Array} program
   * @param {bool} showPastItems
   * @returns {Array}
   */
  static filterPastItems(program) {
    if (configData.SHOW_PAST_ITEMS.FROM_START) {
      // Filter by past item state.  Quick hack to treat this as a filter.
      const cutOff = Temporal.Now.zonedDateTimeISO("UTC").add({
        minutes: configData.SHOW_PAST_ITEMS.ADJUST_MINUTES,
      });
      return program.filter((item) => {
        return Temporal.ZonedDateTime.compare(cutOff, item.dateAndTime) <= 0;
      });
    } else {
      const cutOff = Temporal.Now.zonedDateTimeISO("UTC").subtract({
        minutes: configData.SHOW_PAST_ITEMS.ADJUST_MINUTES,
      });
      return program.filter((item) => {
        const itemNearEndTime = item.dateAndTime.add({
          minutes: item.hasOwnProperty("mins")
            ? item.mins
            : configData.SHOW_PAST_ITEMS.ADJUST_MINUTES,
        });
        return Temporal.ZonedDateTime.compare(cutOff, itemNearEndTime) <= 0;
      });
    }
  }

  /**
   * Check if currently during the convention.
   *
   * @param {Array} program
   * @returns {bool}
   */
  static isDuringCon(program) {
    //First check that program is an array.
    if (!program || !(program instanceof Array) || program.length === 0) {
      return false;
    }
    const now = Temporal.Now.zonedDateTimeISO("UTC");
    const startTime = program[0].dateAndTime;
    const [lastItem] = program.slice(-1);
    const endTime = lastItem.dateAndTime.add({
      minutes: lastItem.mins ? lastItem.mins : 0,
    });
    // True if between start of first item and end of last item.
    // ToDo: consider edge case where the item with the latest end time is not the last item.
    return (
      Temporal.ZonedDateTime.compare(now, startTime) > 0 &&
      Temporal.ZonedDateTime.compare(now, endTime) < 0
    );
  }
}
