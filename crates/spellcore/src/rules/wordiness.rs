use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

struct WordinessDef {
    rule_id: &'static str,
    message: &'static str,
    pattern: &'static str,
    replacement: &'static str,
}

struct CompiledWordinessRule {
    rule_id: &'static str,
    message: &'static str,
    regex: Regex,
    replacement: &'static str,
}

const DEFS: &[WordinessDef] = &[
    WordinessDef {
        rule_id: "wordiness.close_proximity",
        message: "'Close proximity' is redundant. Simplify to 'proximity' or 'near'.",
        pattern: r"(?i)\bin\s+close\s+proximity\s+to\b",
        replacement: "near",
    },
    WordinessDef {
        rule_id: "wordiness.due_to_the_fact_that",
        message: "'Due to the fact that' is wordy. Simplify to 'because'.",
        pattern: r"(?i)\bdue\s+to\s+the\s+fact\s+that\b",
        replacement: "because",
    },
    WordinessDef {
        rule_id: "wordiness.at_this_point_in_time",
        message: "'At this point in time' is wordy. Simplify to 'currently' or 'now'.",
        pattern: r"(?i)\bat\s+this\s+point\s+in\s+time\b",
        replacement: "currently",
    },
    WordinessDef {
        rule_id: "wordiness.future_plans",
        message: "'Future plans' is redundant. Simplify to 'plans'.",
        pattern: r"(?i)\bfuture\s+plans\b",
        replacement: "plans",
    },
    WordinessDef {
        rule_id: "wordiness.end_result",
        message: "'End result' is redundant. Simplify to 'result'.",
        pattern: r"(?i)\bend\s+result\b",
        replacement: "result",
    },
    WordinessDef {
        rule_id: "wordiness.in_order_to",
        message: "'In order to' can often be simplified to 'to'.",
        pattern: r"(?i)\bin\s+order\s+to\b",
        replacement: "to",
    },
    WordinessDef {
        rule_id: "wordiness.prior_to",
        message: "'Prior to' is formal. Consider 'before'.",
        pattern: r"(?i)\bprior\s+to\b",
        replacement: "before",
    },
    WordinessDef {
        rule_id: "wordiness.personal_opinion",
        message: "'Personal opinion' is redundant. Simplify to 'opinion'.",
        pattern: r"(?i)\bpersonal\s+opinion\b",
        replacement: "opinion",
    },
    WordinessDef {
        rule_id: "wordiness.completely_destroyed",
        message: "'Completely destroyed' is redundant. 'Destroyed' is sufficient.",
        pattern: r"(?i)\bcompletely\s+(destroyed|eliminated|eradicated)\b",
        replacement: "$1",
    },
    WordinessDef {
        rule_id: "wordiness.join_together",
        message: "'Join together' is redundant. Simplify to 'join'.",
        pattern: r"(?i)\bjoin\s+together\b",
        replacement: "join",
    },
    WordinessDef {
        rule_id: "wordiness.basic_fundamentals",
        message: "'Basic fundamentals' is redundant. Simplify to 'fundamentals'.",
        pattern: r"(?i)\bbasic\s+fundamentals\b",
        replacement: "fundamentals",
    },
    WordinessDef {
        rule_id: "wordiness.consensus_of_opinion",
        message: "'Consensus of opinion' is redundant. Simplify to 'consensus'.",
        pattern: r"(?i)\bconsensus\s+of\s+opinion\b",
        replacement: "consensus",
    },
];

static COMPILED_WORDINESS_RULES: LazyLock<Vec<CompiledWordinessRule>> = LazyLock::new(|| {
    DEFS.iter()
        .map(|d| CompiledWordinessRule {
            rule_id: d.rule_id,
            message: d.message,
            regex: Regex::new(d.pattern).unwrap(),
            replacement: d.replacement,
        })
        .collect()
});

pub fn check_wordiness_rules(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    for rule in COMPILED_WORDINESS_RULES.iter() {
        for mat in rule.regex.find_iter(text) {
            let rep = rule.regex.replace(mat.as_str(), rule.replacement).to_string();
            issues.push(Issue {
                id: format!("{}-{}", rule.rule_id, mat.start()),
                rule_id: rule.rule_id.to_string(),
                category: Category::Style,
                severity: Severity::Suggestion, // Fix C: Suggestion severity
                message: rule.message.to_string(),
                start_offset: mat.start(),
                end_offset: mat.end(),
                matched_text: mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: false, // Fix C: Excluded from apply-all by design
            });
        }
    }

    issues
}
