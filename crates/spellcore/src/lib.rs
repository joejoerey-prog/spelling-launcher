pub mod checker;
pub mod engine;
pub mod native;
pub mod normalizer;
pub mod rules;
pub mod types;

pub use checker::{Checker, CheckerError};
pub use engine::SpellcoreEngine;
pub use native::NativeChecker;
pub use normalizer::normalize_issues;
pub use rules::DeterministicChecker;
pub use types::{utf16_range_to_utf8_offsets, Category, Issue, Severity};
