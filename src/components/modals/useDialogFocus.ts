import { useEffect, useRef } from 'react';

/** Moves focus into a dialog when it opens and returns it to the previously focused element on close. */
export function useDialogFocus(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, [isOpen]);
  return ref;
}
