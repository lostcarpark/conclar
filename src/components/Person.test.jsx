import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(),
  };
});

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html),
  },
}));

// Mock react-icons
vi.mock('react-icons/md', () => ({
  MdOutlineArrowBackIos: () => <span data-testid="back-icon">←</span>,
}));

// Mock PersonLinks component
vi.mock('./PersonLinks', () => ({
  default: ({ person }) => (
    <div data-testid="person-links">Links for {person.name}</div>
  ),
}));

// Mock ProgramList component
vi.mock('./ProgramList', () => ({
  default: ({ program }) => (
    <div data-testid="program-list">{program.length} program items</div>
  ),
}));

// Mock Tag component
vi.mock('./Tag', () => ({
  default: ({ tag }) => <span data-testid="tag">{tag}</span>,
}));

// Mock config data
vi.mock('../config.json', () => ({
  default: {
    PEOPLE: {
      PERSON_HEADER: 'people.person_header',
      BIO: {
        PURIFY_OPTIONS: {},
      },
    },
  },
}));

import { useParams } from 'react-router-dom';
import { useStoreState } from 'easy-peasy';
import DOMPurify from 'dompurify';
import Person from './Person';

describe('Person', () => {
  const mockPeople = [
    {
      id: 'p1',
      name: 'John Doe',
      img: 'https://example.com/john.jpg',
      bio: '<p>John is a <strong>great</strong> speaker.</p>',
      tags: [
        { value: 'speaker', label: 'Speaker' },
        { value: 'panelist', label: 'Panelist' },
      ],
    },
    {
      id: 'p2',
      name: 'Jane Smith',
      bio: '<p>Jane is an expert.</p>',
    },
    {
      id: 'p3',
      name: 'Bob Wilson',
      img: 'https://example.com/bob.jpg',
    },
  ];

  const mockProgram = [
    {
      id: 'item1',
      title: 'Panel Discussion',
      people: [{ id: 'p1' }, { id: 'p2' }],
    },
    {
      id: 'item2',
      title: 'Workshop',
      people: [{ id: 'p1' }],
    },
    {
      id: 'item3',
      title: 'Keynote',
      people: [{ id: 'p2' }],
    },
    {
      id: 'item4',
      title: 'No People',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        people: mockPeople,
      };
      return selector(state);
    });
  });

  it('renders person name', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByText('John Doe')).toBeTruthy();
  });

  it('renders person header with translation', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByText('people.person_header')).toBeTruthy();
  });

  it('renders back button', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    const backButton = screen.getByRole('button');
    expect(backButton).toBeTruthy();
    expect(backButton.className).toContain('person-back-button');
  });

  it('navigates back when back button is clicked', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    const backButton = screen.getByRole('button');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('renders person image when img property exists', () => {
    useParams.mockReturnValue({ id: 'p1' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/john.jpg');
    expect(img.getAttribute('alt')).toBe('John Doe');
  });

  it('does not render image when img property is missing', () => {
    useParams.mockReturnValue({ id: 'p2' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('renders sanitized bio', () => {
    useParams.mockReturnValue({ id: 'p1' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    const bio = container.querySelector('.person-bio');
    expect(bio).toBeTruthy();
    expect(DOMPurify.sanitize).toHaveBeenCalledWith(
      '<p>John is a <strong>great</strong> speaker.</p>',
      {}
    );
  });

  it('renders empty bio when bio property is missing', () => {
    useParams.mockReturnValue({ id: 'p3' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    const bio = container.querySelector('.person-bio');
    expect(bio).toBeTruthy();
    expect(bio.innerHTML).toBe('');
  });

  it('renders person tags', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByText('Speaker')).toBeTruthy();
    expect(screen.getByText('Panelist')).toBeTruthy();
  });

  it('does not render tags section when person has no tags', () => {
    useParams.mockReturnValue({ id: 'p2' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(container.querySelector('.person-tags')).toBeNull();
  });

  it('renders PersonLinks component', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByTestId('person-links')).toBeTruthy();
    expect(screen.getByText('Links for John Doe')).toBeTruthy();
  });

  it('renders ProgramList with filtered program', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByTestId('program-list')).toBeTruthy();
    // Person p1 is in 2 program items (item1 and item2)
    expect(screen.getByText('2 program items')).toBeTruthy();
  });

  it('filters program correctly for person p2', () => {
    useParams.mockReturnValue({ id: 'p2' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    // Person p2 is in 2 program items (item1 and item3)
    expect(screen.getByText('2 program items')).toBeTruthy();
  });

  it('shows empty program for person not in any items', () => {
    useParams.mockReturnValue({ id: 'p3' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    // Person p3 is not in any program items
    expect(screen.getByText('0 program items')).toBeTruthy();
  });

  it('renders error message when person not found', () => {
    useParams.mockReturnValue({ id: 'invalid-id' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(container.querySelector('.error')).toBeTruthy();
    expect(screen.getByText(/was not found/)).toBeTruthy();
    expect(screen.getByText('invalid-id')).toBeTruthy();
  });

  it('handles string id comparison correctly', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByText('John Doe')).toBeTruthy();
  });

  it('has correct CSS classes', () => {
    useParams.mockReturnValue({ id: 'p1' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(container.querySelector('.person')).toBeTruthy();
    expect(container.querySelector('.person-name')).toBeTruthy();
    expect(container.querySelector('.person-title')).toBeTruthy();
    expect(container.querySelector('.person-image')).toBeTruthy();
    expect(container.querySelector('.person-bio')).toBeTruthy();
    expect(container.querySelector('.person-tags')).toBeTruthy();
  });

  it('renders back icon', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(screen.getByTestId('back-icon')).toBeTruthy();
  });

  it('filters program items without people property', () => {
    useParams.mockReturnValue({ id: 'p1' });

    render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    // Should only show items where person is listed, not item4 which has no people
    expect(screen.getByText('2 program items')).toBeTruthy();
  });

  it('handles empty tags array', () => {
    const mockPeopleWithEmptyTags = [
      {
        id: 'p4',
        name: 'Test Person',
        tags: [],
      },
    ];

    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
        people: mockPeopleWithEmptyTags,
      };
      return selector(state);
    });

    useParams.mockReturnValue({ id: 'p4' });

    const { container } = render(
      <BrowserRouter>
        <Person />
      </BrowserRouter>
    );

    expect(container.querySelector('.person-tags')).toBeNull();
  });
});
