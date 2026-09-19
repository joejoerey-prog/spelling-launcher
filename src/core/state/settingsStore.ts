import { AppSettings } from '../../types/database';
import { TauriBridge } from '../bridge/tauriBridge';

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'local',
  ollamaBaseUrl: 'http://localhost:11434/v1',
  ollamaModel: 'llama3.2:3b',
  openaiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  autoCheckTypography: true,
  autoCheckRepetition: true,
  theme: 'dark',
  language: 'en_GB',
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

    // Validate language: strictly allow 'en_GB' or 'en_US', falling back to 'en_GB'
    if (!this.settings.language || !['en_GB', 'en_US'].includes(this.settings.language)) {
      this.settings.language = 'en_GB';
    }

    this.notify();
    return this.settings;
  }

  async update(partial: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    if (!this.settings.language || !['en_GB', 'en_US'].includes(this.settings.language)) {
      this.settings.language = 'en_GB';
    }
    try {
      await TauriBridge.setAppSetting('user_settings', JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
    this.notify();
  }
}

export const settingsStore = new SettingsStore();
