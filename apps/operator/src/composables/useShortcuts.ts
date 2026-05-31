import { computed, ref, watch } from 'vue';
import {
  comboFromKeyboardEvent,
  eventMatchesCombo,
  findShortcutConflict,
  formatComboLabel,
  resolveShortcuts,
  validateOverrides,
  type ResolvedShortcut,
  type ShortcutCombo,
  type ShortcutId,
  type ShortcutOverrides,
} from '@shared/shortcuts';

const STORAGE_KEY = 'livepraise.operator.shortcuts';

function loadOverrides(): ShortcutOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ShortcutOverrides;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const overrides = ref<ShortcutOverrides>(loadOverrides());
const listeningId = ref<ShortcutId | null>(null);
const feedback = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

const shortcuts = computed(() => resolveShortcuts(overrides.value));
const isCapturing = computed(() => listeningId.value !== null);

watch(
  overrides,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true },
);

function setFeedback(type: 'success' | 'error' | 'info', message: string): void {
  feedback.value = { type, message };
}

function clearFeedback(): void {
  feedback.value = null;
}

function persistOverrides(next: ShortcutOverrides, successMessage?: string): boolean {
  const validation = validateOverrides(next);
  if (!validation.ok) {
    setFeedback('error', validation.message);
    return false;
  }
  overrides.value = { ...validation.overrides };
  if (successMessage) setFeedback('success', successMessage);
  return true;
}

export function useShortcuts() {
  function matches(event: KeyboardEvent, id: ShortcutId): boolean {
    const item = shortcuts.value.find((s) => s.id === id);
    return eventMatchesCombo(event, item?.combo ?? null);
  }

  function comboLabel(id: ShortcutId): string {
    const item = shortcuts.value.find((s) => s.id === id);
    return formatComboLabel(item?.combo ?? null);
  }

  function startListening(id: ShortcutId): void {
    listeningId.value = id;
    setFeedback('info', 'Pressione a nova combinação ou Esc para cancelar.');
  }

  function stopListening(): void {
    listeningId.value = null;
  }

  function captureCombo(id: ShortcutId, combo: ShortcutCombo): void {
    const conflict = findShortcutConflict(shortcuts.value, id, combo);
    if (conflict) {
      setFeedback(
        'error',
        `Conflito com outro atalho (${formatComboLabel(combo)}). Escolha outra combinação.`,
      );
      return;
    }
    const next = { ...overrides.value, [id]: combo };
    if (persistOverrides(next, 'Atalho atualizado.')) {
      stopListening();
    }
  }

  function handleCaptureKeydown(event: KeyboardEvent): boolean {
    if (!listeningId.value) return false;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      stopListening();
      setFeedback('info', 'Redefinição cancelada.');
      return true;
    }
    const combo = comboFromKeyboardEvent(event);
    if (!combo) return true;
    captureCombo(listeningId.value, combo);
    return true;
  }

  function clearShortcut(id: ShortcutId): void {
    persistOverrides({ ...overrides.value, [id]: null }, 'Atalho removido.');
  }

  function resetShortcut(id: ShortcutId): void {
    const next = { ...overrides.value };
    delete next[id];
    persistOverrides(next, 'Atalho restaurado para o padrão.');
  }

  function resetAll(): void {
    overrides.value = {};
    stopListening();
    setFeedback('success', 'Todos os atalhos foram restaurados.');
  }

  function shouldIgnoreGlobalShortcuts(): boolean {
    return isCapturing.value;
  }

  return {
    shortcuts,
    listeningId,
    isCapturing,
    feedback,
    matches,
    comboLabel,
    startListening,
    stopListening,
    handleCaptureKeydown,
    clearShortcut,
    resetShortcut,
    resetAll,
    clearFeedback,
    shouldIgnoreGlobalShortcuts,
  };
}

export type { ResolvedShortcut, ShortcutId };
