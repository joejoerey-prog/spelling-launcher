export type DiffOp = 'insert' | 'delete' | 'equal';

export interface DiffChange {
  op: DiffOp;
  value: string;
}

export interface DiffResult {
  changes: DiffChange[];
  addedWordCount: number;
  removedWordCount: number;
  unchangedWordCount: number;
  similarityRatio: number;
}
