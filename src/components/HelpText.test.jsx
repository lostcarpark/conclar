import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStoreState, useStoreActions } from 'easy-peasy';

// Mock config.json before importing HelpText
vi.mock('../config.json', () => ({
  default: {
    HELP_TEXT: {
      WELCOME: 'Welcome to ConClár. You can use the checkboxes next to programme items to make a personal schedule. You can view this on the My Schedule page, and share to other devices.',
      SHARING: 'You may share your personal schedule to other devices using the QR codes on the My Schedule page.',
      CLOSE_ARIA_LABEL: 'Dismiss help text',
    },
  },
}));

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

import HelpText from './HelpText';

describe('HelpText', () => {
  const mockSetHelpTextDismissed = vi.fn();
  const mockT = vi.fn((key) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    useStoreActions.mockReturnValue(mockSetHelpTextDismissed);
  });

  it('renders WELCOME text when schedule is empty and not dismissed', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [],
        helpTextDismissed: {},
      };
      return selector(state);
    });

    render(<HelpText />);

    expect(screen.getByText('Welcome to ConClár. You can use the checkboxes next to programme items to make a personal schedule. You can view this on the My Schedule page, and share to other devices.')).toBeDefined();
  });

  it('renders SHARING text when schedule is not empty and not dismissed', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [{ id: 1 }],
        helpTextDismissed: {},
      };
      return selector(state);
    });

    render(<HelpText />);

    expect(screen.getByText('You may share your personal schedule to other devices using the QR codes on the My Schedule page.')).toBeDefined();
  });

  it('does not render when WELCOME is dismissed', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [],
        helpTextDismissed: { WELCOME: true },
      };
      return selector(state);
    });

    const { container } = render(<HelpText />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when SHARING is dismissed', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [{ id: 1 }],
        helpTextDismissed: { SHARING: true },
      };
      return selector(state);
    });

    const { container } = render(<HelpText />);
    expect(container.firstChild).toBeNull();
  });

  it('calls dismiss action when close button is clicked', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [],
        helpTextDismissed: {},
      };
      return selector(state);
    });

    render(<HelpText />);
    
    const closeButton = screen.getByRole('button', { name: 'Dismiss help text' });
    fireEvent.click(closeButton);

    expect(mockSetHelpTextDismissed).toHaveBeenCalledWith({ WELCOME: true });
  });

  it('calls dismiss action with SHARING key when schedule is not empty', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        getMySchedule: [{ id: 1 }],
        helpTextDismissed: { WELCOME: true },
      };
      return selector(state);
    });

    render(<HelpText />);
    
    const closeButton = screen.getByRole('button', { name: 'Dismiss help text' });
    fireEvent.click(closeButton);

    expect(mockSetHelpTextDismissed).toHaveBeenCalledWith({ WELCOME: true, SHARING: true });
  });
});
