use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    Spelling,
    Grammar,
    Style,
    Punctuation,
    Repetition,
    Capitalisation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Error,
    Warning,
    Suggestion,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Issue {
    pub id: String,
    pub rule_id: String,
    pub category: Category,
    pub severity: Severity,
    pub message: String,
    pub start_offset: usize,
    pub end_offset: usize,
    pub matched_text: String,
    pub replacement: Option<String>,
    pub suggestions: Vec<String>,
    pub apply_all_eligible: bool,
}

/// Convert a UTF-16 [location, length] range to a UTF-8 [byte_start, byte_end] offset range.
pub fn utf16_range_to_utf8_offsets(text: &str, start_utf16: usize, len_utf16: usize) -> Option<(usize, usize)> {
    let mut utf16_count = 0;
    let mut byte_start = None;
    let mut byte_end = None;

    let target_end_utf16 = start_utf16 + len_utf16;

    if start_utf16 == 0 {
        byte_start = Some(0);
    }
    if target_end_utf16 == 0 {
        byte_end = Some(0);
    }

    for (byte_idx, ch) in text.char_indices() {
        if utf16_count == start_utf16 && byte_start.is_none() {
            byte_start = Some(byte_idx);
        }
        if utf16_count == target_end_utf16 && byte_end.is_none() {
            byte_end = Some(byte_idx);
        }

        utf16_count += ch.len_utf16();

        if utf16_count == target_end_utf16 && byte_end.is_none() {
            byte_end = Some(byte_idx + ch.len_utf8());
        }
    }

    if utf16_count == start_utf16 && byte_start.is_none() {
        byte_start = Some(text.len());
    }
    if utf16_count == target_end_utf16 && byte_end.is_none() {
        byte_end = Some(text.len());
    }

    match (byte_start, byte_end) {
        (Some(s), Some(e)) if s <= e && e <= text.len() => Some((s, e)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_utf16_to_utf8_ascii() {
        let text = "Hello world";
        assert_eq!(utf16_range_to_utf8_offsets(text, 0, 5), Some((0, 5)));
        assert_eq!(utf16_range_to_utf8_offsets(text, 6, 5), Some((6, 11)));
    }

    #[test]
    fn test_utf16_to_utf8_multibyte() {
        let text = "Café au lait"; // 'é' is 1 utf16 code unit, 2 utf8 bytes
        assert_eq!(utf16_range_to_utf8_offsets(text, 0, 4), Some((0, 5)));
        assert_eq!(utf16_range_to_utf8_offsets(text, 5, 2), Some((6, 8)));
    }
}
