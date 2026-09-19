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
    WordinessDef {
        rule_id: "wordiness.at_the_present_time",
        message: "'At the present time' is wordy. Simplify to 'currently' or 'now'.",
        pattern: r"(?i)\bat\s+the\s+present\s+time\b",
        replacement: "currently",
    },
    WordinessDef {
        rule_id: "wordiness.at_all_times",
        message: "'At all times' is wordy. Simplify to 'always'.",
        pattern: r"(?i)\bat\s+all\s+times\b",
        replacement: "always",
    },
    WordinessDef {
        rule_id: "wordiness.for_the_purpose_of",
        message: "'For the purpose of' is wordy. Simplify to 'to'.",
        pattern: r"(?i)\bfor\s+the\s+purpose\s+of\b",
        replacement: "to",
    },
    WordinessDef {
        rule_id: "wordiness.in_the_event_that",
        message: "'In the event that' is wordy. Simplify to 'if'.",
        pattern: r"(?i)\bin\s+the\s+event\s+that\b",
        replacement: "if",
    },
    WordinessDef {
        rule_id: "wordiness.has_the_ability_to",
        message: "'Has the ability to' is wordy. Simplify to 'can'.",
        pattern: r"(?i)\bhas\s+the\s+ability\s+to\b",
        replacement: "can",
    },
    WordinessDef {
        rule_id: "wordiness.a_large_number_of",
        message: "'A large number of' is wordy. Simplify to 'many'.",
        pattern: r"(?i)\ba\s+large\s+number\s+of\b",
        replacement: "many",
    },
    WordinessDef {
        rule_id: "wordiness.utilize",
        message: "'Utilize' is often pretentious. Simplify to 'use'.",
        pattern: r"(?i)\butilize\b",
        replacement: "use",
    },
    WordinessDef {
        rule_id: "wordiness.utilizes",
        message: "'Utilizes' is often pretentious. Simplify to 'uses'.",
        pattern: r"(?i)\butilizes\b",
        replacement: "uses",
    },
    WordinessDef {
        rule_id: "wordiness.utilized",
        message: "'Utilized' is often pretentious. Simplify to 'used'.",
        pattern: r"(?i)\butilized\b",
        replacement: "used",
    },
    WordinessDef {
        rule_id: "wordiness.make_a_decision",
        message: "'Make a decision' is wordy. Simplify to 'decide'.",
        pattern: r"(?i)\bmake\s+a\s+decision\b",
        replacement: "decide",
    },
    WordinessDef {
        rule_id: "wordiness.take_action",
        message: "'Take action' can be simplified to 'act'.",
        pattern: r"(?i)\btake\s+action\b",
        replacement: "act",
    },
    WordinessDef {
        rule_id: "wordiness.first_and_foremost",
        message: "'First and foremost' is redundant. Simplify to 'first'.",
        pattern: r"(?i)\bfirst\s+and\s+foremost\b",
        replacement: "first",
    },
    WordinessDef {
        rule_id: "wordiness.give_consideration_to",
        message: "'Give consideration to' is wordy. Simplify to 'consider'.",
        pattern: r"(?i)\bgive\s+consideration\s+to\b",
        replacement: "consider",
    },
    WordinessDef {
        rule_id: "wordiness.meet_with",
        message: "In British English, use 'meet' rather than 'meet with'.",
        pattern: r"(?i)\bmeet\s+with\b",
        replacement: "meet",
    },
    WordinessDef {
        rule_id: "wordiness.consult_with",
        message: "In British English, use 'consult' rather than 'consult with'.",
        pattern: r"(?i)\bconsult\s+with\b",
        replacement: "consult",
    },
    WordinessDef {
        rule_id: "wordiness.talk_with",
        message: "In British English, use 'talk to' rather than 'talk with'.",
        pattern: r"(?i)\btalk\s+with\b",
        replacement: "talk to",
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

fn match_capitalization(original: &str, replacement: &str) -> String {
    if original.starts_with(|c: char| c.is_uppercase()) {
        let mut chars = replacement.chars();
        match chars.next() {
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            None => replacement.to_string(),
        }
    } else {
        replacement.to_string()
    }
}

pub fn check_wordiness_rules(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    for rule in COMPILED_WORDINESS_RULES.iter() {
        for mat in rule.regex.find_iter(text) {
            let base_rep = rule.regex.replace(mat.as_str(), rule.replacement).to_string();
            let rep = match_capitalization(mat.as_str(), &base_rep);
            issues.push(Issue {
                id: format!("{}-{}", rule.rule_id, mat.start()),
                rule_id: rule.rule_id.to_string(),
                category: Category::Style,
                severity: Severity::Suggestion, // Suggestion severity
                message: rule.message.to_string(),
                start_offset: mat.start(),
                end_offset: mat.end(),
                matched_text: mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: false, // Excluded from apply-all by design
            });
        }
    }

    issues
}
