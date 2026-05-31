export type ShortcutId =
  | 'about'
  | 'verse_prev'
  | 'verse_next'
  | 'stanza_prev'
  | 'stanza_next'
  | 'clear_screen'
  | 'freeze_toggle'
  | 'reload_data';

export interface ShortcutCombo {
  key: string;
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export interface ShortcutDefinition {
  id: ShortcutId;
  labelKey: string;
  contextKey: string;
  defaultCombo: ShortcutCombo | null;
}

export interface ResolvedShortcut extends ShortcutDefinition {
  combo: ShortcutCombo | null;
}

export type ShortcutOverrides = Partial<Record<ShortcutId, ShortcutCombo | null>>;

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'about',
    labelKey: 'settings.shortcuts.actions.about',
    contextKey: 'settings.shortcuts.context.global',
    defaultCombo: { key: 'F1', code: 'F1', ctrl: false, alt: false, shift: false },
  },
  {
    id: 'verse_prev',
    labelKey: 'settings.shortcuts.actions.versePrev',
    contextKey: 'settings.shortcuts.context.bible',
    defaultCombo: { key: 'ArrowUp', code: 'ArrowUp', ctrl: false, alt: false, shift: false },
  },
  {
    id: 'verse_next',
    labelKey: 'settings.shortcuts.actions.verseNext',
    contextKey: 'settings.shortcuts.context.bible',
    defaultCombo: { key: 'ArrowDown', code: 'ArrowDown', ctrl: false, alt: false, shift: false },
  },
  {
    id: 'stanza_prev',
    labelKey: 'settings.shortcuts.actions.stanzaPrev',
    contextKey: 'settings.shortcuts.context.worship',
    defaultCombo: { key: 'ArrowLeft', code: 'ArrowLeft', ctrl: false, alt: false, shift: false },
  },
  {
    id: 'stanza_next',
    labelKey: 'settings.shortcuts.actions.stanzaNext',
    contextKey: 'settings.shortcuts.context.worship',
    defaultCombo: { key: 'ArrowRight', code: 'ArrowRight', ctrl: false, alt: false, shift: false },
  },
  {
    id: 'clear_screen',
    labelKey: 'settings.shortcuts.actions.clearScreen',
    contextKey: 'settings.shortcuts.context.operator',
    defaultCombo: null,
  },
  {
    id: 'freeze_toggle',
    labelKey: 'settings.shortcuts.actions.freezeToggle',
    contextKey: 'settings.shortcuts.context.operator',
    defaultCombo: { key: 'Pause', code: 'Pause', ctrl: false, alt: false, shift: false },
  },
  {
    id: 'reload_data',
    labelKey: 'settings.shortcuts.actions.reloadData',
    contextKey: 'settings.shortcuts.context.operator',
    defaultCombo: { key: 'F5', code: 'F5', ctrl: false, alt: false, shift: false },
  },
];

function cloneCombo(combo: ShortcutCombo | null): ShortcutCombo | null {
  if (!combo) return null;
  return { ...combo };
}

export function resolveShortcuts(overrides: ShortcutOverrides = {}): ResolvedShortcut[] {
  return SHORTCUT_DEFINITIONS.map((definition) => {
    const override = overrides[definition.id];
    const combo =
      override === null
        ? null
        : cloneCombo(override ?? definition.defaultCombo);
    return { ...definition, combo };
  });
}

export function combosEqual(a: ShortcutCombo | null, b: ShortcutCombo | null): boolean {
  if (!a || !b) return false;
  return (
    a.code === b.code
    && a.ctrl === b.ctrl
    && a.alt === b.alt
    && a.shift === b.shift
  );
}

export interface KeyboardLikeEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function eventMatchesCombo(
  event: KeyboardLikeEvent,
  combo: ShortcutCombo | null,
): boolean {
  if (!combo) return false;
  const keyMatch = event.code === combo.code || event.key === combo.key;
  return (
    keyMatch
    && event.ctrlKey === combo.ctrl
    && event.altKey === combo.alt
    && event.shiftKey === combo.shift
  );
}

export function comboFromKeyboardEvent(event: KeyboardLikeEvent): ShortcutCombo | null {
  if (event.key === 'Escape') return null;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return null;
  return {
    key: event.key,
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

export function formatComboLabel(combo: ShortcutCombo | null): string {
  if (!combo) return '—';
  const parts: string[] = [];
  if (combo.ctrl) parts.push('Ctrl');
  if (combo.alt) parts.push('Alt');
  if (combo.shift) parts.push('Shift');
  if (combo.key === ' ') parts.push('Espaço');
  else parts.push(combo.key);
  return parts.join('+');
}

export function findShortcutConflict(
  shortcuts: ResolvedShortcut[],
  shortcutId: ShortcutId,
  combo: ShortcutCombo,
): ResolvedShortcut | null {
  return (
    shortcuts.find(
      (item) =>
        item.id !== shortcutId
        && item.combo
        && combosEqual(item.combo, combo),
    ) ?? null
  );
}

export function validateOverrides(
  overrides: ShortcutOverrides,
): { ok: true; overrides: ShortcutOverrides } | { ok: false; message: string } {
  const resolved = resolveShortcuts(overrides);
  for (const item of resolved) {
    if (!item.combo) continue;
    const conflict = findShortcutConflict(resolved, item.id, item.combo);
    if (conflict) {
      return {
        ok: false,
        message: `Conflito entre atalhos (${formatComboLabel(item.combo)}).`,
      };
    }
  }
  return { ok: true, overrides };
}
