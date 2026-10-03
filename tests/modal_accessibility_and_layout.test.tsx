import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleManagerModal } from '../src/components/modals/RuleManagerModal';
import { SettingsModal } from '../src/components/modals/SettingsModal';
import { ExportModal } from '../src/components/modals/ExportModal';
import { ApplyAllModal } from '../src/components/modals/ApplyAllModal';

describe('Modal Accessibility and Layout Regression Suite', () => {
  it('renders explicit accessible name on header close button for RuleManagerModal', () => {
    const handleClose = vi.fn();
    render(<RuleManagerModal isOpen={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: 'Close modal' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders explicit accessible name on header close button for SettingsModal and ensures flex-shrink scrolling container', () => {
    const handleClose = vi.fn();
    const { container } = render(<SettingsModal isOpen={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: 'Close modal' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Verify content container has flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain('flex-1');
    expect(scrollContainer?.className).toContain('min-h-0');
    expect(scrollContainer?.className).toContain('overflow-y-auto');
    expect(scrollContainer?.className).toContain('px-6');
    expect(scrollContainer?.className).toContain('py-4');
    expect(scrollContainer?.className).toContain('space-y-6');
  });

  it('renders explicit accessible name on header close button for ExportModal', () => {
    const handleClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: 'Close modal' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders explicit accessible name on header close button for ApplyAllModal', () => {
    const handleClose = vi.fn();
    render(<ApplyAllModal isOpen={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: 'Close modal' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
