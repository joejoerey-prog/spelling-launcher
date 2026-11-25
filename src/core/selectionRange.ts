// Maps the text the user has highlighted to offsets into the document's raw text.
// Sentence view marks each sentence's text with data-sl-text and data-doc-start; raw view is a textarea.

export interface SelectionOffsets { start: number; end: number }

/** Characters of `root`'s text before the point (node, offset). */
function textBefore(root: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

/**
 * The current highlight as raw-text offsets, or null when nothing in the document is highlighted.
 * A highlight that runs across sentences spans from its first sentence's text to its last one's;
 * the editor store refuses it if that range holds a paragraph break or code.
 */
export function readDocumentSelection(): SelectionOffsets | null {
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement && active.hasAttribute('data-sl-editor')) {
    return active.selectionStart === active.selectionEnd ? null : { start: active.selectionStart, end: active.selectionEnd };
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-sl-text]')).filter((el) => range.intersectsNode(el));
  if (roots.length === 0) return null;

  const first = roots[0];
  const last = roots[roots.length - 1];
  const start = Number(first.dataset.docStart) + (first.contains(range.startContainer) ? textBefore(first, range.startContainer, range.startOffset) : 0);
  const end = Number(last.dataset.docStart) + (last.contains(range.endContainer) ? textBefore(last, range.endContainer, range.endOffset) : (last.textContent ?? '').length);
  return Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null;
}
