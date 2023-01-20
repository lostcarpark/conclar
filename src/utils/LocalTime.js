import { Temporal, Intl } from "@js-temporal/polyfill";
import configData from "../config.json";

// Class containing functions for formatting values for ConClár.
export class LocalTime {
  static conventionTimeZone = new Temporal.TimeZone(configData.TIMEZONE);
  static localTimeZone = null;
  static localTimeZoneCode = null;
  static timezonesDiffer = false;
  static timeZoneIsShown = false;
  static timeSlotCache = {};
  static conventionTimeCache = [];
  static localTimeCache = [];

  // Initialise local timezone.
  static {
    this.getLocalTimeZone();
  }

  static getLocalTimeZone() {
    function lastElement(array) {
      return array[array.length - 1];
    }
    // Check if using browser default timezone, or user selected.
    const useTimeZone = this.getStoredUseTimeZone();
    const timezoneName = useTimeZone
      ? this.getStoredSelectedTimeZone()
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.localTimeZone = new Temporal.TimeZone(timezoneName);
    const language = window.navigator.userLanguage || window.navigator.language;
    // This is a bit of a fudge. I haven't found a better way to get the local time zone short code.
    // toLocaleString() can't produce just the timezone code, so need to add the hour and remove from string.
    this.localTimeZoneCode = lastElement(
      new Temporal.Now.zonedDateTimeISO(this.localTimeZone)
        .toLocaleString(language, { timeZoneName: "short" })
        .split(" ")
    );
    // Load cached times.
    const tsCache = localStorage.getItem("time_slot_cache");
    this.timeSlotCache = tsCache ? JSON.parse(tsCache) : {};
    const conTimeCache = localStorage.getItem("convention_time_cache");
    this.conventionTimeCache = conTimeCache ? JSON.parse(conTimeCache) : [];
    const locTimeCache = localStorage.getItem(
      "local_time_cache_" + this.localTimeZone
    );
    this.localTimeCache = locTimeCache ? JSON.parse(locTimeCache) : [];
  }

  static get localTimeClass() {
    return "show_local_time";
  }

  static getStoredLocalTime() {
    const storedShowLocalTime = localStorage.getItem(this.localTimeClass);
    if (["never", "differs", "always"].includes(storedShowLocalTime))
      return storedShowLocalTime;
    if (storedShowLocalTime === false || storedShowLocalTime === "false")
      return "never"; // Handle legacy boolian values.
    return "differs";
  }

  static setStoredLocalTime(showLocalTime) {
    localStorage.setItem(this.localTimeClass, showLocalTime);
  }

  static get twelveHourTimeClass() {
    return "twelve_hour_time";
  }

  static getStoredShowTimeZone() {
    const storedShowTimeZone = localStorage.getItem(this.showTimeZoneClass);
    if (["never", "if_local", "always"].includes(storedShowTimeZone))
      return storedShowTimeZone;
    if (storedShowTimeZone === false || storedShowTimeZone === "false") {
      return "never";
    }
    return "if_local";
  }

  static setStoredShowTimeZone(showTimeZone) {
    localStorage.setItem(this.showTimeZoneClass, showTimeZone);
    this.getLocalTimeZone();
  }

  static get showTimeZoneClass() {
    return "show_timezone";
  }

  static getStoredUseTimeZone() {
    const storedUseTimeZone = localStorage.getItem(this.useTimeZoneClass);
    if (storedUseTimeZone === null || storedUseTimeZone === "") {
      return false;
    }
    return storedUseTimeZone === "default" ? false : true;
  }

  static setStoredUseTimeZone(useTimeZone) {
    localStorage.setItem(
      this.useTimeZoneClass,
      useTimeZone ? "select" : "default"
    );
    this.getLocalTimeZone();
  }

  static get useTimeZoneClass() {
    return "use_timezone";
  }

  static getStoredSelectedTimeZone() {
    const storedSelectedTimeZone = localStorage.getItem(
      this.selectedTimeZoneClass
    );
    if (storedSelectedTimeZone === null || storedSelectedTimeZone === "") {
      return Temporal.Now.timeZone().toString();
    }
    return storedSelectedTimeZone;
  }

  static setStoredSelectedTimeZone(timezone) {
    localStorage.setItem(this.selectedTimeZoneClass, timezone);
    this.getLocalTimeZone();
  }

  static get selectedTimeZoneClass() {
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

  /**
   * Get time slot for time.
   */
  static getTimeSlot(dateAndTime) {
    if (this.timeSlotCache.hasOwnProperty(dateAndTime))
      return this.timeSlotCache[dateAndTime];

    const newIndex = this.conventionTimeCache.length;
    const newEntry = { dateAndTime: dateAndTime.toString() };
    this.timeSlotCache[dateAndTime] = newIndex;
    this.conventionTimeCache[newIndex] = newEntry;
    this.localTimeCache[newIndex] = newEntry;
    return newIndex;
  }

  /**
   * Save cached times to Local Storage.
   */
  static storeCachedTimes() {
    localStorage.setItem("time_slot_cache", JSON.stringify(this.timeSlotCache));
    localStorage.setItem(
      "convention_time_cache",
      JSON.stringify(this.conventionTimeCache)
    );
    localStorage.setItem(
      "local_time_cache_" + this.localTimeZone,
      JSON.stringify(this.localTimeCache)
    );
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
  static checkTimeZoneOffsetForDate(dateAndTime) {
    const instant = Temporal.Instant.from(dateAndTime);
    const localOffset = this.localTimeZone.getOffsetNanosecondsFor(instant);
    const conventionOffset =
      this.conventionTimeZone.getOffsetNanosecondsFor(instant);
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
  static checkTimeZonesDiffer(program) {
    if (program.length === 0) {
      this.timezonesDiffer = false;
      return false;
    }
    if (this.checkTimeZoneOffsetForDate(program[0].dateAndTime)) {
      this.timezonesDiffer = true;
      return true;
    }
    const [lastItem] = program.slice(-1);
    if (this.checkTimeZoneOffsetForDate(lastItem.dateAndTime)) {
      this.timezonesDiffer = true;
      return true;
    }
    this.timezonesDiffer = false;
    return false;
  }

  /**
   * Format time for 24 clock.
   * @param {temporal.ZonedDateTime} dateAndTime The data and time to format.
   * @param {bool} ampm If true, format as 12 hour clock.
   * @param {bool} showTimeZone If true, include the short timezone code.
   * @returns {string} The formatted time.
   */
  static formatTime(dateAndTime, ampm, showTimeZone = false) {
    function formatTwoDigits(number) {
      return `${number < 10 ? "0" : ""}${number}`;
    }
    function format12HourTime(dateAndTime) {
      if (dateAndTime.hour === 0)
        return `12:${formatTwoDigits(dateAndTime.minute)} ${
          configData.TIME_FORMAT.AM
        }`;
      if (dateAndTime.hour < 12)
        return `${dateAndTime.hour}:${formatTwoDigits(dateAndTime.minute)} ${
          configData.TIME_FORMAT.AM
        }`;
      if (dateAndTime.hour === 12)
        return `12:${formatTwoDigits(dateAndTime.minute)} ${
          configData.TIME_FORMAT.PM
        }`;
      return `${dateAndTime.hour - 12}:${formatTwoDigits(dateAndTime.minute)} ${
        configData.TIME_FORMAT.PM
      }`;
    }
    //let language = window.navigator.userLanguage || window.navigator.language;
    const formattedTime = ampm
      ? `${format12HourTime(dateAndTime)}`
      : `${formatTwoDigits(dateAndTime.hour)}:${formatTwoDigits(
          dateAndTime.minute
        )}`;
    // If showing convention timezone, and timezone shown, show static timezone code.
    if (
      showTimeZone &&
      configData.TIMEZONECODE.length > 0 &&
      Temporal.TimeZone.from(dateAndTime) === this.conventionTimeZone
    ) {
      return `${formattedTime} ${configData.TIMEZONECODE}`;
    }
    // If showing timezone code, append preloaded local timezone code.
    if (showTimeZone) return `${formattedTime} ${this.localTimeZoneCode}`;
    // Not showing timezone code, so just return formatted time.
    return formattedTime;
  }

  /**
   * Format the time in the convention time zone.
   * @param {int} timeSlot The numeric index of the timeslot.
   * @param {Temporal.ZonedDateTime} dateAndTime The date and time to display.
   * @param {bool} ampm If true, show 12 hour.
   * @param {bool} showTimeZone  If true show the time zone code.
   * @returns {string} The formatted time.
   */
  static formatTimeInConventionTimeZone(
    timeSlot,
    dateAndTime,
    ampm,
    showTimeZone
  ) {
    // Check if entry cached for timeslot. Create two dimensional array if not.
    const cacheValue =
      this.conventionTimeCache.indexOf(timeSlot) >= 0
        ? this.conventionTimeCache[timeSlot]
        : { dateAndTime: dateAndTime };
    //console.log (cacheValue, intAmPm, showTimeZone, cacheValue.indexOf(intAmPm))
    const cacheKey = (ampm ? "h12_" : "h24_") + (showTimeZone ? "tz" : "no");
    if (cacheValue.hasOwnProperty(cacheKey)) {
      return cacheValue[cacheKey];
    }

    cacheValue[cacheKey] = this.formatTime(
      dateAndTime.withTimeZone(this.conventionTimeZone),
      ampm,
      showTimeZone
    );
    this.conventionTimeCache[timeSlot] = cacheValue;
    return cacheValue[cacheKey];
  }

  /**
   * Format the time in the local time zone.
   * @param {Temporal.ZonedDateTime} dateAndTime The date and time to display.
   * @param {bool} ampm If true, show 12 hour.
   * @param {bool} showTimeZone  If true show the time zone code.
   * @returns {string} The formatted time.
   */
  static formatTimeInLocalTimeZone(timeSlot, dateAndTime, ampm, showTimeZone) {
    const dateAndTimeStr = dateAndTime.toString();
    // Check if entry cached for timeslot. Create two dimensional array if not.
    let cacheValue =
      this.localTimeCache.indexOf(timeSlot) >= 0
        ? this.localTimeCache[timeSlot]
        : { dateAndTime: dateAndTimeStr };
    // Make sure we have the correct cached item.
    if (cacheValue.dateAndTime !== dateAndTimeStr)
      cacheValue = { dateAndTime: dateAndTimeStr };
    //console.log("Local time slot: ", timeSlot, dateAndTime.toString(), cacheValue);
    const cacheKey = (ampm ? "h12_" : "h24_") + (showTimeZone ? "tz" : "no");
    if (cacheValue.hasOwnProperty(cacheKey)) {
      return cacheValue[cacheKey];
    }

    // Convert the program item time into local time.
    const localDateAndTime = dateAndTime.withTimeZone(this.localTimeZone);
    const formattedTime = this.formatTime(localDateAndTime, ampm, showTimeZone);
    // Get the con and local dates with time stripped out.
    const conDate = Temporal.PlainDate.from(
      dateAndTime.withTimeZone(this.conventionTimeZone)
    );
    const localDate = Temporal.PlainDate.from(localDateAndTime);

    // Compare the dates without time to see if we're showing time on next or previous day, and if so attach label.
    switch (Temporal.PlainDate.compare(localDate, conDate)) {
      case -1:
        cacheValue[cacheKey] = formattedTime + configData.LOCAL_TIME.PREV_DAY;
        break;
      case 1:
        cacheValue[cacheKey] = formattedTime + configData.LOCAL_TIME.NEXT_DAY;
        break;
      default:
        cacheValue[cacheKey] = formattedTime;
    }
    this.localTimeCache[timeSlot] = cacheValue;
    return cacheValue[cacheKey];
  }

  /**
   * Format the day name in convention time zone.
   *
   * @param {Temporal.ZonedDateTime} dateAndTime
   * @returns {string}
   */
  static formatDayNameInConventionTimeZone(dateAndTime) {
    return configData.TAGS.DAY_TAG.DAYS[
      dateAndTime.withTimeZone(this.conventionTimeZone).dayOfWeek.toString()
    ];
  }

  /**
   * Format the day name in convention time zone.
   *
   * @param {Temporal.ZonedDateTime} dateAndTime
   * @returns {string}
   */
  static formatISODateInConventionTimeZone(dateAndTime) {
    //const language = window.navigator.userLanguage || window.navigator.language;
    const conDate = dateAndTime.withTimeZone(this.conventionTimeZone);
    return (
      conDate.year +
      "-" +
      (conDate.month < 10 ? "0" : "") +
      conDate.month +
      "-" +
      (conDate.day < 10 ? "0" : "") +
      conDate.day
    );
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
