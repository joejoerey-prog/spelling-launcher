export interface UserRule {
  id?: number;
  name: string;
  pattern: string;
  replacement: string;
  category: string;
  description: string;
  is_active: boolean;
}

export interface IgnoredTerm {
  id?: number;
  term: string;
  created_at: string;
}

export interface DocumentInfo {
  id?: number;
  file_path: string;
  title: string;
  word_count: number;
  last_modified: string;
  snippet: string;
}

export interface AppSettings {
  provider: 'ollama' | 'local' | 'openai' | 'anthropic';
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  maxSentenceLengthThreshold: number;
  autoCheckPassive: boolean;
  autoCheckTypography: boolean;
  autoCheckRepetition: boolean;
  theme: 'dark' | 'light' | 'system';
}
