use regex::Regex;
use std::sync::LazyLock;

static CODE_BLOCK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?ms)```[\s\S]*?```|~~~[\s\S]*?~~~").unwrap()
});

static INLINE_CODE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"`[^`\n]+`").unwrap()
});

static URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"https?://[^\s)\]>]+").unwrap()
});

static EMAIL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap()
});

// camelCase, PascalCase identifiers (e.g. handleClick, MyComponent),
// snake_case (e.g. user_id, api_token_v2), SCREAMING_SNAKE (e.g. DEFAULT_SETTINGS)
static IDENTIFIER_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(?:[a-z]+[A-Z][a-zA-Z0-9]*|[A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*|[a-zA-Z0-9]+_[a-zA-Z0-9_]+)\b").unwrap()
});

pub struct SyntaxMasker;

impl SyntaxMasker {
    /// Finds all masked spans in the input text, merged and sorted by start offset.
    pub fn find_masked_spans(text: &str) -> Vec<(usize, usize)> {
        let mut spans = Vec::new();

        // 1. Fenced code blocks
        for m in CODE_BLOCK_RE.find_iter(text) {
            spans.push((m.start(), m.end()));
        }

        // 2. Inline code backticks
        for m in INLINE_CODE_RE.find_iter(text) {
            spans.push((m.start(), m.end()));
        }

        // 3. Web URLs
        for m in URL_RE.find_iter(text) {
            spans.push((m.start(), m.end()));
        }

        // 4. Email addresses
        for m in EMAIL_RE.find_iter(text) {
            spans.push((m.start(), m.end()));
        }

        // 5. Technical identifiers
        for m in IDENTIFIER_RE.find_iter(text) {
            spans.push((m.start(), m.end()));
        }

        if spans.is_empty() {
            return spans;
        }

        // Sort by start offset
        spans.sort_by_key(|s| s.0);

        // Merge overlapping spans
        let mut merged: Vec<(usize, usize)> = Vec::new();
        for (start, end) in spans {
            if let Some(last) = merged.last_mut() {
                if start <= last.1 {
                    if end > last.1 {
                        last.1 = end;
                    }
                    continue;
                }
            }
            merged.push((start, end));
        }

        merged
    }

    /// Masks all detected spans with whitespace while strictly preserving identical
    /// UTF-8 byte lengths and UTF-16 code units.
    /// Newlines inside code blocks are preserved to maintain line numbering.
    pub fn mask_text(text: &str) -> String {
        let spans = Self::find_masked_spans(text);
        if spans.is_empty() {
            return text.to_string();
        }

        let mut out = String::with_capacity(text.len());
        let mut last_idx = 0;

        for (start, end) in spans {
            if start > last_idx {
                out.push_str(&text[last_idx..start]);
            }
            let masked_slice = &text[start..end];
            for ch in masked_slice.chars() {
                if ch == '\n' {
                    out.push('\n');
                } else if ch == '\r' {
                    out.push('\r');
                } else if ch.len_utf8() == 1 {
                    out.push(' ');
                } else {
                    // Non-ASCII char in masked code: keep char to preserve both UTF-8 and UTF-16 lengths
                    out.push(ch);
                }
            }
            last_idx = end;
        }

        if last_idx < text.len() {
            out.push_str(&text[last_idx..]);
        }

        out
    }

    /// Returns true if the range [start, end) overlaps with any masked span.
    pub fn overlaps_masked(spans: &[(usize, usize)], start: usize, end: usize) -> bool {
        for &(m_start, m_end) in spans {
            if start < m_end && end > m_start {
                return true;
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_code_blocks() {
        let text = "Here is code:\n```rust\nlet foo_bar = 42;\n```\nAnd more text.";
        let spans = SyntaxMasker::find_masked_spans(text);
        assert!(!spans.is_empty());
        let masked = SyntaxMasker::mask_text(text);
        assert_eq!(masked.len(), text.len());
        assert!(!masked.contains("foo_bar"));
        assert!(masked.contains("Here is code:"));
        assert!(masked.contains("And more text."));
    }

    #[test]
    fn test_mask_inline_backticks() {
        let text = "Please call `getUserProfile()` before saving.";
        let spans = SyntaxMasker::find_masked_spans(text);
        assert!(!spans.is_empty());
        let masked = SyntaxMasker::mask_text(text);
        assert_eq!(masked.len(), text.len());
        assert!(!masked.contains("getUserProfile()"));
        assert!(masked.contains("Please call"));
        assert!(masked.contains("before saving."));
    }

    #[test]
    fn test_mask_urls_and_emails() {
        let text = "Contact support@example.co.uk or visit https://github.com/google/antigravity today.";
        let masked = SyntaxMasker::mask_text(text);
        assert_eq!(masked.len(), text.len());
        assert!(!masked.contains("support@example.co.uk"));
        assert!(!masked.contains("https://github.com/google/antigravity"));
        assert!(masked.contains("Contact"));
        assert!(masked.contains("today."));
    }

    #[test]
    fn test_mask_identifiers() {
        let text = "The handleClick function updates active_user_id in state.";
        let masked = SyntaxMasker::mask_text(text);
        assert_eq!(masked.len(), text.len());
        assert!(!masked.contains("handleClick"));
        assert!(!masked.contains("active_user_id"));
        assert!(masked.contains("The"));
        assert!(masked.contains("function updates"));
        assert!(masked.contains("in state."));
    }

    #[test]
    fn test_overlaps_masked() {
        let spans = vec![(10, 20), (30, 40)];
        assert!(SyntaxMasker::overlaps_masked(&spans, 12, 15));
        assert!(SyntaxMasker::overlaps_masked(&spans, 5, 15));
        assert!(SyntaxMasker::overlaps_masked(&spans, 15, 25));
        assert!(!SyntaxMasker::overlaps_masked(&spans, 0, 9));
        assert!(!SyntaxMasker::overlaps_masked(&spans, 21, 29));
    }
}
