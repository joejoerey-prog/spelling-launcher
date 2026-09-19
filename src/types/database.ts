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

export interface SettingsMigration {
  schema_version: number;
  schema_version_from: number;
  schema_version_to: number;
  prior_json_payload: string;
  applied_at: string;
  acknowledged_at: string | null;
}

export interface AppSettings {
  provider: 'ollama' | 'local' | 'openai' | 'anthropic';
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  autoCheckTypography: boolean;
  autoCheckRepetition: boolean;
  theme: 'dark' | 'light' | 'system';
  language?: 'en_GB' | 'en_US';
  maxSentenceLengthThreshold?: number;
  autoCheckPassive?: boolean;
}
