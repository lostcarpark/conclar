import configData from "../config.json";

// Class containing finctions for formatting values for ConClár.
export class LocalTime {
  static get localTimeClass() {
    return "show_local_time";
  }

  static getStoredLocalTime() {
    const storedLocalTime = localStorage.getItem(this.localTimeClass);
    return storedLocalTime === "false" ? false : true;
  }

  static setStoredLocalTime(showLocalTime) {
    localStorage.setItem(this.localTimeClass, showLocalTime ? "true" : "false");
  }

  static get twelveHourTimeClass() {
    return "twelve_hour_time";
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
    let dateTime = new Date(date + "T00:00:00.000Z");
		if (isNaN(dateTime.getTime()))
			return "";
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
      if (
        !(localDate instanceof Date) ||
        isNaN(localDate) ||
        !(conDate instanceof Date) ||
        isNaN(conDate)
      ) {
        return null;
      }
      // Subtracting the dates returns the offset in milliseconds. Divide by 1000 because we only need seconds.
      return (localDate - conDate) / 1000;
    } catch (e) {
      // Something went wrong. Return Null.
      return null;
    }
  }

  // Format with leading 0 if less than 10.
  static FormatLeadingZero(num) {
    return (num < 10 ? "0" : "") + num;
  }

  // Take date in "hh:mm" format, and return hours and minutes.
  static parseTime(time) {
    const matches = time.match(/^(\d{1,2})[^\d](\d{2})$/);
    const hours = parseInt(matches[1]);
    const mins = parseInt(matches[2]);
    return [hours, mins];
  }

  // Use toLocaleString to generate a 12 hour time in user's locale.
  static formatHoursMinsAs12Hour(hours, mins) {
    let language = window.navigator.userLanguage || window.navigator.language;
    let time = new Date();
    time.setUTCHours(hours);
    time.setUTCMinutes(mins);
    return time.toLocaleString(language, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  }

  // Format a time for 12 hour clock.
  static formatTimeAs12Hour(time) {
    let [hours, mins] = this.parseTime(time);
    return this.formatHoursMinsAs12Hour(hours, mins);
  }

  // Use
  static formatHoursMinsAs24Hour(hours, mins) {
    let language = window.navigator.userLanguage || window.navigator.language;
    let time = new Date();
    time.setUTCHours(hours);
    time.setUTCMinutes(mins);
    return time.toLocaleString(language, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }

  // Format time for 24 clock.
  static formatTimeAs24Hour(time) {
    let [hours, mins] = this.parseTime(time);
    return this.formatHoursMinsAs24Hour(hours, mins);
  }

  // Format the time in the convention time zone. Currently this is not reformatted, but it may be in future.
  static formatTimeInConventionTimeZone(time, ampm) {
    if (ampm) {
      return this.formatTimeAs12Hour(time);
    }
    return this.formatTimeAs24Hour(time);
  }

  static formatTimeInLocalTimeZone(time, offset, ampm) {
    const HOUR = 3600;
    const MINUTE = 60;
    let [hours, mins] = this.parseTime(time);
    const conTime = hours * HOUR + mins * MINUTE;
    const localTime = conTime + offset;
    let localHours = Math.floor(localTime / HOUR);
    let note = "";
    if (localHours < 0) {
      localHours += 24;
      note = configData.LOCAL_TIME.PREV_DAY;
    }
    if (localHours > 23) {
      localHours -= 24;
      note = configData.LOCAL_TIME.NEXT_DAY;
    }
    const localMins = Math.floor((localTime % HOUR) / MINUTE);

    if (ampm) return this.formatHoursMinsAs12Hour(localHours, localMins) + note;
    return this.formatHoursMinsAs24Hour(localHours, localMins) + note;
  }

  static dateToConTime(datetime) {
    //SO: https://stackoverflow.com/a/53652131
		//datetime is a javascript Date object

    let invdate = new Date(datetime.toLocaleString('en-US', {
      timeZone: configData.TIMEZONE
    }));

    var diff = datetime.getTime() - invdate.getTime();

    var conTime = new Date(datetime.getTime() - diff);

    //Make the adjustment.
    conTime.setMinutes(conTime.getMinutes() - (configData.SHOW_PAST_ITEMS.ADJUST_MINUTES || 0));

    //parse into dates and times in KonOpas format (hopefully)
    let conTimeFormatted = {};
    conTimeFormatted.date = conTime.getFullYear() + "-" + ('0' + (conTime.getMonth() + 1)).slice(-2) +  "-" + ('0' + conTime.getDate()).slice(-2);
    conTimeFormatted.time = ('0' + conTime.getHours()).slice(-2) + ":" + ('0' + conTime.getMinutes()).slice(-2);
    
    return conTimeFormatted;
  }

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
		return !(firstItem.date > tomorrow.date || lastItem.date < yesterday.date)
	}

}
