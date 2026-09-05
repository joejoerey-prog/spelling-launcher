import { DiffChange, DiffResult } from '../../types/diff';

/**
 * Tokenizes text into words and punctuation while preserving whitespace.
 */
function tokenizeWords(text: string): string[] {
  const tokens: string[] = [];
  const regex = /(\s+|[a-zA-Z0-9_\u00C0-\u024F]+|[^\s\w])/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }

  return tokens.length > 0 ? tokens : [text];
}

/**
 * Computes word-level diff between original and new text using Longest Common Subsequence (LCS).
 */
export function computeWordDiff(originalText: string, newText: string): DiffResult {
  const origTokens = tokenizeWords(originalText);
  const newTokens = tokenizeWords(newText);

  const m = origTokens.length;
  const n = newTokens.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to assemble diff changes
  const rawChanges: DiffChange[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === newTokens[j - 1]) {
      rawChanges.push({ op: 'equal', value: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawChanges.push({ op: 'insert', value: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawChanges.push({ op: 'delete', value: origTokens[i - 1] });
      i--;
    }
  }

  rawChanges.reverse();

  // Merge contiguous tokens with same operation
  const mergedChanges: DiffChange[] = [];
  for (const change of rawChanges) {
    const last = mergedChanges[mergedChanges.length - 1];
    if (last && last.op === change.op) {
      last.value += change.value;
    } else {
      mergedChanges.push({ ...change });
    }
  }

  let addedWordCount = 0;
  let removedWordCount = 0;
  let unchangedWordCount = 0;

  for (const c of mergedChanges) {
    const words = c.value.trim().split(/\s+/).filter(Boolean).length;
    if (c.op === 'insert') addedWordCount += words;
    else if (c.op === 'delete') removedWordCount += words;
    else unchangedWordCount += words;
  }

  const totalWords = unchangedWordCount + (addedWordCount + removedWordCount) / 2;
  const similarityRatio = totalWords > 0 ? Math.round((unchangedWordCount / totalWords) * 100) / 100 : 1;

  return {
    changes: mergedChanges,
    addedWordCount,
    removedWordCount,
    unchangedWordCount,
    similarityRatio,
  };
}
