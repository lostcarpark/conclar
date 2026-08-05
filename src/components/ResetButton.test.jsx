import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock config.json import - must be at top level with vi.mock
vi.mock('../config.json', () => ({
  default: {
    FILTER: {
      RESET: {
        LABEL: 'Clear Filters'
      }
    }
  }
}));

import ResetButton from './ResetButton';

describe('ResetButton', () => {
  it('should render the reset button when isFiltered is true', () => {
    const resetFilters = vi.fn();
    render(<ResetButton isFiltered={true} resetFilters={resetFilters} />);

    const button = screen.getByRole('button', { name: /clear filters/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('reset-button');
  });

  it('should not render anything when isFiltered is false', () => {
    const resetFilters = vi.fn();
    render(<ResetButton isFiltered={false} resetFilters={resetFilters} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should display the label from config', () => {
    const resetFilters = vi.fn();
    render(<ResetButton isFiltered={true} resetFilters={resetFilters} />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Clear Filters');
  });

  it('should call resetFilters when clicked', () => {
    const resetFilters = vi.fn();
    render(<ResetButton isFiltered={true} resetFilters={resetFilters} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(resetFilters).toHaveBeenCalledTimes(1);
  });
});
