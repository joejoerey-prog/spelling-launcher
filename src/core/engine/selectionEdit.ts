// Pure helpers for "highlight text, press a shortcut" edits (Suggest and Polish).
// Nothing here touches the document: it turns a selection and a candidate rewrite into
// reviewable pieces that the editor store applies through its single edit primitive.
import { DiffChange } from '../../types/diff';
import { computeWordDiff } from './diff';

export const MAX_SELECTION_CHARS = 2000;
const CONTEXT_RADIUS = 800;

export type Dialect = 'en_GB' | 'en_US';
export interface Span { start: number; end: number }
export interface Edit { start: number; end: number; text: string }

// ---------------------------------------------------------------- selection

export type ResolvedSelection =
  | { ok: true; start: number; end: number; text: string; paragraph: string }
  | { ok: false; message: string };

/** Fenced code blocks (``` or ~~~); an unclosed fence runs to the end of the document. */
function codeBlockRanges(raw: string): Span[] {
  const out: Span[] = [];
  const fence = /^[ \t]*(```|~~~)/gm;
  let open: { start: number; mark: string } | null = null;
  for (let m = fence.exec(raw); m; m = fence.exec(raw)) {
    if (!open) open = { start: m.index, mark: m[1] };
    else if (m[1] === open.mark) {
      out.push({ start: open.start, end: m.index + m[0].length });
      open = null;
    }
  }
  if (open) out.push({ start: open.start, end: raw.length });
  return out;
}

/**
 * Validates a highlighted range of `raw` and returns the range to edit: the selection without
 * leading or trailing whitespace, plus the paragraph around it for context.
 */
export function resolveSelection(raw: string, start: number, end: number): ResolvedSelection {
  let a = Math.max(0, Math.min(start, end));
  let b = Math.min(raw.length, Math.max(start, end));
  while (a < b && /\s/.test(raw[a])) a++;
  while (b > a && /\s/.test(raw[b - 1])) b--;
  if (a >= b) return { ok: false, message: 'Highlight some text first, then press the shortcut.' };
  if (b - a > MAX_SELECTION_CHARS) {
    return { ok: false, message: `Highlight a shorter passage (up to ${MAX_SELECTION_CHARS.toLocaleString('en-GB')} characters).` };
  }
  const text = raw.slice(a, b);
  if (/\n[ \t]*\n/.test(text)) return { ok: false, message: 'Highlight text from one paragraph at a time.' };
  if (codeBlockRanges(raw).some((c) => a < c.end && b > c.start)) {
    return { ok: false, message: 'The highlighted text includes code, which is never changed. Highlight ordinary text only.' };
  }

  let pStart = 0;
  let pEnd = raw.length;
  const gap = /\n[ \t]*\n/g;
  for (let m = gap.exec(raw); m; m = gap.exec(raw)) {
    if (m.index + m[0].length <= a) pStart = m.index + m[0].length;
    else if (m.index >= b) {
      pEnd = m.index;
      break;
    }
  }
  const paragraph = raw.slice(Math.max(pStart, a - CONTEXT_RADIUS), Math.min(pEnd, b + CONTEXT_RADIUS));
  return { ok: true, start: a, end: b, text, paragraph };
}

// ---------------------------------------------------------------- protected text

const MARKER = String.raw`(?:#{1,6}[ \t]+|[-*+][ \t]+|\d+[.)][ \t]+|>[ \t]?)`;
// Matches the same kinds of text as the native checker's SyntaxMasker, plus quotes and line structure.
const PROTECTED_PATTERNS: RegExp[] = [
  /`[^`\n]+`/g,
  /https?:\/\/[^\s)\]>]+/g,
  /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
  /\b(?:[a-z]+[A-Z][a-zA-Z0-9]*|[A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*|[a-zA-Z0-9]+_[a-zA-Z0-9_]+)\b/g,
  /"[^"\n]+"/g,
  /“[^”\n]+”/g,
  /‘[^‘’\n]+’/g,
  new RegExp(String.raw`\n[ \t]*${MARKER}?`, 'g'),
  new RegExp(`^${MARKER}`, 'g'),
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ranges of `text` that an edit must leave exactly as they are, merged and sorted. */
export function protectedSpans(text: string, terms: string[] = []): Span[] {
  const spans: Span[] = [];
  for (const re of PROTECTED_PATTERNS) {
    for (const m of text.matchAll(re)) spans.push({ start: m.index!, end: m.index! + m[0].length });
  }
  const alt = terms
    .map((t) => t.trim())
    .filter(Boolean)
    .sort((x, y) => y.length - x.length)
    .map(escapeRe)
    .join('|');
  if (alt) {
    // No lookbehind: older WebKit builds reject it.
    const termRe = new RegExp(`(^|[^\\p{L}\\p{N}_])(${alt})(?![\\p{L}\\p{N}_])`, 'giu');
    for (const m of text.matchAll(termRe)) {
      const start = m.index! + m[1].length;
      spans.push({ start, end: start + m[2].length });
    }
  }
  spans.sort((x, y) => x.start - y.start || y.end - x.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged;
}

const protectedStrings = (text: string, terms: string[]): string =>
  JSON.stringify(protectedSpans(text, terms).map((s) => text.slice(s.start, s.end)));

// ---------------------------------------------------------------- pieces

export type Piece = { kind: 'same'; text: string } | { kind: 'change'; id: number; from: string; to: string };

/**
 * Diffs `candidate` against `original` into reviewable pieces. A change that cuts into protected
 * text is reverted to the original wording. Returns null when nothing is left to change, or when
 * the candidate would still alter protected text (for example by moving it).
 */
export function buildPieces(original: string, candidate: string, terms: string[] = []): Piece[] | null {
  const spans = protectedSpans(original, terms);
  const pieces: Piece[] = [];
  let id = 0;
  let pos = 0;
  let cur: { from: string; to: string; start: number } | null = null;

  const flush = () => {
    if (!cur) return;
    const { from, to, start } = cur;
    const end = start + from.length;
    // A deletion or replacement may not overlap protected text; an insertion may not land inside it.
    const hitsProtected = spans.some((s) => (from ? start < s.end && end > s.start : start > s.start && start < s.end));
    pieces.push(hitsProtected ? { kind: 'same', text: from } : { kind: 'change', id: id++, from, to });
    cur = null;
  };

  const changes = computeWordDiff(original, candidate).changes;
  changes.forEach((c, i) => {
    if (c.op === 'equal' && cur && i + 1 < changes.length && /^\s+$/.test(c.value)) {
      // Whitespace between two edits belongs to one change ("figure out" -> "determine"), not two.
      cur.from += c.value;
      cur.to += c.value;
      pos += c.value.length;
      return;
    }
    if (c.op === 'equal') {
      flush();
      pieces.push({ kind: 'same', text: c.value });
      pos += c.value.length;
      return;
    }
    cur ??= { from: '', to: '', start: pos };
    if (c.op === 'delete') {
      cur.from += c.value;
      pos += c.value.length;
    } else {
      cur.to += c.value;
    }
  });
  flush();

  if (!pieces.some((p) => p.kind === 'change')) return null;
  if (protectedStrings(composePieces(pieces), terms) !== protectedStrings(original, terms)) return null;
  return pieces;
}

/** Text with the accepted changes applied; every change when `accepted` is omitted. */
export function composePieces(pieces: Piece[], accepted?: ReadonlySet<number>): string {
  return pieces.map((p) => (p.kind === 'same' ? p.text : !accepted || accepted.has(p.id) ? p.to : p.from)).join('');
}

export function piecesToDiff(pieces: Piece[]): DiffChange[] {
  const out: DiffChange[] = [];
  for (const p of pieces) {
    if (p.kind === 'same') out.push({ op: 'equal', value: p.text });
    else {
      if (p.from) out.push({ op: 'delete', value: p.from });
      if (p.to) out.push({ op: 'insert', value: p.to });
    }
  }
  return out;
}

// ---------------------------------------------------------------- shape and dialect

/** Keeps the selection's own opening capital and closing punctuation, so a fragment stays a fragment. */
export function matchShape(original: string, candidate: string): string {
  let out = candidate.trim();
  const first = original[0];
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
    const word = out.match(/^\p{L}[\p{L}'’-]*/u)?.[0] ?? '';
    const keepCapital = word === 'I' || /^I['’]/.test(word) || /^\p{Lu}{2,}$/u.test(word) || original.includes(word);
    if (word && !keepCapital) out = out[0].toLowerCase() + out.slice(1);
  }
  const closing = (s: string) => s.match(/[.!?…]+$/)?.[0] ?? '';
  const had = closing(original);
  const now = closing(out);
  if (!had && now) out = out.slice(0, -now.length).trimEnd();
  else if (had && !now) out += had;
  return out;
}

const ISE_STEMS = [
  'organ', 'recogn', 'real', 'summar', 'priorit', 'util', 'optim', 'minim', 'maxim', 'final', 'custom', 'standard',
  'emphas', 'apolog', 'critic', 'special', 'general', 'character', 'author', 'memor', 'central', 'normal', 'modern',
  'social', 'visual', 'global', 'familiar',
];
const OUR_STEMS = ['col', 'flav', 'hon', 'lab', 'arm', 'behavi', 'fav', 'neighb', 'rum', 'glam'];
const OUR_ENDINGS = ['', 's', 'ed', 'ing', 'ful', 'able', 'ite', 'ites', 'hood', 'al', 'ist', 'ists'];
const US_TO_GB = new Map<string, string>();
const GB_TO_US = new Map<string, string>();
const addPair = (gb: string, us: string, both = true) => {
  US_TO_GB.set(us, gb);
  if (both) GB_TO_US.set(gb, us);
};
for (const s of ISE_STEMS) for (const x of ['e', 'es', 'ed', 'ing', 'ation', 'ations']) addPair(`${s}is${x}`, `${s}iz${x}`);
for (const x of ['e', 'ed', 'ing']) addPair(`analys${x}`, `analyz${x}`);
addPair('analyses', 'analyzes', false); // "analyses" is also the plural noun, so never map it to US
for (const s of OUR_STEMS) for (const x of OUR_ENDINGS) addPair(`${s}our${x}`, `${s}or${x}`);
for (const [gb, us] of [
  ['centre', 'center'], ['centres', 'centers'], ['defence', 'defense'], ['grey', 'gray'],
  ['travelled', 'traveled'], ['travelling', 'traveling'], ['cancelled', 'canceled'], ['labelled', 'labeled'], ['modelled', 'modeled'],
]) addPair(gb, us);

/** Rewrites spellings the candidate introduced in the other dialect; words already in the original stay. */
export function conformDialect(candidate: string, original: string, dialect: Dialect): string {
  const map = dialect === 'en_GB' ? US_TO_GB : GB_TO_US;
  const known = new Set(original.toLowerCase().match(/\p{L}+/gu) ?? []);
  return candidate.replace(/\p{L}+/gu, (word) => {
    const lower = word.toLowerCase();
    const hit = map.get(lower);
    if (!hit || known.has(lower)) return word;
    if (word === word.toUpperCase() && word.length > 1) return hit.toUpperCase();
    return word[0] === word[0].toUpperCase() ? hit[0].toUpperCase() + hit.slice(1) : hit;
  });
}

// ---------------------------------------------------------------- candidates to options

export interface Candidate { label: string; description: string; text: string }

export interface SelectionOption {
  id: string;
  label: string;
  description: string;
  rewrittenText: string;
  diff: DiffChange[];
  isAiGenerated: boolean;
}

export const MAX_OPTIONS = 5;

/** Pieces for one candidate after dialect, shape and protection checks; null when nothing usable is left. */
export function finishCandidate(original: string, candidateText: string, dialect: Dialect, terms: string[]): Piece[] | null {
  return buildPieces(original, matchShape(original, conformDialect(candidateText, original, dialect)), terms);
}

/** Up to five distinct options. AI candidates keep the model's order; built-in ones rank smallest change first. */
export function buildOptions(
  original: string,
  candidates: Candidate[],
  opts: { dialect: Dialect; terms: string[]; isAi: boolean }
): SelectionOption[] {
  const seen = new Set([original]);
  const built: { option: SelectionOption; size: number }[] = [];
  for (const c of candidates) {
    const pieces = finishCandidate(original, c.text, opts.dialect, opts.terms);
    if (!pieces) continue;
    const text = composePieces(pieces);
    if (seen.has(text)) continue;
    seen.add(text);
    const size = pieces.reduce((n, p) => n + (p.kind === 'change' ? p.from.length + p.to.length : 0), 0);
    built.push({
      size,
      option: {
        id: `selection-${built.length}`,
        label: c.label,
        description: c.description,
        rewrittenText: text,
        diff: piecesToDiff(pieces),
        isAiGenerated: opts.isAi,
      },
    });
  }
  if (!opts.isAi) built.sort((x, y) => x.size - y.size);
  return built.slice(0, MAX_OPTIONS).map((b, i) => ({ ...b.option, id: `selection-${i}` }));
}

/** Applies non-overlapping edits (offsets relative to `text`) from the end backwards. */
export function applyRelativeEdits(text: string, edits: Edit[]): string {
  let out = text;
  let limit = Infinity;
  for (const e of [...edits].sort((x, y) => y.start - x.start)) {
    if (e.end > limit) continue; // overlaps a fix already applied
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    limit = e.start;
  }
  return out;
}
