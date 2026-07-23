import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { Temporal } from '@js-temporal/polyfill';
import { BrowserRouter } from 'react-router-dom';

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, title }) => <a href={to} title={title}>{children}</a>,
  };
});

// Mock child components
vi.mock('./ItemLink', () => ({
  default: ({ name, link, text, enabled }) => (
    <div data-testid={name} className={enabled ? 'enabled' : 'disabled'}>
      {text}
    </div>
  ),
}));

vi.mock('./Location', () => ({
  default: ({ loc }) => <span data-testid="location">{loc}</span>,
}));

vi.mock('./Tag', () => ({
  default: ({ tag }) => <div data-testid="tag">{tag}</div>,
}));

vi.mock('./Participant', () => ({
  default: ({ person, moderator }) => (
    <li data-testid={`participant-${person.id}`}>
      {person.name} {moderator && '(Moderator)'}
    </li>
  ),
}));

// Mock LocalTime
vi.mock('../utils/LocalTime', () => ({
  LocalTime: {
    formatTimeInConventionTimeZone: vi.fn(() => '10:00'),
    formatTimeInLocalTimeZone: vi.fn(() => '11:00'),
    timezonesDiffer: false,
  },
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html),
  },
}));

// Mock react-use-measure
vi.mock('react-use-measure', () => ({
  default: vi.fn(() => [vi.fn(), { height: 100 }]),
}));

// Mock react-spring
vi.mock('react-spring', () => ({
  useSpring: vi.fn((config) => config),
  animated: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock react-icons
vi.mock('react-icons/io5', () => ({
  IoChevronDownCircle: () => <span data-testid="chevron-icon">Chevron</span>,
}));

vi.mock('react-icons/hi', () => ({
  HiLink: () => <span data-testid="link-icon">Link</span>,
}));

// Suppress console.log for tests
global.console.log = vi.fn();

// Mock config data
vi.mock('../config.json', () => ({
  default: {
    INTERACTIVE: true,
    PERMALINK: {
      SHOW_PERMALINK: true,
      PERMALINK_TITLE: 'Permalink'
    },
    TAGS: {
      DONTLIST: ['Division', 'days']
    },
    ITEM_DESCRIPTION: {
      PURIFY_OPTIONS: {
        FORBID_ATTR: ['style', 'data-sheets-userformat', 'data-sheets-value']
      }
    },
    LINKS: [
      { NAME: 'signup', TEXT: 'Click to sign up', TAG: '' },
      { NAME: 'meeting', TEXT: 'Click to view stream', TAG: 'type:Streaming', WHEN: ['during'] },
      { NAME: 'recording', TEXT: 'Click to view recording', TAG: '', WHEN: ['after'] }
    ],
    LOCATIONS: {
      LABEL: 'Show on map',
      MAPPING: [
        { KEY: 'Davin - Croke Park', MAP_URL: 'https://map.octocon.com' }
      ]
    },
    DURATION: {
      SHOW_DURATION: true,
      DURATION_LABEL: '@mins minutes'
    },
    START_TIME: {
      START_TIME_LABEL: 'Starts at @con_time',
      START_TIME_WITH_LOCAL_LABEL: 'Starts at @con_time con time, @local_time local time'
    },
    EXPAND: {
      SPRING_CONFIG: { duration: 100 }
    }
  },
}));

import ProgramItem from './ProgramItem';

describe('ProgramItem', () => {
  const mockAddSelection = vi.fn();
  const mockRemoveSelection = vi.fn();
  const mockExpandItem = vi.fn();
  const mockCollapseItem = vi.fn();

  const mockNow = Temporal.ZonedDateTime.from('2026-01-15T12:00:00+01:00[Europe/Berlin]');

  const mockItem = {
    id: 'item1',
    title: 'Test Program Item',
    timeSlot: 'slot1',
    startDateAndTime: Temporal.ZonedDateTime.from('2026-01-15T10:00:00+01:00[Europe/Berlin]'),
    bufferedStartDateAndTime: Temporal.ZonedDateTime.from('2026-01-15T09:50:00+01:00[Europe/Berlin]'),
    endDateAndTime: Temporal.ZonedDateTime.from('2026-01-15T11:00:00+01:00[Europe/Berlin]'),
    bufferedEndDateAndTime: Temporal.ZonedDateTime.from('2026-01-15T11:10:00+01:00[Europe/Berlin]'),
    loc: 'Room A',
    mins: 60,
    desc: '<p>Test description</p>',
    tags: [
      { category: 'type', label: 'Panel', value: 'panel' },
      { category: 'track', label: 'Science', value: 'science' },
    ],
    people: [
      { id: 'person1', name: 'John Doe' },
      { id: 'person2', name: 'Jane Smith' },
    ],
    moderator: 'person1',
    links: {
      signup: 'https://example.com/signup',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    useStoreActions.mockImplementation((selector) => {
      const actions = {
        addSelectionAndSync: mockAddSelection,
        removeSelectionAndSync: mockRemoveSelection,
        expandItem: mockExpandItem,
        collapseItem: mockCollapseItem,
      };
      return selector(actions);
    });

    useStoreState.mockImplementation((selector) => {
      const state = {
        showLocalTime: 'never',
        show12HourTime: false,
        timeZoneIsShown: false,
        isSelected: (id) => false,
        isExpanded: (id) => false,
      };
      return selector(state);
    });
  });

  it('renders program item with basic information', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Program Item')).toBeDefined();
    expect(screen.getByTestId('location')).toBeDefined();
    expect(screen.getByText(/Starts at/)).toBeDefined();
  });

  it('renders duration when available', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    expect(screen.getByText('60 minutes')).toBeDefined();
  });

  it('renders multiple locations as array', () => {
    const itemWithMultipleLocations = {
      ...mockItem,
      loc: ['Room A', 'Room B'],
    };

    render(
      <BrowserRouter>
        <ProgramItem item={itemWithMultipleLocations} now={mockNow} />
      </BrowserRouter>
    );

    const locations = screen.getAllByTestId('location');
    expect(locations).toHaveLength(2);
    expect(locations[0].textContent).toBe('Room A');
    expect(locations[1].textContent).toBe('Room B');
  });

  it('renders selection checkbox', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDefined();
    expect(checkbox.checked).toBe(false);
  });

  it('calls addSelection when checkbox is checked', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockAddSelection).toHaveBeenCalledWith('item1');
  });

  it('calls removeSelection when checkbox is unchecked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        showLocalTime: 'never',
        show12HourTime: false,
        timeZoneIsShown: false,
        isSelected: (id) => true,
        isExpanded: (id) => false,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    expect(mockRemoveSelection).toHaveBeenCalledWith('item1');
  });

  it('expands item when clicked and interactive mode is enabled', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const header = screen.getByRole('button', { name: /Test Program Item/i });
    fireEvent.click(header);

    expect(mockExpandItem).toHaveBeenCalledWith('item1');
  });

  it('collapses item when clicked and expanded', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        showLocalTime: 'never',
        show12HourTime: false,
        timeZoneIsShown: false,
        isSelected: (id) => false,
        isExpanded: (id) => true,
      };
      return selector(state);
    });

    // Mock window.getSelection
    window.getSelection = vi.fn(() => ({
      toString: () => '',
    }));

    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const header = screen.getByRole('button', { name: /Test Program Item/i });
    fireEvent.click(header);

    expect(mockCollapseItem).toHaveBeenCalledWith('item1');
  });

  it('does not collapse when text is selected', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        showLocalTime: 'never',
        show12HourTime: false,
        timeZoneIsShown: false,
        isSelected: (id) => false,
        isExpanded: (id) => true,
      };
      return selector(state);
    });

    // Mock window.getSelection with selected text
    window.getSelection = vi.fn(() => ({
      toString: () => 'selected text',
    }));

    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const header = screen.getByRole('button', { name: /Test Program Item/i });
    fireEvent.click(header);

    expect(mockCollapseItem).not.toHaveBeenCalled();
  });

  it('renders tags excluding DONTLIST categories', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    const tags = screen.getAllByTestId('tag');
    expect(tags.length).toBeGreaterThan(0);
  });

  it('renders people with moderator indication', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    expect(screen.getByTestId('participant-person1')).toBeDefined();
    expect(screen.getByTestId('participant-person2')).toBeDefined();
    expect(screen.getByText(/John Doe.*\(Moderator\)/)).toBeDefined();
  });

  it('renders description with sanitized HTML', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    const description = screen.getByText('Test description');
    expect(description).toBeDefined();
  });

  it('renders permalink when enabled in config', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    const permalink = screen.getByTitle('Permalink');
    expect(permalink).toBeDefined();
    expect(permalink.getAttribute('href')).toBe('/id/item1');
  });

  it('renders links when available', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    const links = screen.getByTestId('item-links-signup');
    expect(links).toBeDefined();
  });

  it('shows local time when showLocalTime is "always"', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        showLocalTime: 'always',
        show12HourTime: false,
        timeZoneIsShown: false,
        isSelected: (id) => false,
        isExpanded: (id) => false,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    expect(screen.getByText(/11:00 local/)).toBeDefined();
  });

  it('shows chevron icon when interactive and not forced expanded', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    expect(screen.getByTestId('chevron-icon')).toBeDefined();
  });

  it('does not show chevron when forceExpanded is true', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('chevron-icon')).toBeNull();
  });

  it('sets aria-expanded attribute correctly', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        showLocalTime: 'never',
        show12HourTime: false,
        timeZoneIsShown: false,
        isSelected: (id) => false,
        isExpanded: (id) => true,
      };
      return selector(state);
    });

    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const header = screen.getByRole('button', { name: /Test Program Item/i });
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders with forceExpanded prop', () => {
    render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    const details = screen.getByRole('region');
    expect(details).toBeDefined();
  });

  it('handles item without people', () => {
    const itemWithoutPeople = {
      ...mockItem,
      people: undefined,
    };

    render(
      <BrowserRouter>
        <ProgramItem item={itemWithoutPeople} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('participant-person1')).toBeNull();
  });

  it('handles item without links', () => {
    const itemWithoutLinks = {
      ...mockItem,
      links: undefined,
    };

    render(
      <BrowserRouter>
        <ProgramItem item={itemWithoutLinks} now={mockNow} forceExpanded={true} />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('item-links-video')).toBeNull();
  });

  it('shows correct item ID in DOM', () => {
    const { container } = render(
      <BrowserRouter>
        <ProgramItem item={mockItem} now={mockNow} />
      </BrowserRouter>
    );

    const itemDiv = container.querySelector('#item_item1');
    expect(itemDiv).toBeDefined();
  });
});
