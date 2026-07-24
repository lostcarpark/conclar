import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TagSelectors from './TagSelectors';

// Mock TagSelect component
vi.mock('./TagSelect', () => ({
  default: ({ options, tag, selTags, setSelTags, tagData, resetLimit }) => (
    <div data-testid={`tag-select-${tag}`}>
      <span data-testid="tag-data">{JSON.stringify(tagData)}</span>
      <span data-testid="options">{JSON.stringify(options)}</span>
    </div>
  ),
}));

describe('TagSelectors', () => {
  const mockSetSelTags = vi.fn();
  const mockResetLimit = vi.fn();

  const mockTags = {
    type: [
      { value: 'panel', label: 'Panel' },
      { value: 'workshop', label: 'Workshop' },
    ],
    track: [
      { value: 'science', label: 'Science' },
      { value: 'gaming', label: 'Gaming' },
    ],
  };

  const mockSelTags = {
    type: [],
    track: [],
  };

  const mockTagConfig = {
    DAY_TAG: {
      GENERATE: true,
      DAYS: {
        '1': 'Monday',
        '2': 'Tuesday',
        '3': 'Wednesday',
        '4': 'Thursday',
        '5': 'Friday',
      },
      PLACEHOLDER: 'Select days',
      SEARCHABLE: true,
      HIDE: false,
    },
    SEPARATE: [
      {
        PREFIX: 'type',
        PLACEHOLDER: 'Select types',
        SEARCHABLE: true,
        HIDE: false,
      },
      {
        PREFIX: 'track',
        PLACEHOLDER: 'Select tracks',
        SEARCHABLE: false,
        HIDE: false,
      },
    ],
    DEFAULT_PLACEHOLDER: 'Select options',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TagSelect for each non-empty tag', () => {
    render(
      <TagSelectors
        tags={mockTags}
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    expect(screen.getByTestId('tag-select-type')).toBeDefined();
    expect(screen.getByTestId('tag-select-track')).toBeDefined();
  });

  it('does not render TagSelect for empty tag arrays', () => {
    const tagsWithEmpty = {
      type: [{ value: 'panel', label: 'Panel' }],
      track: [],
    };

    render(
      <TagSelectors
        tags={tagsWithEmpty}
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    expect(screen.getByTestId('tag-select-type')).toBeDefined();
    expect(screen.queryByTestId('tag-select-track')).toBeNull();
  });

  it('does not render TagSelect for hidden tags', () => {
    const configWithHidden = {
      ...mockTagConfig,
      SEPARATE: [
        {
          PREFIX: 'type',
          PLACEHOLDER: 'Select types',
          SEARCHABLE: true,
          HIDE: true,
        },
      ],
    };

    render(
      <TagSelectors
        tags={mockTags}
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagConfig={configWithHidden}
        resetLimit={mockResetLimit}
      />
    );

    expect(screen.queryByTestId('tag-select-type')).toBeNull();
  });

  it('finds tag data from SEPARATE config', () => {
    render(
      <TagSelectors
        tags={mockTags}
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    const typeTagSelect = screen.getByTestId('tag-select-type');
    const tagData = JSON.parse(
      typeTagSelect.querySelector('[data-testid="tag-data"]').textContent
    );

    expect(tagData.PREFIX).toBe('type');
    expect(tagData.PLACEHOLDER).toBe('Select types');
    expect(tagData.SEARCHABLE).toBe(true);
  });

  it('handles DAY_TAG when GENERATE is true', () => {
    const tagsWithDays = {
      days: [{ value: '1', label: 'Monday' }],
    };

    render(
      <TagSelectors
        tags={tagsWithDays}
        selTags={{ days: [] }}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    expect(screen.getByTestId('tag-select-days')).toBeDefined();
  });

  it('does not use DAY_TAG when GENERATE is false', () => {
    const configWithoutDayGenerate = {
      ...mockTagConfig,
      DAY_TAG: {
        ...mockTagConfig.DAY_TAG,
        GENERATE: false,
      },
    };

    const tagsWithDays = {
      days: [{ value: '1', label: 'Monday' }],
    };

    render(
      <TagSelectors
        tags={tagsWithDays}
        selTags={{ days: [] }}
        setSelTags={mockSetSelTags}
        tagConfig={configWithoutDayGenerate}
        resetLimit={mockResetLimit}
      />
    );

    const daysTagSelect = screen.getByTestId('tag-select-days');
    const tagData = JSON.parse(
      daysTagSelect.querySelector('[data-testid="tag-data"]').textContent
    );

    // Should fall back to default config, not DAY_TAG
    expect(tagData.DAYS).toBeUndefined();
  });

  it('returns default tagConfig when tag is not found', () => {
    const tagsWithUnknown = {
      unknown: [{ value: 'test', label: 'Test' }],
    };

    render(
      <TagSelectors
        tags={tagsWithUnknown}
        selTags={{ unknown: [] }}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    const unknownTagSelect = screen.getByTestId('tag-select-unknown');
    const tagData = JSON.parse(
      unknownTagSelect.querySelector('[data-testid="tag-data"]').textContent
    );

    expect(tagData.DEFAULT_PLACEHOLDER).toBe('Select options');
  });

  it('applies correct CSS class to tag containers', () => {
    const { container } = render(
      <TagSelectors
        tags={mockTags}
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    const typeDiv = container.querySelector('.filter-tags-type');
    const trackDiv = container.querySelector('.filter-tags-track');

    expect(typeDiv).toBeDefined();
    expect(trackDiv).toBeDefined();
  });

  it('passes all required props to TagSelect', () => {
    render(
      <TagSelectors
        tags={mockTags}
        selTags={mockSelTags}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    const typeTagSelect = screen.getByTestId('tag-select-type');
    const options = JSON.parse(
      typeTagSelect.querySelector('[data-testid="options"]').textContent
    );

    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('panel');
    expect(options[1].value).toBe('workshop');
  });

  it('handles empty tags object', () => {
    const { container } = render(
      <TagSelectors
        tags={{}}
        selTags={{}}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    const tagSelects = container.querySelectorAll('[data-testid^="tag-select-"]');
    expect(tagSelects).toHaveLength(0);
  });

  it('preserves original DAY_TAG structure while translating', () => {
    const tagsWithDays = {
      days: [{ value: '1', label: 'Monday' }],
    };

    render(
      <TagSelectors
        tags={tagsWithDays}
        selTags={{ days: [] }}
        setSelTags={mockSetSelTags}
        tagConfig={mockTagConfig}
        resetLimit={mockResetLimit}
      />
    );

    const daysTagSelect = screen.getByTestId('tag-select-days');
    const tagData = JSON.parse(
      daysTagSelect.querySelector('[data-testid="tag-data"]').textContent
    );

    expect(tagData.GENERATE).toBe(true);
    expect(tagData.PLACEHOLDER).toBe('Select days');
    expect(tagData.SEARCHABLE).toBe(true);
    expect(tagData.DAYS).toBeDefined();
  });
});
