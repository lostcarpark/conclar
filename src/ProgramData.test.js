import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';

// Mock config data
vi.mock('./config.json', () => ({
  default: {
    TIMEZONE: 'Europe/Berlin',
    TIMEZONECODE: 'CET',
    TAGS: {
      FORMAT_AS_TAG: false,
      SEPARATE: [
        { PREFIX: 'type', PLACEHOLDER: 'select_type' },
        { PREFIX: 'track', PLACEHOLDER: 'select_track' },
      ],
      DAY_TAG: {
        GENERATE: true,
      },
    },
    PEOPLE: {
      TAGS: {
        SEPARATE: [],
      },
    },
    LINKS: [
      { NAME: 'video', TEXT: 'Video', TAG: 'type:Video' },
      { NAME: 'signup', TEXT: 'Sign up', TAG: '' },
    ],
    INFORMATION: {
      MARKDOWN_URL: '/info.md',
    },
    PROGRAM_DATA_URL: '/program.json',
    PEOPLE_DATA_URL: '/people.json',
    FETCH_OPTIONS: { cache: 'reload' },
    FETCH_OPTIONS_FIRST: { cache: 'default' },
  },
}));

// Mock Format utility
vi.mock('./utils/Format', () => ({
  Format: {
    formatTag: vi.fn((tag) => tag.charAt(0).toUpperCase() + tag.slice(1)),
  },
}));

// Mock LocalTime utility
vi.mock('./utils/LocalTime', () => ({
  LocalTime: {
    getTimeSlot: vi.fn(() => 'morning'),
    formatISODateInConventionTimeZone: vi.fn(() => '2026-01-15'),
    formatDayNameInConventionTimeZone: vi.fn(() => 'Wednesday'),
    checkTimeZonesDiffer: vi.fn(),
  },
}));

// Mock JsonParse utility
vi.mock('./utils/JsonParse', () => ({
  JsonParse: {
    extractJson: vi.fn((data) => JSON.parse(data)),
  },
}));

import { ProgramData } from './ProgramData';

describe('ProgramData', () => {
  describe('processDateAndTime', () => {
    it('processes date and time from separate properties', () => {
      const item = {
        date: '2026-01-15',
        time: '10:00:00',
      };

      const result = ProgramData.processDateAndTime(item);

      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it('processes datetime without timezone', () => {
      const item = {
        datetime: '2026-01-15T10:00:00',
      };

      const result = ProgramData.processDateAndTime(item);

      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    });

    it('processes datetime with Z suffix', () => {
      const item = {
        datetime: '2026-01-15T10:00:00Z',
      };

      const result = ProgramData.processDateAndTime(item);

      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    });

    it('processes datetime with timezone offset', () => {
      const item = {
        datetime: '2026-01-15T10:00:00+01:00',
      };

      const result = ProgramData.processDateAndTime(item);

      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    });

    it('processes datetime with milliseconds', () => {
      const item = {
        datetime: '2026-01-15T10:00:00.123+01:00',
      };

      const result = ProgramData.processDateAndTime(item);

      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    });
  });

  describe('processProgramData', () => {
    it('processes program data and adds temporal fields', () => {
      const program = [
        {
          id: '1',
          title: 'Item 1',
          date: '2026-01-15',
          time: '10:00:00',
          mins: 60,
        },
        {
          id: '2',
          title: 'Item 2',
          date: '2026-01-15',
          time: '09:00:00',
          mins: 45,
        },
      ];

      const result = ProgramData.processProgramData(program);

      expect(result).toHaveLength(2);
      expect(result[0].startDateAndTime).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result[0].bufferedStartDateAndTime).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result[0].endDateAndTime).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result[0].bufferedEndDateAndTime).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result[0].timeSlot).toBe('morning');
    });

    it('sorts program by start date', () => {
      const program = [
        { id: '1', date: '2026-01-15', time: '14:00:00', mins: 60 },
        { id: '2', date: '2026-01-15', time: '10:00:00', mins: 60 },
        { id: '3', date: '2026-01-15', time: '12:00:00', mins: 60 },
      ];

      const result = ProgramData.processProgramData(program);

      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });

    it('handles items without mins', () => {
      const program = [
        { id: '1', date: '2026-01-15', time: '10:00:00' },
      ];

      const result = ProgramData.processProgramData(program);

      expect(result[0].endDateAndTime).toBeDefined();
    });
  });

  describe('processPeopleData', () => {
    it('processes people data and normalizes properties', () => {
      const people = [
        { id: 'p1', name: 'John Doe' },
        { id: 'p2', name: 'Jane Smith' },
      ];

      const result = ProgramData.processPeopleData(people);

      expect(result).toHaveLength(2);
      expect(result[0].sortname).toBeDefined();
      expect(result[0].uri).toBeDefined();
    });

    it('creates sortname from array name', () => {
      const people = [
        { id: 'p1', name: ['John', 'Doe'] },
      ];

      const result = ProgramData.processPeopleData(people);

      expect(result[0].sortname).toBe('Doe John');
      expect(result[0].name).toBe('John Doe');
    });

    it('uses existing sortname if provided', () => {
      const people = [
        { id: 'p1', name: 'John Doe', sortname: 'Doe, John' },
      ];

      const result = ProgramData.processPeopleData(people);

      expect(result[0].sortname).toBe('Doe, John');
    });

    it('extracts image from various sources', () => {
      const people = [
        { id: 'p1', name: 'Person 1', links: { img: 'http://example.com/img1.jpg' } },
        { id: 'p2', name: 'Person 2', links: { photo: 'http://example.com/img2.jpg' } },
        { id: 'p3', name: 'Person 3', image_256_url: 'http://example.com/img3.jpg' },
        { id: 'p4', name: 'Person 4' },
      ];

      const result = ProgramData.processPeopleData(people);

      expect(result[0].img).toBe('http://example.com/img1.jpg');
      expect(result[1].img).toBe('http://example.com/img2.jpg');
      expect(result[2].img).toBe('http://example.com/img3.jpg');
      expect(result[3].img).toBeNull();
    });

    it('sorts people by sortname', () => {
      const people = [
        { id: 'p1', name: 'Zoe Adams' },
        { id: 'p2', name: 'Alice Brown' },
        { id: 'p3', name: 'Mike Carter' },
      ];

      const result = ProgramData.processPeopleData(people);

      expect(result[0].name).toBe('Alice Brown');
      expect(result[1].name).toBe('Mike Carter');
      expect(result[2].name).toBe('Zoe Adams');
    });

    it('creates URI-encoded name', () => {
      const people = [
        { id: 'p1', name: 'John Doe' },
      ];

      const result = ProgramData.processPeopleData(people);

      expect(result[0].uri).toBe('John_Doe');
    });
  });

  describe('addProgramParticipantDetails', () => {
    it('adds full person details to program items', () => {
      const program = [
        {
          id: 'item1',
          people: [
            { id: 'p1' },
            { id: 'p2' },
          ],
        },
      ];

      const people = [
        { id: 'p1', name: 'John Doe', sortname: 'Doe, John' },
        { id: 'p2', name: 'Jane Smith', sortname: 'Smith, Jane' },
      ];

      ProgramData.addProgramParticipantDetails(program, people);

      expect(program[0].people[0].name).toBe('John Doe');
      expect(program[0].people[1].name).toBe('Jane Smith');
    });

    it('identifies moderator by role property', () => {
      const program = [
        {
          id: 'item1',
          people: [
            { id: 'p1', role: 'moderator' },
            { id: 'p2' },
          ],
        },
      ];

      const people = [
        { id: 'p1', name: 'John Doe', sortname: 'Doe, John' },
        { id: 'p2', name: 'Jane Smith', sortname: 'Smith, Jane' },
      ];

      ProgramData.addProgramParticipantDetails(program, people);

      expect(program[0].moderator).toBe('p1');
    });

    it('identifies moderator by name suffix', () => {
      const program = [
        {
          id: 'item1',
          people: [
            { id: 'p1', name: 'John Doe (moderator)' },
            { id: 'p2' },
          ],
        },
      ];

      const people = [
        { id: 'p1', name: 'John Doe', sortname: 'Doe, John' },
        { id: 'p2', name: 'Jane Smith', sortname: 'Smith, Jane' },
      ];

      ProgramData.addProgramParticipantDetails(program, people);

      expect(program[0].moderator).toBe('p1');
    });

    it('removes people not found in people array', () => {
      const program = [
        {
          id: 'item1',
          people: [
            { id: 'p1' },
            { id: 'p99' },
          ],
        },
      ];

      const people = [
        { id: 'p1', name: 'John Doe', sortname: 'Doe, John' },
      ];

      ProgramData.addProgramParticipantDetails(program, people);

      expect(program[0].people).toHaveLength(1);
      expect(program[0].people[0].id).toBe('p1');
    });

    it('sorts people within program item by sortname', () => {
      const program = [
        {
          id: 'item1',
          people: [
            { id: 'p2' },
            { id: 'p1' },
          ],
        },
      ];

      const people = [
        { id: 'p1', name: 'Alice', sortname: 'Alice' },
        { id: 'p2', name: 'Zoe', sortname: 'Zoe' },
      ];

      ProgramData.addProgramParticipantDetails(program, people);

      expect(program[0].people[0].name).toBe('Alice');
      expect(program[0].people[1].name).toBe('Zoe');
    });
  });

  describe('processLocations', () => {
    it('extracts unique locations from program', () => {
      const program = [
        { id: 'item1', loc: ['Room A', 'Room B'] },
        { id: 'item2', loc: ['Room A', 'Room C'] },
      ];

      const result = ProgramData.processLocations(program);

      expect(result).toHaveLength(3);
      expect(result.map(l => l.value)).toContain('Room A');
      expect(result.map(l => l.value)).toContain('Room B');
      expect(result.map(l => l.value)).toContain('Room C');
    });

    it('sorts locations alphabetically', () => {
      const program = [
        { id: 'item1', loc: ['Room C'] },
        { id: 'item2', loc: ['Room A'] },
        { id: 'item3', loc: ['Room B'] },
      ];

      const result = ProgramData.processLocations(program);

      expect(result[0].value).toBe('Room A');
      expect(result[1].value).toBe('Room B');
      expect(result[2].value).toBe('Room C');
    });

    it('handles items without locations', () => {
      const program = [
        { id: 'item1', loc: ['Room A'] },
        { id: 'item2' },
      ];

      const result = ProgramData.processLocations(program);

      expect(result).toHaveLength(1);
    });

    it('creates label matching value', () => {
      const program = [
        { id: 'item1', loc: ['Main Hall'] },
      ];

      const result = ProgramData.processLocations(program);

      expect(result[0].label).toBe('Main Hall');
      expect(result[0].value).toBe('Main Hall');
    });
  });

  describe('reformatAsTag', () => {
    it('adds format as tag', () => {
      const program = [
        { id: 'item1', format: 'Panel', tags: [] },
        { id: 'item2', format: 'Workshop', tags: ['existing:tag'] },
      ];

      const result = ProgramData.reformatAsTag(program);

      expect(result[0].tags).toContain('type:Panel');
      expect(result[1].tags).toContain('type:Workshop');
      expect(result[1].tags).toContain('existing:tag');
    });

    it('skips items without format', () => {
      const program = [
        { id: 'item1', tags: [] },
      ];

      const result = ProgramData.reformatAsTag(program);

      expect(result[0].tags).toHaveLength(0);
    });
  });

  describe('tagLinks', () => {
    it('adds tags for items with tagged links', () => {
      const program = [
        { id: 'item1', tags: [], links: { video: 'http://example.com/video' } },
        { id: 'item2', tags: [], links: { signup: 'http://example.com/signup' } },
        { id: 'item3', tags: [] },
      ];

      const result = ProgramData.tagLinks(program);

      expect(result[0].tags).toContain('type:Video');
      expect(result[1].tags).toHaveLength(0); // signup has no TAG
      expect(result[2].tags).toHaveLength(0);
    });
  });

  describe('processTags', () => {
    it('extracts and categorizes tags', () => {
      const items = [
        { id: 'item1', tags: ['type:Panel', 'track:Science'] },
        { id: 'item2', tags: ['type:Workshop', 'track:Art'] },
      ];

      const tagConfig = {
        SEPARATE: [
          { PREFIX: 'type' },
          { PREFIX: 'track' },
        ],
      };

      const result = ProgramData.processTags(items, tagConfig);

      expect(result.type).toBeDefined();
      expect(result.track).toBeDefined();
      expect(result.type.length).toBeGreaterThan(0);
      expect(result.track.length).toBeGreaterThan(0);
    });

    it('processes tag objects with value and label', () => {
      const items = [
        {
          id: 'item1',
          tags: [
            { value: 'panel', label: 'Panel Discussion', category: 'type' }
          ]
        },
      ];

      const tagConfig = {
        SEPARATE: [{ PREFIX: 'type' }],
      };

      const result = ProgramData.processTags(items, tagConfig);

      expect(result.all['panel']).toBeDefined();
      expect(result.all['panel'].label).toBe('Panel Discussion');
    });

    it('sorts tags alphabetically', () => {
      const items = [
        { id: 'item1', tags: ['type:Workshop', 'type:Panel', 'type:Discussion'] },
      ];

      const tagConfig = {
        SEPARATE: [{ PREFIX: 'type' }],
      };

      const result = ProgramData.processTags(items, tagConfig);

      expect(result.type[0].label).toBe('Discussion');
      expect(result.type[1].label).toBe('Panel');
      expect(result.type[2].label).toBe('Workshop');
    });
  });

  describe('fetchText', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('fetches text content', async () => {
      const mockText = 'Test content';
      global.fetch.mockResolvedValue({
        text: () => Promise.resolve(mockText),
      });

      const result = await ProgramData.fetchText('/test.txt', {});

      expect(result).toBe('Test content');
    });
  });
});
