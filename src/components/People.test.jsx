import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { MemoryRouter } from 'react-router-dom';

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

// Mock config.json to ensure consistent test environment
vi.mock('../config.json', () => ({
  default: {
    PEOPLE: {
      THUMBNAILS: {
        SHOW_THUMBNAILS: true,
        SHOW_CHECKBOX: true,
        CHECKBOX_LABEL: 'people.thumbnails.checkbox_label',
      },
      SORT: {
        SHOW_CHECKBOX: true,
        CHECKBOX_LABEL: 'people.sort.checkbox_label'
      },
      TAGS: {
        SEARCHABLE: false,
        HIDE: false,
        SEPARATE: []
      },
      SEARCH: {
        SHOW_SEARCH: true,
        SEARCH_LABEL: 'people.search.search_label'
      }
    },
    FILTER: {
      RESET: {
        LABEL: 'filter.reset.label'
      }
    },
    INTERACTIVE: true,
    USELESS_CHECKBOX: {
      CHECKBOX_LABEL: 'useless_checkbox.checkbox_label',
    },
  }
}));

import People from './People';

describe('People Component', () => {
  const mockPeople = [
    { id: '1', name: 'Alice Smith', tags: [{ value: 'tag1' }] },
    { id: '2', name: 'Zoe Brown', tags: [{ value: 'tag2' }] },
    { id: '3', name: 'Charlie Day', tags: [{ value: 'tag1' }] },
  ];

  const mockPersonTags = {
    Type: [
      { value: 'tag1', label: 'Tag 1' },
      { value: 'tag2', label: 'Tag 2' },
    ]
  };

  const mockActions = {
    setShowThumbnails: vi.fn(),
    setSortByFullName: vi.fn(),
    setPeopleSelectedTags: vi.fn(),
    setPeopleSearch: vi.fn(),
    resetPeopleFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    useStoreActions.mockImplementation((selector) => selector(mockActions));
  });

  const setupStore = (overrides = {}) => {
    const state = {
      people: mockPeople,
      personTags: mockPersonTags,
      showThumbnails: true,
      sortByFullName: false,
      peopleSelectedTags: {},
      peopleSearch: '',
      peopleAreFiltered: false,
      ...overrides,
    };
    useStoreState.mockImplementation((selector) => selector(state));
  };

  it('renders a list of people', () => {
    setupStore();
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Zoe Brown')).toBeInTheDocument();
    expect(screen.getByText('Charlie Day')).toBeInTheDocument();
  });

  it('sorts people by name when sortByFullName is true', () => {
    setupStore({ sortByFullName: true });
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Alice Smith');
    expect(items[1]).toHaveTextContent('Charlie Day');
    expect(items[2]).toHaveTextContent('Zoe Brown');
  });

  it('filters people by search term', () => {
    setupStore({ peopleSearch: 'Alice' });
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Zoe Brown')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Day')).not.toBeInTheDocument();
  });

  it('filters people by tags', () => {
    setupStore({ 
      peopleSelectedTags: { 
        Type: [{ value: 'tag2', label: 'Tag 2' }] 
      } 
    });
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Zoe Brown')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Day')).not.toBeInTheDocument();
  });

  it('calls setPeopleSearch when search input changes', () => {
    setupStore();
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText('people.search.search_label');
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    expect(mockActions.setPeopleSearch).toHaveBeenCalledWith('Bob');
  });

  it('calls setSortByFullName when sort checkbox is toggled', () => {
    setupStore({ sortByFullName: false });
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    const sortCheckbox = screen.getByText('people.sort.checkbox_label');
    fireEvent.click(sortCheckbox);

    expect(mockActions.setSortByFullName).toHaveBeenCalledWith(true);
  });

  it('calls setShowThumbnails when thumbnails checkbox is toggled', () => {
    setupStore({ showThumbnails: true });
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    const thumbCheckbox = screen.getByText('people.thumbnails.checkbox_label');
    fireEvent.click(thumbCheckbox);

    expect(mockActions.setShowThumbnails).toHaveBeenCalledWith(false);
  });

  it('renders ResetButton and calls resetPeopleFilters when clicked', () => {
    setupStore({ peopleAreFiltered: true });
    render(
      <MemoryRouter>
        <People />
      </MemoryRouter>
    );

    const resetButton = screen.getByRole('button', { name: 'filter.reset.label' });
    fireEvent.click(resetButton);

    expect(mockActions.resetPeopleFilters).toHaveBeenCalled();
  });
});
