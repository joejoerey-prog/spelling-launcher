import { DiffChange } from './diff';

export type IssueCategory =
  | 'spelling'
  | 'grammar'
  | 'confusion'
  | 'wordiness'
  | 'style'
  | 'repetition'
  | 'length'
  | 'passive'
  | 'typography'
  | 'punctuation'
  | 'custom';

export interface DeterministicIssue {
  id: string;
  sentenceId: string;
  category: IssueCategory;
  title: string;
  description: string;
  severity: 'warning' | 'suggestion' | 'info';
  originalText: string;
  suggestedText?: string;
  matchStart?: number;
  matchEnd?: number;
}

export type RewriteTone = 'natural' | 'casual' | 'professional' | 'academic' | 'confident' | 'friendly' | 'direct';
export type RewriteLength = 'same' | 'shorten' | 'expand';
export type RewriteGoal = 'clarity' | 'fluency' | 'tone' | 'length' | 'concise' | 'active_voice';

export interface RewriteOption {
  id: string;
  sentenceId: string;
  category: RewriteGoal;
  tone?: RewriteTone;
  length?: RewriteLength;
  label: string;
  description: string;
  originalText: string;
  rewrittenText: string;
  diff: DiffChange[];
  confidence?: number;
  isAiGenerated?: boolean;
}

export interface RewriteRequestOptions {
  sentenceText: string;
  tone: RewriteTone;
  length: RewriteLength;
  goal: RewriteGoal;
  customPrompt?: string;
}
