import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Switch from './Switch';

describe('Switch', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    id: 'test-switch',
    label: 'Test Label',
    checked: false,
    onChange: mockOnChange,
  };

  it('renders with correct label and initial state', () => {
    render(<Switch {...defaultProps} />);
    
    const button = screen.getByRole('checkbox', { name: 'Test Label' });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('renders with checked state when checked is true', () => {
    render(<Switch {...defaultProps} checked={true} />);
    
    const button = screen.getByRole('checkbox', { name: 'Test Label' });
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange with true when clicked and initially unchecked', () => {
    render(<Switch {...defaultProps} />);
    
    const button = screen.getByRole('checkbox', { name: 'Test Label' });
    fireEvent.click(button);
    
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when clicked and initially checked', () => {
    render(<Switch {...defaultProps} checked={true} />);
    
    const button = screen.getByRole('checkbox', { name: 'Test Label' });
    fireEvent.click(button);
    
    expect(mockOnChange).toHaveBeenCalledWith(false);
  });
});
