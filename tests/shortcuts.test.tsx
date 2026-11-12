import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '../src/App';
import { ShortcutSettings } from '../src/components/modals/ShortcutSettings';
import { SettingsModal } from '../src/components/modals/SettingsModal';
import { editorStore } from '../src/core/state/editorStore';
import { settingsStore } from '../src/core/state/settingsStore';
import {
  DEFAULT_SHORTCUTS,
  ShortcutMap,
  actionForCombo,
  eventToCombo,
  findConflict,
  formatCombo,
  validateCombo,
} from '../src/core/shortcuts';

const key = (k: Partial<KeyboardEvent>) => ({ code: '', key: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...k });

afterEach(async () => {
  vi.restoreAllMocks();
  await act(() => settingsStore.update({ shortcuts: {} }));
});

describe('shortcut helpers', () => {
  it('builds combos from physical keys, ignores bare modifiers, and falls back to key', () => {
    expect(eventToCombo(key({ code: 'KeyS', key: 's', metaKey: true }))).toBe('Command+KeyS');
    // Option changes `key` to a symbol; the physical code still matches.
    expect(eventToCombo(key({ code: 'KeyS', key: 'ß', altKey: true, shiftKey: true }))).toBe('Alt+Shift+KeyS');
    expect(eventToCombo(key({ code: 'MetaLeft', key: 'Meta', metaKey: true }))).toBeNull();
    expect(eventToCombo(key({ key: 'z', metaKey: true }))).toBe('Command+KeyZ');
  });

  it('formats combos in macOS modifier order', () => {
    expect(formatCombo('Command+Shift+KeyZ')).toBe('⇧⌘Z');
    expect(formatCombo('Alt+Shift+Space')).toBe('⌥⇧Space');
    expect(formatCombo('Command+Comma')).toBe('⌘,');
    expect(formatCombo('')).toBe('None');
  });

  it('rejects reserved and modifier-less combos', () => {
    expect(validateCombo('KeyS')).toMatch(/modifier/);
    expect(validateCombo('Shift+KeyS')).toMatch(/Shift alone/);
    expect(validateCombo('Command+KeyQ')).toMatch(/reserved/);
    expect(validateCombo('Command+KeyC')).toMatch(/copies/);
    expect(validateCombo('Control+Alt+KeyK')).toBeNull();
  });

  it('finds conflicts and maps combos to in-app actions only', () => {
    expect(findConflict(DEFAULT_SHORTCUTS, 'Command+KeyS', 'open')).toBe('save');
    expect(findConflict(DEFAULT_SHORTCUTS, 'Command+KeyS', 'save')).toBeNull();
    expect(actionForCombo(DEFAULT_SHORTCUTS, 'Command+KeyY')).toBe('redo');
    expect(actionForCombo(DEFAULT_SHORTCUTS, DEFAULT_SHORTCUTS.summon)).toBeNull();
    expect(actionForCombo({ ...DEFAULT_SHORTCUTS, save: '' }, 'Command+KeyS')).toBeNull();
  });
});

describe('ShortcutSettings', () => {
  const setup = (value: ShortcutMap = { ...DEFAULT_SHORTCUTS }) => {
    const onChange = vi.fn();
    render(<ShortcutSettings value={value} onChange={onChange} />);
    const button = (label: string) => screen.getByRole('button', { name: new RegExp(`^Change shortcut for ${label}`) });
    return { onChange, button };
  };

  it('records a new combo', () => {
    const { onChange, button } = setup();
    fireEvent.click(button('Save'));
    expect(button('Save').textContent).toBe('Press keys…');
    fireEvent.keyDown(button('Save'), { code: 'MetaLeft', key: 'Meta', metaKey: true }); // still waiting
    fireEvent.keyDown(button('Save'), { code: 'KeyK', key: 'k', metaKey: true, shiftKey: true });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SHORTCUTS, save: 'Command+Shift+KeyK' });
  });

  it('refuses reserved combos, clears with Backspace and cancels with Escape', () => {
    const { onChange, button } = setup();
    fireEvent.click(button('Save'));
    fireEvent.keyDown(button('Save'), { code: 'KeyQ', key: 'q', metaKey: true });
    expect(screen.getByRole('alert').textContent).toMatch(/reserved/);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(button('Save'), { key: 'Escape', code: 'Escape' });
    expect(button('Save').textContent).toBe('⌘S');

    fireEvent.click(button('Save'));
    fireEvent.keyDown(button('Save'), { key: 'Backspace', code: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SHORTCUTS, save: '' });
  });

  it('offers to swap when the combo is already taken', () => {
    const { onChange, button } = setup();
    fireEvent.click(button('Open document'));
    fireEvent.keyDown(button('Open document'), { code: 'KeyS', key: 's', metaKey: true });
    expect(screen.getByRole('alert').textContent).toMatch(/already used by "Save"/);
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SHORTCUTS, open: 'Command+KeyS', save: 'Command+KeyO' });
  });
});

describe('configured shortcuts drive the app', () => {
  it('a remapped Save fires on the new keys and no longer on the old ones', async () => {
    const save = vi.spyOn(editorStore, 'saveCurrentDocument').mockResolvedValue();
    await act(() => settingsStore.update({ shortcuts: { save: 'Control+Alt+KeyS' } }));
    render(<App />);
    fireEvent.keyDown(document.body, { code: 'KeyS', key: 's', metaKey: true });
    expect(save).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { code: 'KeyS', key: 'ß', ctrlKey: true, altKey: true });
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle('Save Document (⌃⌥S)')).toBeTruthy();
  });

  it('a cleared shortcut does nothing, and default shortcuts open dialogs and toggle raw view', async () => {
    const undo = vi.spyOn(editorStore, 'undo');
    await act(() => settingsStore.update({ shortcuts: { undo: '' } }));
    render(<App />);
    fireEvent.keyDown(document.body, { code: 'KeyZ', key: 'z', metaKey: true });
    expect(undo).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { code: 'Comma', key: ',', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Application Settings' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.keyDown(document.body, { code: 'KeyR', key: 'r', metaKey: true, shiftKey: true });
    expect(document.querySelector('textarea')).toBeTruthy();
  });

  it('Settings saves only shortcuts that differ from the defaults', async () => {
    const update = vi.spyOn(settingsStore, 'update');
    render(<SettingsModal isOpen onClose={() => {}} />);
    const btn = screen.getByRole('button', { name: /^Change shortcut for Export/ });
    fireEvent.click(btn);
    fireEvent.keyDown(btn, { code: 'KeyE', key: 'e', metaKey: true, shiftKey: true });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Save Preferences/ })));
    expect(update.mock.calls.at(-1)?.[0].shortcuts).toEqual({ export: 'Command+Shift+KeyE' });
  });
});
