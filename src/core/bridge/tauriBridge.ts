import { DocumentInfo, IgnoredTerm, SettingsMigration, UserRule } from '../../types/database';
import { RewritePassageRequest, RewritePassageResponse, FileOperationResult } from '../../types/tauriBridgeTypes';

// Check if running inside desktop Tauri environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Default fallback mock state for web browser preview
const MOCK_STORAGE_PREFIX = 'wordcraft_local_';

const getMockItem = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setMockItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(MOCK_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in mock
  }
};

const DEFAULT_MOCK_RULES: UserRule[] = [
  { id: 1, name: 'Cliché: At the end of the day', pattern: '\\bAt the end of the day\\b', replacement: 'Ultimately', category: 'style', description: 'Simplify colloquial filler cliché', is_active: true },
  { id: 2, name: 'Jargon: Utilize', pattern: '\\butilize\\b', replacement: 'use', category: 'clarity', description: 'Replace pompous vocabulary with simpler alternative', is_active: true },
  { id: 3, name: 'Filler: In order to', pattern: '\\bin order to\\b', replacement: 'to', category: 'conciseness', description: 'Remove redundant prepositional phrase', is_active: true },
  { id: 4, name: 'Weak modifier: Very unique', pattern: '\\bvery unique\\b', replacement: 'unique', category: 'style', description: "Unique is absolute; does not need 'very'", is_active: true },
];

/**
 * Tauri Bridge API with automatic environment detection and graceful browser fallback
 */
export const TauriBridge = {
  async openDocumentDialog(): Promise<string | null> {
    if (isTauri()) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'Supported Documents',
            extensions: ['pdf', 'pages', 'docx', 'txt', 'md', 'markdown', 'rtf'],
          },
        ],
      });
      if (typeof selected === 'string') {
        return selected;
      }
      return null;
    }
    return null;
  },

  async readDocument(filePath: string): Promise<FileOperationResult> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<FileOperationResult>('read_document', { filePath });
    } else {
      // Browser fallback: mock reading
      const docs = getMockItem<Record<string, string>>('docs', {});
      const content = docs[filePath] || '# Welcome to WordCraft\n\nWordCraft is your private, local-first writing and rewriting assistant.\n\nIn order to improve this sentence, click on it and choose a rewrite.\n\nThe report was submitted by the team yesterday.\n\nThis is a very unique approach for the the user.';
      return {
        success: true,
        path: filePath,
        message: 'Loaded from local storage',
        content,
        word_count: content.split(/\s+/).filter(Boolean).length,
      };
    }
  },

  async saveDocument(filePath: string, content: string, createBackup: boolean = true): Promise<FileOperationResult> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<FileOperationResult>('save_document', { filePath, content, createBackup });
    } else {
      const docs = getMockItem<Record<string, string>>('docs', {});
      docs[filePath] = content;
      setMockItem('docs', docs);
      return {
        success: true,
        path: filePath,
        message: 'Saved to local workspace',
        word_count: content.split(/\s+/).filter(Boolean).length,
      };
    }
  },

  async exportDocument(filename: string, content: string, targetDir?: string): Promise<FileOperationResult> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<FileOperationResult>('export_document', { filename, content, targetDir });
    } else {
      // Trigger client-side file download in browser
      const blob = new Blob([content], { type: filename.endsWith('.md') ? 'text/markdown' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        path: filename,
        message: `Exported ${filename} successfully`,
      };
    }
  },

  async getRecentDocuments(limit: number = 20): Promise<DocumentInfo[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<DocumentInfo[]>('get_recent_documents', { limit });
    } else {
      return getMockItem<DocumentInfo[]>('recent_docs', [
        {
          id: 1,
          file_path: 'sample_essay.md',
          title: 'Sample Essay & Rewriting Guide',
          word_count: 52,
          last_modified: 'Just now',
          snippet: 'WordCraft is your private, local-first writing assistant...',
        },
      ]);
    }
  },

  async addRecentDocument(doc: DocumentInfo): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('add_recent_document', { doc });
    } else {
      const docs = getMockItem<DocumentInfo[]>('recent_docs', []);
      const existingIdx = docs.findIndex((d) => d.file_path === doc.file_path);
      if (existingIdx >= 0) {
        docs[existingIdx] = doc;
      } else {
        docs.unshift(doc);
      }
      setMockItem('recent_docs', docs.slice(0, 20));
    }
  },

  async getRules(): Promise<UserRule[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<UserRule[]>('get_rules');
    } else {
      return getMockItem<UserRule[]>('rules', DEFAULT_MOCK_RULES);
    }
  },

  async addRule(rule: UserRule): Promise<number> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<number>('add_rule', { rule });
    } else {
      const rules = getMockItem<UserRule[]>('rules', DEFAULT_MOCK_RULES);
      const newId = Date.now();
      rules.push({ ...rule, id: newId });
      setMockItem('rules', rules);
      return newId;
    }
  },

  async deleteRule(id: number): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('delete_rule', { id });
    } else {
      const rules = getMockItem<UserRule[]>('rules', DEFAULT_MOCK_RULES).filter((r) => r.id !== id);
      setMockItem('rules', rules);
    }
  },

  async toggleRule(id: number, active: boolean): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('toggle_rule', { id, active });
    } else {
      const rules = getMockItem<UserRule[]>('rules', DEFAULT_MOCK_RULES).map((r) =>
        r.id === id ? { ...r, is_active: active } : r
      );
      setMockItem('rules', rules);
    }
  },

  async getIgnored(): Promise<IgnoredTerm[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<IgnoredTerm[]>('get_ignored');
    } else {
      return getMockItem<IgnoredTerm[]>('ignored_terms', [
        { id: 1, term: 'kubernetes', created_at: '2026-09-02' },
        { id: 2, term: 'wordcraft', created_at: '2026-09-02' },
      ]);
    }
  },

  async addIgnored(term: string): Promise<number> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<number>('add_ignored', { term });
    } else {
      const terms = getMockItem<IgnoredTerm[]>('ignored_terms', []);
      const newId = Date.now();
      terms.push({ id: newId, term: term.toLowerCase(), created_at: new Date().toISOString() });
      setMockItem('ignored_terms', terms);
      return newId;
    }
  },

  async removeIgnored(id: number): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('remove_ignored', { id });
    } else {
      const terms = getMockItem<IgnoredTerm[]>('ignored_terms', []).filter((t) => t.id !== id);
      setMockItem('ignored_terms', terms);
    }
  },

  async getAppSetting(key: string): Promise<string | null> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<string | null>('get_app_setting', { key });
    } else {
      return localStorage.getItem(MOCK_STORAGE_PREFIX + 'setting_' + key);
    }
  },

  async setAppSetting(key: string, value: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('set_app_setting', { key, value });
    } else {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'setting_' + key, value);
    }
  },

  async getUnacknowledgedMigration(): Promise<SettingsMigration | null> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<SettingsMigration | null>('get_unacknowledged_migration');
    } else {
      const stored = localStorage.getItem(MOCK_STORAGE_PREFIX + 'unack_migration');
      return stored ? JSON.parse(stored) : null;
    }
  },

  async acknowledgeMigration(version: number): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('acknowledge_migration', { version });
    } else {
      localStorage.removeItem(MOCK_STORAGE_PREFIX + 'unack_migration');
    }
  },

  async rewritePassage(req: RewritePassageRequest): Promise<RewritePassageResponse> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<RewritePassageResponse>('rewrite_passage', { req });
    } else {
      // Browser preview API fallback or local simulation
      const baseOptions = [
        `${req.text.replace(/\s+/g, ' ')} (Polished for clarity)`,
        `In fact, ${req.text.toLowerCase().replace(/^[a-z]/, (c) => c.toUpperCase())}`,
        `To clarify, ${req.text}`,
        `Ultimately, ${req.text}`,
      ];
      return {
        variations: baseOptions,
        latency_ms: 120,
        provider: 'Browser-Local-Simulation',
      };
    }
  },

  async checkDocument(text: string, language?: string): Promise<any[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<any[]>('check_document', { text, language });
    }
    return [];
  },

  async checkParagraph(paragraphText: string, paragraphOffset: number, language?: string): Promise<any[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<any[]>('check_paragraph', { paragraphText, paragraphOffset, language });
    }
    return [];
  },

  async learnWord(word: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('learn_word', { word });
    }
  },

  async ignoreWord(word: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('ignore_word', { word });
    }
  },
};

// Extension for native document extraction
export async function parseDocumentViaRust(filename: string, bytes: Uint8Array): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('parse_document_bytes', {
      filename,
      bytes: Array.from(bytes),
    });
  }
  throw new Error('Not running inside Tauri desktop environment');
}
