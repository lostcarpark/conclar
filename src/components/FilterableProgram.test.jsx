import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useStoreState, useStoreActions } from 'easy-peasy';


// Mock config.json before importing FilterableProgram
vi.mock('../config.json', () => ({
  default: {
    TIMEZONE: 'Europe/Dublin',
    LOCATIONS: {
      SEARCHABLE: false,
    },
    VENUES: {
      ALL_LABEL: 'All @venue',
      UNGROUPED_LABEL: 'Other',
      MAPPING: [],
    },
    PROGRAM: {
      SEARCH: {
        SEARCH_LABEL: 'Search title, desc, or people',
      },
      LIMIT: {
        SHOW: true,
        LABEL: 'Maximum items displayed',
        OPTIONS: [50, 100, 250, 500, 1000],
        ALL_LABEL: 'Show all',
        DEFAULT: 100,
        SHOW_MORE: {
          LABEL: 'Show more items',
          NO_MORE: 'No more items to display',
          NUM_EXTRA: 50,
        },
      },
    },
    HIDE_BEFORE: {
      HIDE: false,
      PLACEHOLDER: 'Select time',
      TIMES: [
        { TIME: '10:00:00', LABEL_24H: '10:00', LABEL_12H: '10am' },
      ],
    },
    EXPAND: {
      EXPAND_ALL_LABEL: 'Expand All',
      COLLAPSE_ALL_LABEL: 'Collapse All',
    },
    TAGS: {
      PLACEHOLDER: 'Select tags',
      SEARCHABLE: false,
      HIDE: false,
      SEPARATE: [],
    },
  },
}));

import FilterableProgram from './FilterableProgram';

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

// Mock Temporal
vi.mock('@js-temporal/polyfill', () => ({
  Temporal: {
    ZonedDateTime: {
      from: vi.fn(),
      compare: vi.fn(() => 0),
    },
  },
}));

// Mock LocalTime
vi.mock('../utils/LocalTime', () => ({
  LocalTime: {
    isDuringCon: vi.fn(() => false),
    filterPastItems: vi.fn((items) => items),
  },
}));

// Mock child components
vi.mock('./TagSelectors', () => ({
  default: () => <div data-testid="tag-selectors">Tag Selectors</div>,
}));

vi.mock('./ResetButton', () => ({
  default: ({ isFiltered, resetFilters }) => (
    <button
      data-testid="reset-button"
      disabled={!isFiltered}
      onClick={resetFilters}
    >
      Reset
    </button>
  ),
}));

vi.mock('./ProgramList', () => ({
  default: ({ program }) => (
    <div data-testid="program-list">
      Program List ({program.length} items)
    </div>
  ),
}));

vi.mock('./ShowPastItems', () => ({
  default: () => <div data-testid="show-past-items">Show Past Items</div>,
}));

// Mock react-select
let selectCounter = 0;
vi.mock('react-select', () => ({
  default: ({ value, onChange, placeholder, options, className }) => {
    selectCounter++;
    const testId = selectCounter === 1 ? 'location-select' : 'language-select';
    return (
    <select
      data-testid={testId}
      value={value?.value || ''}
      onChange={(e) => {
        const selected = options.find(opt => opt.value === e.target.value);
        onChange(selected ? [selected] : []);
      }}
    >
      <option value="">{placeholder}</option>
      {options?.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );}
}));

describe('FilterableProgram', () => {
  const mockExpandAll = vi.fn();
  const mockCollapseAll = vi.fn();
  const mockSetProgramSelectedLocations = vi.fn();
  const mockSetProgramSelectedLanguages = vi.fn();
  const mockSetProgramSelectedTags = vi.fn();
  const mockSetProgramHideBefore = vi.fn();
  const mockSetProgramSearch = vi.fn();
  const mockResetProgramFilters = vi.fn();
  const mockSetProgramDisplayLimit = vi.fn();

  const mockProgram = [
    {
      id: 1,
      title: 'Test Item 1',
      desc: 'Description 1',
      loc: ['room1'],
      tags: [{ category: 'type', value: 'panel' }],
      people: [{ name: 'Person 1' }],
      startDateAndTime: '2024-01-01T10:00:00Z',
    },
    {
      id: 2,
      title: 'Test Item 2',
      desc: 'Description 2',
      loc: ['room2'],
      tags: [{ category: 'type', value: 'workshop' }],
      people: [{ name: 'Person 2' }],
      startDateAndTime: '2024-01-01T11:00:00Z',
    },
  ];

  const mockLocations = [
    { value: 'room1', label: 'Room 1' },
    { value: 'room2', label: 'Room 2' },
  ];

  const mockTags = {
    type: [
      { value: 'panel', label: 'Panel' },
      { value: 'workshop', label: 'Workshop' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectCounter = 0;

    useStoreActions.mockImplementation((selector) => {
      const actions = {
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
        setProgramSelectedLocations: mockSetProgramSelectedLocations,
        setProgramSelectedLanguages: mockSetProgramSelectedLanguages,
        setProgramSelectedTags: mockSetProgramSelectedTags,
        setProgramHideBefore: mockSetProgramHideBefore,
        setProgramSearch: mockSetProgramSearch,
        resetProgramFilters: mockResetProgramFilters,
        setProgramDisplayLimit: mockSetProgramDisplayLimit,
      };
      return selector(actions);
    });

    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        locations: mockLocations,
        languages: [],
        tags: mockTags,
        showPastItems: false,
        noneExpanded: true,
        allExpanded: false,
        programSelectedLocations: [],
        programSelectedLanguages: [],
        programSelectedTags: {},
        programHideBefore: '',
        show12HourTime: false,
        programSearch: '',
        programIsFiltered: false,
        programDisplayLimit: null,
      };
      return selector(state);
    });
  });

  it('renders all filter components', () => {
    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    expect(screen.getByTestId('location-select')).toBeDefined();
    expect(screen.getByTestId('tag-selectors')).toBeDefined();
    expect(screen.getByTestId('reset-button')).toBeDefined();
    expect(screen.getByTestId('program-list')).toBeDefined();
    expect(screen.getByTestId('show-past-items')).toBeDefined();
  });

  it('displays correct item count', () => {
    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    expect(screen.getAllByText('Listing 2 items')[0]).toBeDefined();
  });

  it('handles search input change', () => {
    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search title, desc, or people');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(mockSetProgramSearch).toHaveBeenCalledWith('test search');
  });

  it('disables expand button when all items are expanded', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        locations: mockLocations,
        languages: [],
        tags: mockTags,
        showPastItems: false,
        noneExpanded: false,
        allExpanded: true,
        programSelectedLocations: [],
        programSelectedLanguages: [],
        programSelectedTags: {},
        programHideBefore: '',
        show12HourTime: false,
        programSearch: '',
        programIsFiltered: false,
        programDisplayLimit: null,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    const expandButtons = screen.getAllByText('Expand All');
    expect(expandButtons[0].disabled).toBe(true);
  });

  it('disables collapse button when no items are expanded', () => {
    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    const collapseButtons = screen.getAllByText('Collapse All');
    expect(collapseButtons[0].disabled).toBe(true);
  });

  it('calls expandAll when expand button clicked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        locations: mockLocations,
        tags: mockTags,
        showPastItems: false,
        noneExpanded: true,
        allExpanded: false,
        programSelectedLocations: [],
        programSelectedLanguages: [],
        programSelectedTags: {},
        programHideBefore: '',
        show12HourTime: false,
        programSearch: '',
        programIsFiltered: false,
        programDisplayLimit: null,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    const expandButtons = screen.getAllByText('Expand All');
    fireEvent.click(expandButtons[0]);

    expect(mockExpandAll).toHaveBeenCalled();
  });

  it('calls collapseAll when collapse button clicked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        locations: mockLocations,
        tags: mockTags,
        showPastItems: false,
        noneExpanded: false,
        allExpanded: false,
        programSelectedLocations: [],
        programSelectedTags: {},
        programHideBefore: '',
        show12HourTime: false,
        programSearch: '',
        programIsFiltered: false,
        programDisplayLimit: null,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    const collapseButtons = screen.getAllByText('Collapse All');
    fireEvent.click(collapseButtons[0]);

    expect(mockCollapseAll).toHaveBeenCalled();
  });

  it('calls resetProgramFilters when reset button clicked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        locations: mockLocations,
        tags: mockTags,
        showPastItems: false,
        noneExpanded: true,
        allExpanded: false,
        programSelectedLocations: [],
        programSelectedTags: {},
        programHideBefore: '',
        show12HourTime: false,
        programSearch: '',
        programIsFiltered: true,
        programDisplayLimit: null,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    expect(mockResetProgramFilters).toHaveBeenCalled();
  });

  it('shows "show more" button when display limit is less than total', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        locations: mockLocations,
        tags: mockTags,
        showPastItems: false,
        noneExpanded: true,
        allExpanded: false,
        programSelectedLocations: [],
        programSelectedTags: {},
        programHideBefore: '',
        show12HourTime: false,
        programSearch: '',
        programIsFiltered: false,
        programDisplayLimit: '1',
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    expect(screen.getByText('Show more items')).toBeDefined();
  });

  it('shows "no more" message when all items are displayed', () => {
    render(
      <BrowserRouter>
        <FilterableProgram />
      </BrowserRouter>
    );

    expect(screen.getByText('No more items to display')).toBeDefined();
  });
});
