import { HTMLAttributes, useEffect, useId, useRef } from 'react';

/** Shared focus/keyboard behavior for the existing modal content and handlers. */
export function DialogFrame({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    const heading = node.querySelector('h1,h2,h3');
    if (heading) { heading.id ||= titleId; node.setAttribute('aria-labelledby', heading.id); }
    else node.setAttribute('aria-label', props['aria-label'] || 'Dialogo');
    const focusable = () => Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    (focusable()[0] || node).focus();
    const onKey = (event: KeyboardEvent) => {
      // Only the innermost mounted dialog handles the key.
      if (node.querySelector('[role="dialog"]')) return;
      if (event.key === 'Escape') {
        const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const close = buttons.find(b => b.hasAttribute('data-dialog-close')) || buttons.find(b => /^(annulla|chiudi)$/i.test(b.textContent?.trim() || '') || /^chiudi/i.test(b.getAttribute('aria-label') || ''));
        const iconOnly = buttons.filter(b => !b.textContent?.trim() && b.querySelector('.lucide-x'));
        const dismiss = close || (iconOnly.length === 1 ? iconOnly[0] : undefined);
        if (dismiss) { event.preventDefault(); event.stopPropagation(); dismiss.click(); }
      }
      if (event.key !== 'Tab') return;
      const list = focusable();
      if (!list.length) { event.preventDefault(); node.focus(); return; }
      const first = list[0], last = list[list.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => { node.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
  }, [titleId]);
  return <div {...props} style={{ zIndex: 1000, ...props.style }} ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>{children}</div>;
}
