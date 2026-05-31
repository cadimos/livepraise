import { nextTick, onUnmounted, watch, type Ref } from 'vue';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

export interface DialogA11yOptions {
  onClose: () => void;
  canClose?: () => boolean;
  initialFocus?: () => HTMLElement | null | undefined;
}

export function useDialogA11y(
  open: Ref<boolean>,
  panelRef: Ref<HTMLElement | null>,
  options: DialogA11yOptions,
): void {
  let keyHandler: ((event: KeyboardEvent) => void) | null = null;

  function unbind(): void {
    if (!keyHandler) return;
    window.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  function bind(): void {
    unbind();
    keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (options.canClose?.() === false) return;
        event.preventDefault();
        options.onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.value;
      if (!panel) return;
      const items = focusableElements(panel);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  watch(open, async (isOpen) => {
    if (isOpen) {
      bind();
      await nextTick();
      const target = options.initialFocus?.() ?? focusableElements(panelRef.value!)[0];
      target?.focus();
    } else {
      unbind();
    }
  });

  onUnmounted(unbind);
}
