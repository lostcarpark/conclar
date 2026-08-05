import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStoreState, useStoreActions } from 'easy-peasy';

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

// Mock config.json before importing MySchedule
vi.mock('../config.json', () => ({
  default: {
    PROGRAM: {
      MY_SCHEDULE: {
        TITLE: 'MySchedule title',
        EMPTY: {
          TEXT: 'MySchedule empty',
        },
        INTRO: 'MySchedule intro'
      }
    },
    EXPAND: {
      EXPAND_ALL_LABEL: 'Expand All',
      COLLAPSE_ALL_LABEL: 'Collapse All',
    }
  },
}));

// Mock child components
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

vi.mock('./ShareLink', () => ({
  default: () => <div data-testid="share-link">Share Link</div>,
}));

// Mock LocalTime
vi.mock('../utils/LocalTime', () => ({
  LocalTime: {
    isDuringCon: vi.fn(),
    filterPastItems: vi.fn((items) => items),
  },
}));

import MySchedule from './MySchedule';

describe('MySchedule', () => {
  const mockExpandSelected = vi.fn();
  const mockCollapseSelected = vi.fn();

  const mockProgram = [
    { id: 1, title: 'Item 1', startDateAndTime: '2026-01-01T10:00:00Z' },
    { id: 2, title: 'Item 2', startDateAndTime: '2026-01-01T11:00:00Z' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useStoreActions.mockImplementation((selector) => {
      const actions = {
        expandSelected: mockExpandSelected,
        collapseSelected: mockCollapseSelected,
      };
      return selector(actions);
    });
  });

  it('renders empty state when no items selected', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [],
        program: mockProgram,
        showPastItems: false,
        noneExpanded: true,
        allSelectedExpanded: false,
      };
      return selector(state);
    });

    render(<MySchedule />);

    expect(screen.getByText('MySchedule title')).toBeDefined();
    expect(screen.getByText('MySchedule empty')).toBeDefined();
    expect(screen.queryByTestId('program-list')).toBeNull();
  });

  it('renders schedule with selected items', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: mockProgram,
        program: mockProgram,
        showPastItems: false,
        noneExpanded: true,
        allSelectedExpanded: false,
      };
      return selector(state);
    });

    render(<MySchedule />);

    expect(screen.getByText('MySchedule title')).toBeDefined();
    expect(screen.getByText('MySchedule intro')).toBeDefined();
    expect(screen.getByTestId('program-list')).toBeDefined();
    expect(screen.getByTestId('show-past-items')).toBeDefined();
    expect(screen.getByTestId('share-link')).toBeDefined();
  });

  it('disables expand button when all selected items are expanded', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: mockProgram,
        program: mockProgram,
        showPastItems: false,
        noneExpanded: false,
        allSelectedExpanded: true,
      };
      return selector(state);
    });

    render(<MySchedule />);

    const expandButton = screen.getByText('Expand All');
    const collapseButton = screen.getByText('Collapse All');

    expect(expandButton.disabled).toBe(true);
    expect(collapseButton.disabled).toBe(false);
  });

  it('disables collapse button when no items are expanded', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: mockProgram,
        program: mockProgram,
        showPastItems: false,
        noneExpanded: true,
        allSelectedExpanded: false,
      };
      return selector(state);
    });

    render(<MySchedule />);

    const expandButton = screen.getByText('Expand All');
    const collapseButton = screen.getByText('Collapse All');

    expect(expandButton.disabled).toBe(false);
    expect(collapseButton.disabled).toBe(true);
  });

  it('calls expandSelected when expand button clicked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: mockProgram,
        program: mockProgram,
        showPastItems: false,
        noneExpanded: true,
        allSelectedExpanded: false,
      };
      return selector(state);
    });

    render(<MySchedule />);

    const expandButton = screen.getByText('Expand All');
    fireEvent.click(expandButton);

    expect(mockExpandSelected).toHaveBeenCalled();
  });

  it('calls collapseSelected when collapse button clicked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: mockProgram,
        program: mockProgram,
        showPastItems: false,
        noneExpanded: false,
        allSelectedExpanded: false,
      };
      return selector(state);
    });

    render(<MySchedule />);

    const collapseButton = screen.getByText('Collapse All');
    fireEvent.click(collapseButton);

    expect(mockCollapseSelected).toHaveBeenCalled();
  });
});
