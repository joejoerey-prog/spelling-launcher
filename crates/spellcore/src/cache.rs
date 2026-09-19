use crate::types::{CheckMode, Issue};
use std::collections::{HashMap, VecDeque};
use std::hash::{DefaultHasher, Hash, Hasher};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;

pub const DEFAULT_MAX_ENTRIES: usize = 500;
pub const DEFAULT_MAX_BYTES: usize = 8 * 1024 * 1024; // 8 MB hard limit

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CacheKey {
    pub text_hash: u64,
    pub language: String,
    pub mode: CheckMode,
    pub dict_revision: u64,
}

impl CacheKey {
    pub fn new(text: &str, language: &str, mode: CheckMode, dict_revision: u64) -> Self {
        let mut hasher = DefaultHasher::new();
        text.hash(&mut hasher);
        Self {
            text_hash: hasher.finish(),
            language: language.to_string(),
            mode,
            dict_revision,
        }
    }
}

pub struct CacheEntry {
    pub key: CacheKey,
    pub issues: Vec<Issue>,
    pub size_bytes: usize,
}

impl CacheEntry {
    pub fn new(key: CacheKey, issues: Vec<Issue>) -> Self {
        let mut size = std::mem::size_of::<Self>() + key.language.capacity();
        for iss in &issues {
            size += std::mem::size_of::<Issue>();
            size += iss.id.capacity();
            size += iss.rule_id.capacity();
            size += iss.message.capacity();
            size += iss.matched_text.capacity();
            if let Some(r) = &iss.replacement {
                size += r.capacity();
            }
            for s in &iss.suggestions {
                size += s.capacity();
            }
        }
        Self {
            key,
            issues,
            size_bytes: size,
        }
    }
}

pub struct ParagraphCache {
    max_entries: usize,
    max_bytes: usize,
    current_bytes: usize,
    order: VecDeque<CacheKey>,
    entries: HashMap<CacheKey, CacheEntry>,
}

impl ParagraphCache {
    pub fn new(max_entries: usize, max_bytes: usize) -> Self {
        Self {
            max_entries,
            max_bytes,
            current_bytes: 0,
            order: VecDeque::new(),
            entries: HashMap::new(),
        }
    }

    pub fn get(&mut self, key: &CacheKey) -> Option<Vec<Issue>> {
        if self.entries.contains_key(key) {
            // Move to back (most recently used)
            if let Some(pos) = self.order.iter().position(|k| k == key) {
                self.order.remove(pos);
                self.order.push_back(key.clone());
            }
            return self.entries.get(key).map(|e| e.issues.clone());
        }
        None
    }

    pub fn insert(&mut self, key: CacheKey, issues: Vec<Issue>) {
        if self.entries.contains_key(&key) {
            return;
        }

        let entry = CacheEntry::new(key.clone(), issues);
        let entry_size = entry.size_bytes;

        // Evict until both entry count and memory bounds are satisfied
        while (self.entries.len() >= self.max_entries || self.current_bytes + entry_size > self.max_bytes)
            && !self.order.is_empty()
        {
            if let Some(oldest_key) = self.order.pop_front() {
                if let Some(removed) = self.entries.remove(&oldest_key) {
                    self.current_bytes = self.current_bytes.saturating_sub(removed.size_bytes);
                }
            }
        }

        self.current_bytes += entry_size;
        self.order.push_back(key.clone());
        self.entries.insert(key, entry);
    }

    pub fn clear(&mut self) {
        self.entries.clear();
        self.order.clear();
        self.current_bytes = 0;
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn current_bytes(&self) -> usize {
        self.current_bytes
    }
}

pub struct SharedCache {
    revision: AtomicU64,
    cache: RwLock<ParagraphCache>,
}

impl SharedCache {
    pub fn new() -> Self {
        Self::with_limits(DEFAULT_MAX_ENTRIES, DEFAULT_MAX_BYTES)
    }

    pub fn with_limits(max_entries: usize, max_bytes: usize) -> Self {
        Self {
            revision: AtomicU64::new(1),
            cache: RwLock::new(ParagraphCache::new(max_entries, max_bytes)),
        }
    }

    pub fn current_revision(&self) -> u64 {
        self.revision.load(Ordering::SeqCst)
    }

    pub fn bump_revision(&self) -> u64 {
        let new_rev = self.revision.fetch_add(1, Ordering::SeqCst) + 1;
        if let Ok(mut c) = self.cache.write() {
            c.clear();
        }
        new_rev
    }

    pub fn get(&self, text: &str, language: &str, mode: CheckMode) -> Option<Vec<Issue>> {
        let rev = self.current_revision();
        let key = CacheKey::new(text, language, mode, rev);
        if let Ok(mut c) = self.cache.write() {
            c.get(&key)
        } else {
            None
        }
    }

    pub fn insert(&self, text: &str, language: &str, mode: CheckMode, issues: Vec<Issue>) {
        let rev = self.current_revision();
        let key = CacheKey::new(text, language, mode, rev);
        if let Ok(mut c) = self.cache.write() {
            c.insert(key, issues);
        }
    }

    pub fn len(&self) -> usize {
        self.cache.read().map(|c| c.len()).unwrap_or(0)
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn current_bytes(&self) -> usize {
        self.cache.read().map(|c| c.current_bytes()).unwrap_or(0)
    }
}

impl Default for SharedCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_hit_and_eviction() {
        let cache = SharedCache::with_limits(2, 1024 * 1024);
        assert_eq!(cache.len(), 0);

        cache.insert("Hello world", "en_GB", CheckMode::Document, vec![]);
        assert_eq!(cache.len(), 1);
        assert!(cache.get("Hello world", "en_GB", CheckMode::Document).is_some());

        cache.insert("Second paragraph", "en_GB", CheckMode::Document, vec![]);
        assert_eq!(cache.len(), 2);

        // Third entry triggers eviction of oldest
        cache.insert("Third paragraph", "en_GB", CheckMode::Document, vec![]);
        assert_eq!(cache.len(), 2);
        assert!(cache.get("Hello world", "en_GB", CheckMode::Document).is_none());
        assert!(cache.get("Second paragraph", "en_GB", CheckMode::Document).is_some());
        assert!(cache.get("Third paragraph", "en_GB", CheckMode::Document).is_some());
    }

    #[test]
    fn test_cache_memory_cap_bound() {
        // Max 500 entries or 1000 bytes
        let cache = SharedCache::with_limits(500, 1000);
        for i in 0..50 {
            let text = format!("Paragraph {} with extra text to consume memory", i);
            cache.insert(&text, "en_GB", CheckMode::Document, vec![]);
            assert!(cache.current_bytes() <= 1000, "Cache memory must not exceed 1000 bytes (got {})", cache.current_bytes());
        }
    }

    #[test]
    fn test_dictionary_revision_invalidation() {
        let cache = SharedCache::new();
        cache.insert("CustomWord test", "en_GB", CheckMode::Document, vec![]);
        assert!(cache.get("CustomWord test", "en_GB", CheckMode::Document).is_some());

        // Bump revision (e.g. user learned word)
        cache.bump_revision();
        assert_eq!(cache.len(), 0);
        assert!(cache.get("CustomWord test", "en_GB", CheckMode::Document).is_none());
    }
}
