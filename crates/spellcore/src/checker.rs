use crate::types::{Category, Issue};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CheckerError {
    #[error("Internal checker error: {0}")]
    Internal(String),
    #[error("Checker operation cancelled")]
    Cancelled,
}

pub trait Checker: Send + Sync {
    fn name(&self) -> &'static str;
    fn categories(&self) -> &[Category];
    fn check(&self, text: &str, language: &str, tag: isize) -> Result<Vec<Issue>, CheckerError>;
}
