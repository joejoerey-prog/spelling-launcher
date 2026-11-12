// Keyboard shortcut definitions, matching and display.
// A combo is stored in Tauri accelerator form, e.g. "Command+Shift+KeyS", so the same string
// can be registered as a global hotkey. An empty string means the action has no shortcut.

export type ShortcutAction =
  | 'save'
  | 'open'
  | 'newDocument'
  | 'undo'
  | 'redo'
  | 'export'
  | 'applyAll'
  | 'generateRewrites'
  | 'toggleRaw'
  | 'openSettings'
  | 'summon';

export type ShortcutMap = Record<ShortcutAction, string>;

export const SHORTCUT_ACTIONS: { id: ShortcutAction; label: string; global?: boolean }[] = [
  { id: 'save', label: 'Save' },
  { id: 'open', label: 'Open document' },
  { id: 'newDocument', label: 'New document' },
  { id: 'undo', label: 'Undo' },
  { id: 'redo', label: 'Redo' },
  { id: 'export', label: 'Export' },
  { id: 'applyAll', label: 'Apply all safe fixes' },
  { id: 'generateRewrites', label: 'Generate rewrites for selected sentence' },
  { id: 'toggleRaw', label: 'Toggle raw text view' },
  { id: 'openSettings', label: 'Open settings' },
  { id: 'summon', label: 'Bring Spelling Launcher to front (system-wide)', global: true },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  save: 'Command+KeyS',
  open: 'Command+KeyO',
  newDocument: 'Command+KeyN',
  undo: 'Command+KeyZ',
  redo: 'Command+Shift+KeyZ',
  export: 'Command+KeyE',
  applyAll: 'Command+Shift+KeyA',
  generateRewrites: 'Command+KeyR',
  toggleRaw: 'Command+Shift+KeyR',
  openSettings: 'Command+Comma',
  summon: 'Alt+Shift+Space',
};

/** Combos macOS or text editing relies on; they cannot be assigned. */
const RESERVED: Record<string, string> = {
  'Command+KeyQ': 'quits the app',
  'Command+KeyW': 'closes the window',
  'Command+KeyH': 'hides the app',
  'Command+KeyM': 'minimises the window',
  'Command+KeyC': 'copies text',
  'Command+KeyV': 'pastes text',
  'Command+KeyX': 'cuts text',
  'Command+KeyA': 'selects all text',
  'Command+Tab': 'switches apps',
  'Command+Space': 'opens Spotlight',
};

const MODIFIER_CODES = new Set([
  'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'CapsLock', 'Fn',
]);
const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift', 'CapsLock', 'Fn', 'OS']);

export function effectiveShortcuts(overrides?: Partial<ShortcutMap>): ShortcutMap {
  return { ...DEFAULT_SHORTCUTS, ...(overrides || {}) };
}

/** Physical key code; falls back to deriving it from `key` when `code` is missing (synthetic events). */
function keyCode(e: Pick<KeyboardEvent, 'code' | 'key'>): string {
  if (e.code) return e.code;
  const k = e.key || '';
  if (/^[a-z]$/i.test(k)) return `Key${k.toUpperCase()}`;
  if (/^\d$/.test(k)) return `Digit${k}`;
  if (k === ' ') return 'Space';
  if (k === ',') return 'Comma';
  if (k === '.') return 'Period';
  return k;
}

/** Combo for a key event, or null for a bare modifier press. */
export function eventToCombo(e: Pick<KeyboardEvent, 'code' | 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): string | null {
  if (MODIFIER_CODES.has(e.code) || MODIFIER_KEYS.has(e.key)) return null;
  const code = keyCode(e);
  if (!code) return null;
  const mods: string[] = [];
  if (e.metaKey) mods.push('Command');
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  return [...mods, code].join('+');
}

const MOD_SYMBOLS: Record<string, string> = { Command: '⌘', Control: '⌃', Alt: '⌥', Shift: '⇧' };
const KEY_LABELS: Record<string, string> = {
  Space: 'Space', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'",
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Enter: '↩', Tab: '⇥',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: '⌫', Delete: '⌦',
};

/** Human-readable form, e.g. "⇧⌘S". Mac order: ⌃⌥⇧⌘. */
export function formatCombo(combo: string): string {
  if (!combo) return 'None';
  const parts = combo.split('+');
  const code = parts.pop() || '';
  const order = ['Control', 'Alt', 'Shift', 'Command'];
  const mods = order.filter((m) => parts.includes(m)).map((m) => MOD_SYMBOLS[m]).join('');
  const key = KEY_LABELS[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '');
  return mods + key;
}

/** Reason the combo cannot be used, or null when it is acceptable. */
export function validateCombo(combo: string): string | null {
  const parts = combo.split('+');
  if (parts.length < 2) return 'Use at least one modifier key (⌘, ⌃, ⌥ or ⇧).';
  if (parts.length === 2 && parts[0] === 'Shift') return 'Shift alone is not enough; add ⌘, ⌃ or ⌥.';
  const reason = RESERVED[combo];
  return reason ? `${formatCombo(combo)} is reserved: it ${reason}.` : null;
}

/** Action already using this combo, ignoring `except`. */
export function findConflict(map: ShortcutMap, combo: string, except: ShortcutAction): ShortcutAction | null {
  if (!combo) return null;
  for (const a of SHORTCUT_ACTIONS) {
    if (a.id !== except && map[a.id] === combo) return a.id;
  }
  return null;
}

/** In-app action bound to this combo (the global summon hotkey is handled by the OS, not here). */
export function actionForCombo(map: ShortcutMap, combo: string): ShortcutAction | null {
  for (const a of SHORTCUT_ACTIONS) {
    if (!a.global && map[a.id] && map[a.id] === combo) return a.id;
  }
  // ⌘Y stays a redo alias unless the user bound it to something else.
  if (combo === 'Command+KeyY') return 'redo';
  return null;
}

export const SHORTCUT_EVENT = 'sl-shortcut';

/** Actions owned by components outside App are triggered through this window event. */
export function emitShortcut(action: ShortcutAction): void {
  window.dispatchEvent(new CustomEvent(SHORTCUT_EVENT, { detail: action }));
}
