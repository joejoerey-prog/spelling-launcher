use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

struct RuleDef {
    rule_id: &'static str,
    category: Category,
    severity: Severity,
    message: &'static str,
    pattern: &'static str,
    replacement_template: &'static str,
    apply_all_eligible: bool,
}

struct CompiledRule {
    rule_id: &'static str,
    category: Category,
    severity: Severity,
    message: &'static str,
    regex: Regex,
    replacement_template: &'static str,
    apply_all_eligible: bool,
}

const DEFS: &[RuleDef] = &[
    RuleDef {
        rule_id: "confusion.affect_effect",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'effect'? 'Affect' is typically a verb, while 'effect' is a noun.",
        pattern: r"(?i)\b(have|has|had|an|the|no|any|major|significant|direct|positive|negative|side|adverse|immediate)\s+(affect)\b",
        replacement_template: "effect",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.their_to_there",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean 'there'? 'Their' indicates possession, while 'there' indicates location or existence.",
        pattern: r"(?i)\b(their)\s+(is|are|was|were|has|have|will|can|could|should|would)\b",
        replacement_template: "there",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.there_to_their",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean possessive 'their' instead of 'there'?",
        pattern: r"(?i)\b(there)\s+(car|house|dog|opinion|decision|work|report|team|job|friend|family|ideas|plan|project|data|letter|children|bicycles|backpacks|exhibition|findings|way)\b",
        replacement_template: "their",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.theyre_to_their",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean possessive 'their'? 'They're' is a contraction of 'they are'.",
        pattern: r"(?i)\b(they're)\s+(car|house|dog|opinion|decision|work|report|team|job|friend|family|ideas|plan|project|data|letter|children|bicycles|backpacks|exhibition|findings|way|customer)\b",
        replacement_template: "their",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.in_there_was",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'In there was'?",
        pattern: r"(?i)\bIn\s+(their)\s+was\b",
        replacement_template: "there",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.loose_to_lose",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean 'lose'? 'Loose' is an adjective (not tight), while 'lose' is a verb.",
        pattern: r"(?i)\b(to|will|don't|can't|might|did|does|do|would|rarely|not)\s+(loose)\b",
        replacement_template: "lose",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.loose_noun_to_lose",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean the verb 'lose'?",
        pattern: r"(?i)\b(loose)\s+(weight|money|control|hope|faith|game|match|time|their|your|his|her)\b",
        replacement_template: "lose",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.lead_to_led",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "The past participle of 'lead' is 'led'.",
        pattern: r"(?i)\b(has|have|had|was|were)\s+(lead)\s+to\b",
        replacement_template: "led",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.then_to_than",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'than'? Use 'than' for comparisons and 'then' for time.",
        pattern: r"(?i)\b(better|worse|more|less|greater|smaller|faster|slower|earlier|later|rather|other|older)\s+(then)\b",
        replacement_template: "than",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.should_have",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'have'? 'Should of' is a phonetic error for 'should have'.",
        pattern: r"(?i)\b(should|could|would|must|might)\s+(of)\b",
        replacement_template: "have",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.alot",
        category: Category::Spelling,
        severity: Severity::Error,
        message: "'A lot' is always spelled as two words.",
        pattern: r"(?i)\b(alot)\b",
        replacement_template: "a lot",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.in_principal",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'principle' (a fundamental rule or doctrine)?",
        pattern: r"(?i)\b(as a matter of|in)\s+(principal)\b",
        replacement_template: "principle",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.its_to_it_is",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'it's' (contraction of 'it is') instead of possessive 'its'?",
        pattern: r"(?i)\b(its)\s+(a|an|the|not|very|going|been|clear|obvious|time|important|evident|cold)\b",
        replacement_template: "it's",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.it_is_to_its",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean possessive 'its' instead of 'it's'?",
        pattern: r"(?i)\b(it's)\s+(color|tail|name|surface|speed|price|size|purpose|features|quality|location|contents|meaning|head|pendulum|revenue|cratered)\b",
        replacement_template: "its",
        apply_all_eligible: true,
    },
];

static COMPILED_RULES: LazyLock<Vec<CompiledRule>> = LazyLock::new(|| {
    DEFS.iter()
        .map(|d| CompiledRule {
            rule_id: d.rule_id,
            category: d.category,
            severity: d.severity,
            message: d.message,
            regex: Regex::new(d.pattern).unwrap(),
            replacement_template: d.replacement_template,
            apply_all_eligible: d.apply_all_eligible,
        })
        .collect()
});

pub fn check_confusion_rules(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    for rule in COMPILED_RULES.iter() {
        for caps in rule.regex.captures_iter(text) {
            let target_match = if caps.len() >= 3 {
                caps.get(2).or_else(|| caps.get(1))
            } else {
                caps.get(1)
            };

            if let Some(mat) = target_match {
                let rep = rule.replacement_template.to_string();
                issues.push(Issue {
                    id: format!("{}-{}", rule.rule_id, mat.start()),
                    rule_id: rule.rule_id.to_string(),
                    category: rule.category,
                    severity: rule.severity,
                    message: rule.message.to_string(),
                    start_offset: mat.start(),
                    end_offset: mat.end(),
                    matched_text: mat.as_str().to_string(),
                    replacement: Some(rep.clone()),
                    suggestions: vec![rep],
                    apply_all_eligible: rule.apply_all_eligible,
                });
            }
        }
    }

    issues
}
