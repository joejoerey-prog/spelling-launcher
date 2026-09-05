import { DocumentInfo, IgnoredTerm, UserRule } from '../../types/database';
import { TauriBridge } from '../bridge/tauriBridge';

class RulesStore {
  private rules: UserRule[] = [];
  private ignoredTerms: Set<string> = new Set();
  private ignoredList: IgnoredTerm[] = [];
  private recentDocs: DocumentInfo[] = [];
  private listeners: Set<() => void> = new Set();

  get state() {
    return {
      rules: this.rules,
      ignoredTerms: this.ignoredTerms,
      ignoredList: this.ignoredList,
      recentDocs: this.recentDocs,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async fetchAll(): Promise<void> {
    try {
      const [rules, ignored, recent] = await Promise.all([
        TauriBridge.getRules(),
        TauriBridge.getIgnored(),
        TauriBridge.getRecentDocuments(20),
      ]);
      this.rules = rules || [];
      this.ignoredList = ignored || [];
      this.ignoredTerms = new Set((ignored || []).map((t) => t.term.toLowerCase()));
      this.recentDocs = recent || [];
    } catch (e) {
      console.warn('Failed to load rules & DB metadata', e);
    }
    this.notify();
  }

  async addRule(rule: Omit<UserRule, 'id'>): Promise<void> {
    const newId = await TauriBridge.addRule({ ...rule, is_active: true });
    this.rules.push({ ...rule, id: newId, is_active: true });
    this.notify();
  }

  async deleteRule(id: number): Promise<void> {
    await TauriBridge.deleteRule(id);
    this.rules = this.rules.filter((r) => r.id !== id);
    this.notify();
  }

  async toggleRule(id: number, active: boolean): Promise<void> {
    await TauriBridge.toggleRule(id, active);
    this.rules = this.rules.map((r) => (r.id === id ? { ...r, is_active: active } : r));
    this.notify();
  }

  async addIgnoredTerm(term: string): Promise<void> {
    const clean = term.trim().toLowerCase();
    if (!clean || this.ignoredTerms.has(clean)) return;
    const newId = await TauriBridge.addIgnored(clean);
    this.ignoredTerms.add(clean);
    this.ignoredList.push({ id: newId, term: clean, created_at: new Date().toISOString() });
    this.notify();
  }

  async removeIgnoredTerm(id: number, term: string): Promise<void> {
    await TauriBridge.removeIgnored(id);
    this.ignoredTerms.delete(term.toLowerCase());
    this.ignoredList = this.ignoredList.filter((i) => i.id !== id);
    this.notify();
  }

  async addRecentDoc(doc: DocumentInfo): Promise<void> {
    await TauriBridge.addRecentDocument(doc);
    const existing = this.recentDocs.findIndex((d) => d.file_path === doc.file_path);
    if (existing >= 0) {
      this.recentDocs[existing] = doc;
    } else {
      this.recentDocs.unshift(doc);
    }
    this.notify();
  }
}

export const rulesStore = new RulesStore();
