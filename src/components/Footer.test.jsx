import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock config.json import - must be at top level with vi.mock
vi.mock('../config.json', () => ({
  default: {
    FOOTER: {
      SITE_NOTE_MARKDOWN: 'Test site note with **markdown**',
      COPYRIGHT_MARKDOWN: '© 2026 Test Convention',
      CONCLAR_NOTE_MARKDOWN: 'Guide powered by [ConClár](https://github.com/lostcarpark/conclar)'
    }
  }
}));

import Footer from './Footer';

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders footer element', () => {
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer.footer');
    expect(footer).toBeInTheDocument();
  });

  it('renders site note section', () => {
    const { container } = render(<Footer />);

    const siteNote = container.querySelector('.footer-site');
    expect(siteNote).toBeInTheDocument();
  });

  it('renders site note markdown content', () => {
    render(<Footer />);

    expect(screen.getByText('Test site note with **markdown**')).toBeInTheDocument();
  });

  it('renders copyright section', () => {
    const { container } = render(<Footer />);

    const copyright = container.querySelector('.footer-copyright');
    expect(copyright).toBeInTheDocument();
  });

  it('renders copyright markdown content', () => {
    render(<Footer />);

    expect(screen.getByText('© 2026 Test Convention')).toBeInTheDocument();
  });

  it('renders conclar note section', () => {
    const { container } = render(<Footer />);

    const conclarNote = container.querySelector('.footer-conclar');
    expect(conclarNote).toBeInTheDocument();
  });

  it('renders conclar note markdown content', () => {
    render(<Footer />);

    expect(screen.getByText('Guide powered by [ConClár](https://github.com/lostcarpark/conclar)')).toBeInTheDocument();
  });

  it('renders all three ReactMarkdown components', () => {
    render(<Footer />);

    const markdownComponents = screen.getAllByTestId('markdown');
    expect(markdownComponents).toHaveLength(3);
  });

  it('has correct structure hierarchy', () => {
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer.footer');
    const siteNote = footer.querySelector('.footer-site');
    const copyright = footer.querySelector('.footer-copyright');
    const conclarNote = footer.querySelector('.footer-conclar');

    expect(footer).toBeInTheDocument();
    expect(siteNote).toBeInTheDocument();
    expect(copyright).toBeInTheDocument();
    expect(conclarNote).toBeInTheDocument();
  });
});
