import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStoreState, useStoreActions } from 'easy-peasy';

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

// Mock Temporal
vi.mock('@js-temporal/polyfill', () => ({
  Temporal: {
    Now: {
      timeZoneId: () => 'UTC',
    },
  },
}));

// Mock react-timezone-select
vi.mock('react-timezone-select', () => ({
  default: ({ value, onChange }) => (
    <select
      data-testid="timezone-select"
      value={value}
      onChange={(e) => onChange({ value: e.target.value })}
    >
      <option value="Europe/Berlin">Europe/Berlin</option>
      <option value="America/New_York">America/New_York</option>
    </select>
  ),
}));

// Mock config data
vi.mock('../config.json', () => ({
  default: {
    SETTINGS: {
      TITLE: {
        LABEL: 'settings.title.label',
      },
      TIME_FORMAT: {
        LABEL: 'settings.time_format.label',
        T12_HOUR_LABEL: 'settings.time_format.t12_hour_label',
        T24_HOUR_LABEL: 'settings.time_format.t24_hour_label',
      },
      SHOW_LOCAL_TIME: {
        LABEL: 'settings.show_local_time.label',
      },
      SHOW_TIMEZONE: {
        LABEL: 'settings.show_timezone.label',
      },
      SELECT_TIMEZONE: {
        LABEL: 'settings.select_timezone.label',
        SELECT_LABEL: 'settings.select_timezone.select_label',
      },
      DARK_MODE: {
        LABEL: 'settings.dark_mode.label',
        BROWSER_DEFAULT_LABEL: 'settings.dark_mode.browser_default_label',
        BROWSER_DARK_LABEL: 'settings.dark_mode.browser_dark_label',
        BROWSER_LIGHT_LABEL: 'settings.dark_mode.browser_light_label',
        LIGHT_MODE_LABEL: 'settings.dark_mode.light_mode_label',
        DARK_MODE_LABEL: 'settings.dark_mode.dark_mode_label',
      },
    },
  },
}));


import Settings from './Settings';

describe('Settings', () => {
  const mockSetShow12HourTime = vi.fn();
  const mockSetShowLocalTime = vi.fn();
  const mockSetShowTimeZone = vi.fn();
  const mockSetUseTimeZone = vi.fn();
  const mockSetSelectedTimeZone = vi.fn();
  const mockSetDarkMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useStoreActions.mockImplementation((selector) => {
      const actions = {
        setShow12HourTime: mockSetShow12HourTime,
        setShowLocalTime: mockSetShowLocalTime,
        setShowTimeZone: mockSetShowTimeZone,
        setUseTimeZone: mockSetUseTimeZone,
        setSelectedTimeZone: mockSetSelectedTimeZone,
        setDarkMode: mockSetDarkMode,
      };
      return selector(actions);
    });

    // Default state
    useStoreState.mockImplementation((selector) => {
      const state = {
        show12HourTime: false,
        showLocalTime: 'never',
        showTimeZone: 'never',
        useTimeZone: false,
        selectedTimeZone: 'UTC',
        darkMode: 'browser',
      };
      return selector(state);
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders all settings sections', () => {
    render(<Settings />);

    expect(screen.getByText('settings.title.label')).toBeDefined();
    expect(screen.getByText('settings.time_format.label')).toBeDefined();
    expect(screen.getByText('settings.show_local_time.label')).toBeDefined();
    expect(screen.getByText('settings.show_timezone.label')).toBeDefined();
    expect(screen.getByText('settings.select_timezone.label')).toBeDefined();
    expect(screen.getByText('settings.dark_mode.label')).toBeDefined();
  });

  it('handles 12/24 hour time format change', () => {
    render(<Settings />);
    
    // Initial state is 24h (show12HourTime: false)
    const radio12h = screen.getByLabelText('settings.time_format.t12_hour_label');
    fireEvent.click(radio12h);
    expect(mockSetShow12HourTime).toHaveBeenCalledWith(true);
  });

  it('handles show local time change', () => {
    render(<Settings />);
    
    // Select by value since it's unique within the radio groups we care about, 
    // or use container to scope
    const fieldset = screen.getByText('settings.show_local_time.label').closest('fieldset');
    const radioAlways = fieldset.querySelector('input[value="always"]');
    fireEvent.click(radioAlways);
    expect(mockSetShowLocalTime).toHaveBeenCalledWith('always');
  });

  it('handles show timezone change', () => {
    render(<Settings />);
    
    const fieldset = screen.getByText('settings.show_timezone.label').closest('fieldset');
    const radioAlways = fieldset.querySelector('input[value="always"]');
    fireEvent.click(radioAlways);
    expect(mockSetShowTimeZone).toHaveBeenCalledWith('always');
  });

  it('handles timezone method change', () => {
    render(<Settings />);
    
    const radioSelect = screen.getByLabelText('settings.select_timezone.select_label');
    fireEvent.click(radioSelect);
    expect(mockSetUseTimeZone).toHaveBeenCalledWith(true);
  });

  it('shows timezone select when useTimeZone is true', () => {
    useStoreState.mockImplementation((selector) => {
      const state = {
        show12HourTime: false,
        showLocalTime: 'never',
        showTimeZone: 'never',
        useTimeZone: true,
        selectedTimeZone: 'UTC',
        darkMode: 'browser',
      };
      return selector(state);
    });

    render(<Settings />);
    
    const select = screen.getByTestId('timezone-select');
    expect(select).toBeDefined();
    
    fireEvent.change(select, { target: { value: 'Europe/Berlin' } });
    expect(mockSetSelectedTimeZone).toHaveBeenCalledWith('Europe/Berlin');
  });

  it('handles dark mode change to dark', () => {
    render(<Settings />);

    const radioDark = screen.getByLabelText('settings.dark_mode.dark_mode_label');
    fireEvent.click(radioDark);
    expect(mockSetDarkMode).toHaveBeenCalledWith('dark');
  });

  it('handles dark mode change to light', () => {
    render(<Settings />);

    const radioLight = screen.getByLabelText('settings.dark_mode.light_mode_label');
    fireEvent.click(radioLight);
    expect(mockSetDarkMode).toHaveBeenCalledWith('light');
  });

  it('handles dark mode change to browser default', () => {
    // Override state: start with dark mode set to 'light' so we can change to 'browser'
    useStoreState.mockImplementation((selector) => {
      const state = {
        darkMode: 'light',  // Changed from 'browser' to 'light'
      };
      return selector(state);
    });

    render(<Settings />);

    const radioBrowser = screen.getByLabelText('settings.dark_mode.browser_default_label settings.dark_mode.browser_light_label');
    // radioBrowser is checked by default. How to uncheck it before clicking?
    fireEvent.click(radioBrowser);
    expect(mockSetDarkMode).toHaveBeenCalledWith('browser');
  });

});
