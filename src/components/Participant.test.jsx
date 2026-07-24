import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: actual.BrowserRouter,
    Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock config data
vi.mock('../config.json', () => ({
  default: {
    INTERACTIVE: true,
    PEOPLE: {
      THUMBNAILS: {
        DEFAULT_IMAGE: '/images/default-avatar.png',
        SHOW_THUMBNAILS: true,
      },
      MODERATORS: {
        MODERATOR_LABEL: 'people.moderators.moderator_label',
      }
    }
  }
}));

import Participant from './Participant';

describe('Participant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.publicUrl = '/';

  });

  it('renders participant name', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    render(
      <BrowserRouter>
        <Participant person={person} />
      </BrowserRouter>
    );

    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('renders as list item', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} />
      </BrowserRouter>
    );

    expect(container.querySelector('li.participant')).toBeDefined();
  });

  it('renders link to person page when interactive', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    render(
      <BrowserRouter>
        <Participant person={person} />
      </BrowserRouter>
    );

    const link = screen.getByText('John Doe').closest('a');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/people/p1');
  });

  it('renders participant with custom image', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
    };

    const { container } = render(<Participant person={person} thumbnails={true} />);

    // The image is inside a Link, check the entire HTML structure
    const participantLi = container.querySelector('.participant');
    expect(participantLi).toBeTruthy();

    const img = participantLi.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/john.jpg');
  });

  it('has participant-default-image class for default image', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} />
      </BrowserRouter>
    );

    expect(container.querySelector('.participant-default-image')).toBeDefined();
  });

  it('does not have participant-default-image class for custom image', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} />
      </BrowserRouter>
    );

    expect(container.querySelector('.participant-default-image')).toBeNull();
  });

  it('displays moderator label when moderator prop is true', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    render(
      <BrowserRouter>
        <Participant person={person} moderator={true} />
      </BrowserRouter>
    );

    expect(screen.getByText('people.moderators.moderator_label')).toBeDefined();
  });

  it('does not display moderator label when moderator prop is false', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    render(
      <BrowserRouter>
        <Participant person={person} moderator={false} />
      </BrowserRouter>
    );

    expect(screen.queryByText('(moderator)')).toBeNull();
  });

  it('has moderator class on moderator label', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} moderator={true} />
      </BrowserRouter>
    );

    const moderatorSpan = container.querySelector('.moderator');
    expect(moderatorSpan).toBeDefined();
    expect(moderatorSpan.textContent).toBe('people.moderators.moderator_label');
  });

  it('does not render thumbnail when thumbnails prop is false', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} thumbnails={false} />
      </BrowserRouter>
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('renders thumbnail by default (thumbnails prop defaults to true)', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
    };

    const { container } = render(<Participant person={person} thumbnails={true} />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
  });

  it('hides image on error', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/broken.jpg',
    };

    const { container } = render(<Participant person={person} thumbnails={true} />);

    const participantLi = container.querySelector('.participant');
    expect(participantLi).toBeTruthy();
    const img = participantLi.querySelector('img');
    expect(img).toBeTruthy();

    // Trigger error event
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('renders empty alt text for images', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
    };

    const { container } = render(<Participant person={person} thumbnails={true} />);

    const participantLi = container.querySelector('.participant');
    expect(participantLi).toBeTruthy();
    const img = participantLi.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('');
  });

  it('uses window.publicUrl for default image', () => {
    window.publicUrl = '/app';

    const person = {
      id: 'p1',
      name: 'John Doe',
    };

    const { container } = render(<Participant person={person} thumbnails={true} />);

    const participantLi = container.querySelector('.participant');
    expect(participantLi).toBeTruthy();
    const img = participantLi.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/app/images/default-avatar.png');
  });

  it('has participant-image class on image container', () => {
    const person = {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} />
      </BrowserRouter>
    );

    expect(container.querySelector('.participant-image')).toBeDefined();
  });

  it('renders both name and moderator label together', () => {
    const person = {
      id: 'p1',
      name: 'Jane Smith',
    };

    const { container } = render(
      <BrowserRouter>
        <Participant person={person} moderator={true} />
      </BrowserRouter>
    );

    const participantElement = container.querySelector('.participant');
    expect(participantElement.textContent).toContain('Jane Smith');
    expect(participantElement.textContent).toContain('people.moderators.moderator_label');
  });

  it('renders participant with image and moderator label', () => {
    const person = {
      id: 'p1',
      name: 'Jane Smith',
      img: 'https://example.com/jane.jpg',
    };

    const { container } = render(<Participant person={person} moderator={true} thumbnails={true} />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('people.moderators.moderator_label')).toBeDefined();
  });
});
