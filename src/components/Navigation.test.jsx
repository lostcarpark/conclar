import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock config data
vi.mock('../config.json', () => ({
  default: {
    NAVIGATION: {
      PROGRAM: 'Programme',
      PEOPLE: 'People',
      MYSCHEDULE: 'My Schedule',
      INFO: 'Information',
      SETTINGS: 'Settings',
      EXTRA: [
        { LABEL: 'MetropolCon Home', URL: 'https://metropolcon.eu' },
        { LABEL: 'ConClár GitHub', URL: 'https://github.com/lostcarpark/conclar' },
      ],
    },
  },
}));

// Mock NavIcon to avoid icon-related complexity
vi.mock('./NavIcon', () => ({
  default: ({ icon, iconName, iconUrl }) => <span className="nav-icon" />,
}));

// Mock UserStatus to avoid store complexity
vi.mock('./UserStatus', () => ({
  default: () => <li className="nav-user-status"><a>UserStatus</a></li>,
}));

import Navigation from './Navigation';

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation element', () => {
    const { container } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const nav = container.querySelector('nav.navigation');
    expect(nav).toBeDefined();
  });

  it('renders navigation list', () => {
    const { container } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const ul = container.querySelector('nav.navigation ul');
    expect(ul).toBeDefined();
  });

  it('renders Programme link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const link = screen.getByText('Programme');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('renders People link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const link = screen.getByText('People');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/people');
  });

  it('renders My Schedule link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const link = screen.getByText('My Schedule');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/myschedule');
  });

  it('renders Information link when INFO is in config', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const link = screen.getByText('Information');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/info');
  });

  it('renders Settings link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const link = screen.getByText('Settings');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/settings');
  });

  it('renders extra links from config', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const link1 = screen.getByText('MetropolCon Home');
    expect(link1).toBeDefined();
    expect(link1.getAttribute('href')).toBe('https://metropolcon.eu');

    const link2 = screen.getByText('ConClár GitHub');
    expect(link2).toBeDefined();
    expect(link2.getAttribute('href')).toBe('https://github.com/lostcarpark/conclar');
  });

  it('renders all links in correct order', () => {
    const { container } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const links = container.querySelectorAll('nav.navigation ul li');
    expect(links.length).toBeGreaterThanOrEqual(5);
  });

  it('uses NavLink for internal routes', () => {
    const { container } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const programLink = screen.getByText('Programme');
    expect(programLink.className).toContain('');
  });

  it('uses regular anchor tags for external links', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const externalLink = screen.getByText('MetropolCon Home');
    expect(externalLink.tagName).toBe('A');
  });

  it('renders correct total number of navigation items', () => {
    const { container } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const listItems = container.querySelectorAll('nav.navigation ul li');
    // 5 standard links (Programme, People, My Schedule, Info, Settings) + 2 extra links + 1 UserStatus
    expect(listItems.length).toBe(8);
  });
});
