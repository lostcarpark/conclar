import { Temporal, Intl } from "@js-temporal/polyfill";
import configData from "../config.json";

// Class containing finctions for formatting values for ConClár.
export class LocalTime {
  static conventionTimezone = new Temporal.TimeZone(configData.TIMEZONE);
  static localTimezone = null;

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

  // Get offset between local timezone and convention timezone in milliseconds.
  // This used to be a mess, but rewritten to use Temporal API, which should be a lot more reliable.
  // ToDo: Add UI for selecting any timezone to display.
  static getTimeZoneOffset() {
    const instant = Temporal.Now.instant();
    const localTZ = new Temporal.TimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    const localOffset = localTZ.getOffsetNanosecondsFor(instant);
    const conventionTZ = new Temporal.TimeZone(configData.TIMEZONE);
    const conventionOffset = conventionTZ.getOffsetNanosecondsFor(instant);
    return (localOffset - conventionOffset) / 1000000;
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

  static formatTimeInLocalTimeZone(dateAndTime, offset, ampm) {
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

  static dateToConTime(datetime) {
    //SO: https://stackoverflow.com/a/53652131
    //datetime is a javascript Date object

    let invdate = new Date(
      datetime.toLocaleString("en-US", {
        timeZone: configData.TIMEZONE,
      })
    );

    var diff = datetime.getTime() - invdate.getTime();

    var conTime = new Date(datetime.getTime() - diff);

    //Make the adjustment.
    conTime.setMinutes(
      conTime.getMinutes() - (configData.SHOW_PAST_ITEMS.ADJUST_MINUTES || 0)
    );

    //parse into dates and times in KonOpas format (hopefully)
    let conTimeFormatted = {};
    conTimeFormatted.date =
      conTime.getFullYear() +
      "-" +
      ("0" + (conTime.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + conTime.getDate()).slice(-2);
    conTimeFormatted.time =
      ("0" + conTime.getHours()).slice(-2) +
      ":" +
      ("0" + conTime.getMinutes()).slice(-2);

    return conTimeFormatted;
  }

  // Check if currently during the convention.
  // ToDO: Rework using Temporal API.
  static inConTime(program) {
    //Expects the program items to have dates.
    const today = new Date();
    const aDay = 3600 * 1000 * 24; //in  milliseconds
    const firstItem = program[0];
    const lastItem = program[program.length - 1];
    //Pad by one day to avoid time zone issues.
    const tomorrow = this.dateToConTime(new Date(Date.now(today) + aDay));
    const yesterday = this.dateToConTime(new Date(Date.now(today) - aDay));
    //Neither the first day of con is after tomorrow nor the last day of con is before yesterday.
    return !(firstItem.date > tomorrow.date || lastItem.date < yesterday.date);
  }
}
