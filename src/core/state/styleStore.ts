import { TauriBridge } from '../bridge/tauriBridge';

export interface StyleStoreState {
  learnedWords: string[];
  ruleRejections: Record<string, number>;
  suppressedRules: string[];
}

const DEFAULT_STATE: StyleStoreState = {
  learnedWords: [],
  ruleRejections: {},
  suppressedRules: [],
};

class StyleStore {
  private _state: StyleStoreState = { ...DEFAULT_STATE };
  private listeners: Set<() => void> = new Set();

  get state(): StyleStoreState {
    return this._state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async load(): Promise<void> {
    try {
      const raw = await TauriBridge.getAppSetting('user_style_store');
      if (raw) {
        const parsed = JSON.parse(raw);
        this._state = {
          learnedWords: parsed.learnedWords || [],
          ruleRejections: parsed.ruleRejections || {},
          suppressedRules: parsed.suppressedRules || [],
        };
      }
    } catch {
      // Use defaults
    }
    this.notify();
  }

  private async persist(): Promise<void> {
    try {
      await TauriBridge.setAppSetting('user_style_store', JSON.stringify(this._state));
    } catch {
      // Ignore
    }
  }

  /**
   * Records a user rejection (dismissal / ignore) of a rule.
   * After 3 rejections, the rule is automatically suppressed (feedback-driven style adaptation).
   */
  async recordRejection(ruleId: string): Promise<boolean> {
    const current = (this._state.ruleRejections[ruleId] || 0) + 1;
    this._state.ruleRejections[ruleId] = current;

    let newlySuppressed = false;
    if (current >= 3 && !this._state.suppressedRules.includes(ruleId)) {
      this._state.suppressedRules.push(ruleId);
      newlySuppressed = true;
    }

    this.notify();
    await this.persist();
    return newlySuppressed;
  }

  isRuleSuppressed(ruleId?: string): boolean {
    if (!ruleId) return false;
    return this._state.suppressedRules.includes(ruleId);
  }

  async unsuppressRule(ruleId: string): Promise<void> {
    delete this._state.ruleRejections[ruleId];
    this._state.suppressedRules = this._state.suppressedRules.filter((r) => r !== ruleId);
    this.notify();
    await this.persist();
  }

  async resetAllSuppressedRules(): Promise<void> {
    this._state.ruleRejections = {};
    this._state.suppressedRules = [];
    this.notify();
    await this.persist();
  }

  async addLearnedWord(word: string): Promise<void> {
    const trimmed = word.trim();
    if (!trimmed) return;
    if (!this._state.learnedWords.includes(trimmed)) {
      this._state.learnedWords.push(trimmed);
      this.notify();
      await this.persist();
    }
  }

  async removeLearnedWord(word: string): Promise<void> {
    this._state.learnedWords = this._state.learnedWords.filter((w) => w.toLowerCase() !== word.toLowerCase());
    this.notify();
    await this.persist();
  }
}

export const styleStore = new StyleStore();
