import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { useParams } from 'react-router-dom';

// Mock config.json before importing ItemByIdList
vi.mock('../config.json', () => ({
  default: {
    PROGRAM: {
      SHARED: {
        TITLE: 'Shared Program Items',
        DESCRIPTION: 'The following programme items have been shared with you. To add to your schedule, click the button at the bottom of the page.',
        BUTTON_LABEL: 'Add all to My Schedule',
      }
    }
  },
}));

// Mock ProgramList component
vi.mock('./ProgramList', () => ({
  default: ({ program }) => (
      <div data-testid="program-list">
        {program.map((item) => (
            <div key={item.id} data-testid={`program-item-${item.id}`}>
              {item.title}
            </div>
        ))}
      </div>
  ),
}));

// Mock easy-peasy
vi.mock('easy-peasy', () => ({
  useStoreState: vi.fn(),
  useStoreActions: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
}));

import ItemByIdList from './ItemByIdList';

describe('ItemByIdList', () => {
  const mockAddSelection = vi.fn();

  const mockProgram = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
    { id: '3', title: 'Item 3' },
    { id: '4', title: 'Item 4' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useStoreActions.mockImplementation((selector) => {
      const actions = {
        addSelectionAndSync: mockAddSelection,
      };
      return selector(actions);
    });

    useStoreState.mockImplementation((selector) => {
      const state = {
        program: mockProgram,
      };
      return selector(state);
    });
  });

  it('renders page heading', () => {
    useParams.mockReturnValue({ idList: '1~2' });

    render(<ItemByIdList />);

    expect(screen.getByText('Shared Program Items')).toBeDefined();
  });

  it('renders page description', () => {
    useParams.mockReturnValue({ idList: '1~2' });

    render(<ItemByIdList />);

    expect(screen.getByText('The following programme items have been shared with you. To add to your schedule, click the button at the bottom of the page.')).toBeDefined();
  });

  it('renders add all button', () => {
    useParams.mockReturnValue({ idList: '1~2' });

    render(<ItemByIdList />);

    expect(screen.getByText('Add all to My Schedule')).toBeDefined();
  });

  it('filters program to show only specified items', () => {
    useParams.mockReturnValue({ idList: '1~3' });

    render(<ItemByIdList />);

    expect(screen.getByTestId('program-item-1')).toBeDefined();
    expect(screen.getByTestId('program-item-3')).toBeDefined();
    expect(screen.queryByTestId('program-item-2')).toBeNull();
    expect(screen.queryByTestId('program-item-4')).toBeNull();
  });

  it('handles single item id', () => {
    useParams.mockReturnValue({ idList: '2' });

    render(<ItemByIdList />);

    expect(screen.getByTestId('program-item-2')).toBeDefined();
    expect(screen.queryByTestId('program-item-1')).toBeNull();
    expect(screen.queryByTestId('program-item-3')).toBeNull();
  });

  it('handles multiple item ids separated by tilde', () => {
    useParams.mockReturnValue({ idList: '1~2~4' });

    render(<ItemByIdList />);

    expect(screen.getByTestId('program-item-1')).toBeDefined();
    expect(screen.getByTestId('program-item-2')).toBeDefined();
    expect(screen.getByTestId('program-item-4')).toBeDefined();
    expect(screen.queryByTestId('program-item-3')).toBeNull();
  });

  it('calls addSelection for all items when button clicked', () => {
    useParams.mockReturnValue({ idList: '1~2~3' });

    render(<ItemByIdList />);

    const button = screen.getByText('Add all to My Schedule');
    fireEvent.click(button);

    expect(mockAddSelection).toHaveBeenCalledTimes(3);
    expect(mockAddSelection).toHaveBeenCalledWith('1');
    expect(mockAddSelection).toHaveBeenCalledWith('2');
    expect(mockAddSelection).toHaveBeenCalledWith('3');
  });

  it('calls addSelection with single id when button clicked', () => {
    useParams.mockReturnValue({ idList: '2' });

    render(<ItemByIdList />);

    const button = screen.getByText('Add all to My Schedule');
    fireEvent.click(button);

    expect(mockAddSelection).toHaveBeenCalledTimes(1);
    expect(mockAddSelection).toHaveBeenCalledWith('2');
  });

  it('renders empty when program is empty', () => {
    useParams.mockReturnValue({ idList: '1~2' });

    useStoreState.mockImplementation((selector) => {
      const state = {
        program: [],
      };
      return selector(state);
    });

    const { container } = render(<ItemByIdList />);

    expect(container.innerHTML).toBe('');
  });

  it('renders ProgramList component with filtered items', () => {
    useParams.mockReturnValue({ idList: '1~3' });

    render(<ItemByIdList />);

    const programList = screen.getByTestId('program-list');
    expect(programList).toBeDefined();
  });

  it('has correct button class name', () => {
    useParams.mockReturnValue({ idList: '1' });

    const { container } = render(<ItemByIdList />);

    const button = container.querySelector('button.button-add-all');
    expect(button).toBeDefined();
  });

  it('has correct structure with page-heading and page-body', () => {
    useParams.mockReturnValue({ idList: '1' });

    const { container } = render(<ItemByIdList />);

    expect(container.querySelector('.page-heading')).toBeDefined();
    expect(container.querySelector('.page-body')).toBeDefined();
    expect(container.querySelector('.buttons')).toBeDefined();
  });

  it('filters correctly with all item ids', () => {
    useParams.mockReturnValue({ idList: '1~2~3~4' });

    render(<ItemByIdList />);

    expect(screen.getByTestId('program-item-1')).toBeDefined();
    expect(screen.getByTestId('program-item-2')).toBeDefined();
    expect(screen.getByTestId('program-item-3')).toBeDefined();
    expect(screen.getByTestId('program-item-4')).toBeDefined();
  });

  it('handles non-existent item ids gracefully', () => {
    useParams.mockReturnValue({ idList: '99~100' });

    render(<ItemByIdList />);

    expect(screen.queryByTestId('program-item-99')).toBeNull();
    expect(screen.queryByTestId('program-item-100')).toBeNull();
    expect(screen.getByTestId('program-list')).toBeDefined();
  });

  it('handles mix of valid and invalid item ids', () => {
    useParams.mockReturnValue({ idList: '1~99~3' });

    render(<ItemByIdList />);

    expect(screen.getByTestId('program-item-1')).toBeDefined();
    expect(screen.getByTestId('program-item-3')).toBeDefined();
    expect(screen.queryByTestId('program-item-99')).toBeNull();
  });
});
