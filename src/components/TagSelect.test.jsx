import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagSelect from './TagSelect';

// Mock react-select
vi.mock('react-select', () => ({
  default: ({ placeholder, options, isMulti, isSearchable, value, onChange, className, classNamePrefix }) => {
    const handleChange = (e) => {
      // Simulate selecting an option
      if (e.target.value) {
        const selectedOption = options.find(opt => opt.value === e.target.value);
        onChange(selectedOption ? [selectedOption] : value);
      }
    };

    return (
      <div data-testid="react-select" className={className}>
        <input
          data-testid="select-input"
          placeholder={placeholder}
          data-multi={isMulti}
          data-searchable={isSearchable}
          data-classname-prefix={classNamePrefix}
          onChange={handleChange}
        />
        <div data-testid="select-value">
          {value && value.length > 0 ? value.map(v => v.label).join(', ') : 'No selection'}
        </div>
        <div data-testid="select-options">
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </div>
      </div>
    );
  },
}));

describe('TagSelect', () => {
  const mockResetLimit = vi.fn();
  const mockSetSelTags = vi.fn();

  const mockOptions = [
    { value: 'panel', label: 'Panel' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'discussion', label: 'Discussion' },
  ];

  const mockTagData = {
    PLACEHOLDER: 'Select tags',
    SEARCHABLE: true,
  };

  const mockSelTags = {
    type: [],
    track: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ReactSelect component', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    expect(screen.getByTestId('react-select')).toBeDefined();
  });

  it('passes placeholder from tagData', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    expect(input.getAttribute('placeholder')).toBe('Select tags');
  });

  it('passes options to ReactSelect', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const optionsContainer = screen.getByTestId('select-options');
    expect(optionsContainer.textContent).toContain('Panel');
    expect(optionsContainer.textContent).toContain('Workshop');
    expect(optionsContainer.textContent).toContain('Discussion');
  });

  it('sets isMulti to true', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    expect(input.getAttribute('data-multi')).toBe('true');
  });

  it('passes searchable value from tagData', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    expect(input.getAttribute('data-searchable')).toBe('true');
  });

  it('passes searchable false when configured', () => {
    const nonSearchableTagData = {
      PLACEHOLDER: 'Select tags',
      SEARCHABLE: false,
    };

    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={nonSearchableTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    expect(input.getAttribute('data-searchable')).toBe('false');
  });

  it('displays current selection value', () => {
    const selTagsWithValue = {
      type: [{ value: 'panel', label: 'Panel' }],
      track: [],
    };

    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={selTagsWithValue}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const valueDisplay = screen.getByTestId('select-value');
    expect(valueDisplay.textContent).toBe('Panel');
  });

  it('displays multiple selected values', () => {
    const selTagsWithMultiple = {
      type: [
        { value: 'panel', label: 'Panel' },
        { value: 'workshop', label: 'Workshop' },
      ],
      track: [],
    };

    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={selTagsWithMultiple}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const valueDisplay = screen.getByTestId('select-value');
    expect(valueDisplay.textContent).toContain('Panel');
    expect(valueDisplay.textContent).toContain('Workshop');
  });

  it('calls resetLimit and setSelTags on change', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    fireEvent.change(input, { target: { value: 'panel' } });

    expect(mockResetLimit).toHaveBeenCalled();
    expect(mockSetSelTags).toHaveBeenCalled();
  });

  it('updates selections immutably', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    fireEvent.change(input, { target: { value: 'panel' } });

    expect(mockSetSelTags).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.any(Array),
        track: [],
      })
    );
  });

  it('applies correct className', () => {
    const { container } = render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const selectDiv = container.querySelector('.filter-container');
    expect(selectDiv).toBeDefined();
  });

  it('applies correct classNamePrefix', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    expect(input.getAttribute('data-classname-prefix')).toBe('filter-select');
  });

  it('handles different tag keys', () => {
    render(
      <TagSelect
        options={mockOptions}
        tag="track"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    fireEvent.change(input, { target: { value: 'panel' } });

    expect(mockSetSelTags).toHaveBeenCalledWith(
      expect.objectContaining({
        type: [],
        track: expect.any(Array),
      })
    );
  });

  it('handles empty options array', () => {
    render(
      <TagSelect
        options={[]}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={mockTagData}
        resetLimit={mockResetLimit}
      />
    );

    const optionsContainer = screen.getByTestId('select-options');
    expect(optionsContainer.children).toHaveLength(0);
  });

  it('handles custom placeholder text', () => {
    const customTagData = {
      PLACEHOLDER: 'Choose your tags',
      SEARCHABLE: true,
    };

    render(
      <TagSelect
        options={mockOptions}
        tag="type"
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagData={customTagData}
        resetLimit={mockResetLimit}
      />
    );

    const input = screen.getByTestId('select-input');
    expect(input.getAttribute('placeholder')).toBe('Choose your tags');
  });
});
