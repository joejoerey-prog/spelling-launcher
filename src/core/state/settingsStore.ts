import { AppSettings } from '../../types/database';
import { TauriBridge } from '../bridge/tauriBridge';

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434/v1',
  ollamaModel: 'qwen2.5vl:latest',
  openaiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  maxSentenceLengthThreshold: 25,
  autoCheckPassive: true,
  autoCheckTypography: true,
  autoCheckRepetition: true,
  theme: 'dark',
};

class SettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<() => void> = new Set();

  get state(): AppSettings {
    return this.settings;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async load(): Promise<AppSettings> {
    try {
      const stored = await TauriBridge.getAppSetting('user_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Keep defaults
    }
    this.notify();
    return this.settings;
  }

  async update(partial: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    try {
      await TauriBridge.setAppSetting('user_settings', JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
    this.notify();
  }
}

export const settingsStore = new SettingsStore();
