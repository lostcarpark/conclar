import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';

// Mock config.json BEFORE importing LocalTime.
// This ensures LocalTime gets our mocked config instead of the real one.
vi.mock('../config.json', () => ({
  default: {
    TIMEZONE: 'Europe/Dublin',
    TIMEZONECODE: 'IST',
    LOCAL_TIME: {
      PREV_DAY: ' previous day',
      NEXT_DAY: ' next day',
      FAILURE: 'Unable to convert to local time.'
    },
    TIME_FORMAT: {
      DEFAULT_12HR: false,
      AM: 'AM',
      PM: 'PM'
    },
    SHOW_PAST_ITEMS: {
      FROM_START: false,
      ADJUST_MINUTES: 10
    },
    TAGS: {
      DAY_TAG: {
        DAYS: {
          '1': 'Monday',
          '2': 'Tuesday',
          '3': 'Wednesday',
          '4': 'Thursday',
          '5': 'Friday',
          '6': 'Saturday',
          '7': 'Sunday'
        }
      }
    }
  }
}));

// Mock browser globals
const mockNavigator = {
  language: 'en-US',
  userLanguage: 'en-US'
};

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

// Import LocalTime AFTER mocking config.json
import { LocalTime } from './LocalTime';

describe('LocalTime', () => {
  let originalNow;

  beforeAll(() => {
    // Save original Temporal.Now.zonedDateTimeISO
    originalNow = Temporal.Now.zonedDateTimeISO;
    
    // Mock window globals
    global.window = global.window || {};
    global.window.navigator = mockNavigator;
    global.localStorage = mockLocalStorage;
  });

  afterAll(() => {
    // Restore original Temporal.Now.zonedDateTimeISO
    if (originalNow) {
      Temporal.Now.zonedDateTimeISO = originalNow;
    }
  });

  beforeEach(() => {
    // Reset all static properties before each test
    LocalTime.conventionTimeZone = 'Europe/Dublin';
    LocalTime.localTimeZone = null;
    LocalTime.localTimeZoneCode = null;
    LocalTime.timezonesDiffer = false;
    LocalTime.timeZoneIsShown = false;
    LocalTime.timeSlotCache = {};
    LocalTime.conventionTimeCache = [];
    LocalTime.localTimeCache = [];
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize conventionTimeZone from mocked config', () => {
      expect(LocalTime.conventionTimeZone).toBe('Europe/Dublin');
    });

    it('should have null initial values for timezone-dependent properties', () => {
      expect(LocalTime.localTimeZone).toBeNull();
      expect(LocalTime.localTimeZoneCode).toBeNull();
      expect(LocalTime.timezonesDiffer).toBe(false);
    });

    it('should have empty caches initially', () => {
      expect(LocalTime.timeSlotCache).toEqual({});
      expect(LocalTime.conventionTimeCache).toEqual([]);
      expect(LocalTime.localTimeCache).toEqual([]);
    });
  });

  describe('getTimeSlot', () => {
    it('should return cached time slot if exists', () => {
      const dateAndTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 10,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      
      // First call should add to cache and return index 0
      const firstSlot = LocalTime.getTimeSlot(dateAndTime);
      expect(firstSlot).toBe(0);
      expect(LocalTime.timeSlotCache).toHaveProperty(dateAndTime.toString(), 0);
      
      // Second call with same date should return cached value
      const secondSlot = LocalTime.getTimeSlot(dateAndTime);
      expect(secondSlot).toBe(0);
    });

    it('should return new index for new time slots', () => {
      const date1 = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 10,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const date2 = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 11,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      
      const slot1 = LocalTime.getTimeSlot(date1);
      const slot2 = LocalTime.getTimeSlot(date2);
      
      expect(slot1).toBe(0);
      expect(slot2).toBe(1);
    });
  });

  describe('formatTime', () => {
    const zonedDateTime = Temporal.ZonedDateTime.from({
      year: 2024,
      month: 1,
      day: 1,
      hour: 14,
      minute: 30,
      timeZone: 'Europe/Dublin'
    });

    it('should format 24-hour time without timezone', () => {
      const result = LocalTime.formatTime(zonedDateTime, false, false);
      expect(result).toBe('14:30');
    });

    it('should format 24-hour time with leading zero', () => {
      const earlyTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 9,
        minute: 5,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatTime(earlyTime, false, false);
      expect(result).toBe('09:05');
    });

    it('should format 12-hour time with AM', () => {
      const amTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 9,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatTime(amTime, true, false);
      expect(result).toBe('9:00 AM');
    });

    it('should format 12-hour time with PM', () => {
      const pmTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 15,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatTime(pmTime, true, false);
      expect(result).toBe('3:00 PM');
    });

    it('should format noon as 12:00 PM', () => {
      const noonTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatTime(noonTime, true, false);
      expect(result).toBe('12:00 PM');
    });

    it('should format midnight as 12:00 AM', () => {
      const midnightTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatTime(midnightTime, true, false);
      expect(result).toBe('12:00 AM');
    });

    it('should append timezone code when showTimeZone is true and matching convention timezone', () => {
      LocalTime.localTimeZoneCode = 'UTC';
      const result = LocalTime.formatTime(zonedDateTime, false, true);
      expect(result).toBe('14:30 IST');
    });
  });

  describe('formatDateForLocaleAsUTC', () => {
    it('should format date in UTC timezone', () => {
      const date = Temporal.PlainDate.from({ year: 2024, month: 1, day: 15 });
      const result = LocalTime.formatDateForLocaleAsUTC(date);
      
      expect(result).toContain('Monday');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('formatISODateInConventionTimeZone', () => {
    it('should format date in ISO format with convention timezone', () => {
      const zonedDateTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 15,
        hour: 14,
        minute: 30,
        timeZone: 'UTC'
      });
      const result = LocalTime.formatISODateInConventionTimeZone(zonedDateTime);
      expect(result).toBe('2024-01-15');
    });

    it('should format date with leading zeros for month and day', () => {
      const zonedDateTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 5,
        hour: 14,
        minute: 30,
        timeZone: 'UTC'
      });
      const result = LocalTime.formatISODateInConventionTimeZone(zonedDateTime);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('formatDayNameInConventionTimeZone', () => {
    it('should return day name for Thursday (day 4)', () => {
      const zonedDateTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 4,
        hour: 10,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatDayNameInConventionTimeZone(zonedDateTime);
      expect(result).toBe('Thursday');
    });

    it('should return day name for Monday (day 1)', () => {
      const zonedDateTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 10,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.formatDayNameInConventionTimeZone(zonedDateTime);
      expect(result).toBe('Monday');
    });
  });

  describe('checkTimeZoneOffsetForDate', () => {
    beforeEach(() => {
      LocalTime.localTimeZone = 'Europe/Dublin';
      LocalTime.conventionTimeZone = 'Europe/Dublin';
    });

    it('should return false when timezones are the same', () => {
      const zonedDateTime = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        timeZone: 'Europe/Dublin'
      });
      const result = LocalTime.checkTimeZoneOffsetForDate(zonedDateTime);
      expect(result).toBe(false);
    });
  });

  describe('checkTimeZonesDiffer', () => {
    it('should return false for empty program', () => {
      const result = LocalTime.checkTimeZonesDiffer([]);
      expect(result).toBe(false);
      expect(LocalTime.timezonesDiffer).toBe(false);
    });

    it('should return false when timezones do not differ', () => {
      LocalTime.localTimeZone = 'Europe/Dublin';
      LocalTime.conventionTimeZone = 'Europe/Dublin';
      
      const program = [
        {
          startDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 10,
            minute: 0,
            timeZone: 'Europe/Dublin'
          }),
          endDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 11,
            minute: 0,
            timeZone: 'Europe/Dublin'
          })
        }
      ];
      
      const result = LocalTime.checkTimeZonesDiffer(program);
      expect(result).toBe(false);
      expect(LocalTime.timezonesDiffer).toBe(false);
    });
  });

  describe('filterPastItems', () => {
    it('should return empty array for empty program', () => {
      const result = LocalTime.filterPastItems([]);
      expect(result).toEqual([]);
    });

    it('should filter items when FROM_START is false', () => {
      const mockNow = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        timeZone: 'UTC'
      });
      
      Temporal.Now.zonedDateTimeISO = vi.fn(() => mockNow);
      
      const program = [
        {
          startDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 10,
            minute: 0,
            timeZone: 'UTC'
          }),
          endDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 11,
            minute: 0,
            timeZone: 'UTC'
          }),
          mins: 60
        },
        {
          startDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 14,
            minute: 0,
            timeZone: 'UTC'
          }),
          endDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 15,
            minute: 0,
            timeZone: 'UTC'
          }),
          mins: 60
        }
      ];
      
      const result = LocalTime.filterPastItems(program);
      
      expect(result.length).toBe(1);
      expect(result[0].startDateAndTime.hour).toBe(14);
    });
  });

  describe('isDuringCon', () => {
    it('should return false for empty program', () => {
      const result = LocalTime.isDuringCon([]);
      expect(result).toBe(false);
    });

    it('should return false for null program', () => {
      const result = LocalTime.isDuringCon(null);
      expect(result).toBe(false);
    });

    it('should return false when before convention start', () => {
      const mockNow = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 8,
        minute: 0,
        timeZone: 'UTC'
      });
      
      Temporal.Now.zonedDateTimeISO = vi.fn(() => mockNow);
      
      const program = [
        {
          startDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 10,
            minute: 0,
            timeZone: 'UTC'
          }),
          endDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 12,
            minute: 0,
            timeZone: 'UTC'
          })
        }
      ];
      
      const result = LocalTime.isDuringCon(program);
      expect(result).toBe(false);
    });

    it('should return true when during convention', () => {
      const mockNow = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 11,
        minute: 0,
        timeZone: 'UTC'
      });
      
      Temporal.Now.zonedDateTimeISO = vi.fn(() => mockNow);
      
      const program = [
        {
          startDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 10,
            minute: 0,
            timeZone: 'UTC'
          }),
          endDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 12,
            minute: 0,
            timeZone: 'UTC'
          })
        }
      ];
      
      const result = LocalTime.isDuringCon(program);
      expect(result).toBe(true);
    });

    it('should return false when after convention end', () => {
      const mockNow = Temporal.ZonedDateTime.from({
        year: 2024,
        month: 1,
        day: 1,
        hour: 13,
        minute: 0,
        timeZone: 'UTC'
      });
      
      Temporal.Now.zonedDateTimeISO = vi.fn(() => mockNow);
      
      const program = [
        {
          startDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 10,
            minute: 0,
            timeZone: 'UTC'
          }),
          endDateAndTime: Temporal.ZonedDateTime.from({
            year: 2024,
            month: 1,
            day: 1,
            hour: 12,
            minute: 0,
            timeZone: 'UTC'
          })
        }
      ];
      
      const result = LocalTime.isDuringCon(program);
      expect(result).toBe(false);
    });
  });

  describe('storage preference functions', () => {
    it('should get and set stored local time preference', () => {
      LocalTime.setStoredLocalTime('always');
      expect(LocalTime.getStoredLocalTime()).toBe('always');
      expect(localStorage.setItem).toHaveBeenCalledWith('show_local_time', 'always');
      
      LocalTime.setStoredLocalTime('never');
      expect(LocalTime.getStoredLocalTime()).toBe('never');
    });

    it('should get and set stored show timezone preference', () => {
      LocalTime.setStoredShowTimeZone('always');
      expect(LocalTime.getStoredShowTimeZone()).toBe('always');
      
      LocalTime.setStoredShowTimeZone('never');
      expect(LocalTime.getStoredShowTimeZone()).toBe('never');
    });

    it('should get and set stored use timezone preference', () => {
      LocalTime.setStoredUseTimeZone(true);
      expect(LocalTime.getStoredUseTimeZone()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('use_timezone', 'select');
      
      LocalTime.setStoredUseTimeZone(false);
      expect(LocalTime.getStoredUseTimeZone()).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith('use_timezone', 'default');
    });

    it('should get and set stored twelve hour time preference', () => {
      LocalTime.setStoredTwelveHourTime(true);
      expect(LocalTime.getStoredTwelveHourTime()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('twelve_hour_time', 'true');
      
      LocalTime.setStoredTwelveHourTime(false);
      expect(LocalTime.getStoredTwelveHourTime()).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith('twelve_hour_time', 'false');
    });

    it('should get and set stored past items preference', () => {
      LocalTime.setStoredPastItems(true);
      expect(LocalTime.getStoredPastItems()).toBe(true);
      
      LocalTime.setStoredPastItems(false);
      expect(LocalTime.getStoredPastItems()).toBe(false);
    });

    it('should get stored selected timezone with default fallback', () => {
      LocalTime.setStoredSelectedTimeZone('America/New_York');
      expect(LocalTime.getStoredSelectedTimeZone()).toBe('America/New_York');
    });
  });

  describe('storeCachedTimes', () => {
    it('should store all caches to localStorage', () => {
      LocalTime.timeSlotCache = { 'test': 0 };
      LocalTime.conventionTimeCache = [{ dateAndTime: 'test1' }];
      LocalTime.localTimeCache = [{ dateAndTime: 'test2' }];
      LocalTime.localTimeZone = 'UTC';
      
      LocalTime.storeCachedTimes();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('time_slot_cache', '{"test":0}');
      expect(localStorage.setItem).toHaveBeenCalledWith('convention_time_cache', '[{"dateAndTime":"test1"}]');
      expect(localStorage.setItem).toHaveBeenCalledWith('local_time_cache_UTC', '[{"dateAndTime":"test2"}]');
    });
  });
});
