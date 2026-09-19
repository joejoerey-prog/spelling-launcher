use crate::types::{Category, CheckMode, Issue};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CheckerError {
    #[error("Internal checker error: {0}")]
    Internal(String),
    #[error("Checker operation cancelled")]
    Cancelled,
    #[error("Checker operation timed out after {0:?}")]
    Timeout(std::time::Duration),
    #[error("Main thread unavailable: {0}")]
    MainThreadUnavailable(String),
}

pub trait Checker: Send + Sync {
    fn name(&self) -> &'static str;
    fn categories(&self) -> &[Category];
    fn check(&self, text: &str, language: &str, tag: isize, mode: CheckMode) -> Result<Vec<Issue>, CheckerError>;
}
