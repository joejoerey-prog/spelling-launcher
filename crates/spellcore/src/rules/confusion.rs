use crate::types::{Category, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

struct RuleDef {
    rule_id: &'static str,
    category: Category,
    severity: Severity,
    message: &'static str,
    pattern: &'static str,
    target_group: usize,
    replacement_template: &'static str,
    apply_all_eligible: bool,
}

struct CompiledRule {
    rule_id: &'static str,
    category: Category,
    severity: Severity,
    message: &'static str,
    regex: Regex,
    target_group: usize,
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
        target_group: 2,
        replacement_template: "effect",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.their_to_there",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean 'there'? 'Their' indicates possession, while 'there' indicates location or existence.",
        pattern: r"(?i)\b(their)\s+(is|are|was|were|has|have|will|can|could|should|would)\b",
        target_group: 1,
        replacement_template: "there",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.there_to_their",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean possessive 'their' instead of 'there'?",
        pattern: r"(?i)\b(there)\s+(car|house|dog|opinion|decision|work|report|team|job|friend|family|ideas|plan|project|data|letter|children|bicycles|backpacks|exhibition|findings|way)\b",
        target_group: 1,
        replacement_template: "their",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.theyre_to_their",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean possessive 'their'? 'They're' is a contraction of 'they are'.",
        pattern: r"(?i)\b(they're)\s+(car|house|dog|opinion|decision|work|report|team|job|friend|family|ideas|plan|project|data|letter|children|bicycles|backpacks|exhibition|findings|way|customer)\b",
        target_group: 1,
        replacement_template: "their",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.in_there_was",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'In there was'?",
        pattern: r"(?i)\bIn\s+(their)\s+was\b",
        target_group: 1,
        replacement_template: "there",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.loose_to_lose",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean 'lose'? 'Loose' is an adjective (not tight), while 'lose' is a verb.",
        pattern: r"(?i)\b(to|will|don't|can't|might|did|does|do|would|rarely|not)\s+(loose)\b",
        target_group: 2,
        replacement_template: "lose",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.loose_noun_to_lose",
        category: Category::Grammar,
        severity: Severity::Warning,
        message: "Did you mean the verb 'lose'?",
        pattern: r"(?i)\b(loose)\s+(weight|money|control|hope|faith|game|match|time|their|your|his|her)\b",
        target_group: 1,
        replacement_template: "lose",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.lead_to_led",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "The past participle of 'lead' is 'led'.",
        pattern: r"(?i)\b(has|have|had|was|were)\s+(lead)\s+to\b",
        target_group: 2,
        replacement_template: "led",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.then_to_than",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'than'? Use 'than' for comparisons and 'then' for time.",
        pattern: r"(?i)\b(better|worse|more|less|greater|smaller|faster|slower|earlier|later|rather|other|older)\s+(then)\b",
        target_group: 2,
        replacement_template: "than",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.should_have",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'have'? 'Should of' is a phonetic error for 'should have'.",
        pattern: r"(?i)\b(should|could|would|must|might)\s+(of)\b",
        target_group: 2,
        replacement_template: "have",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.alot",
        category: Category::Spelling,
        severity: Severity::Error,
        message: "'A lot' is always spelled as two words.",
        pattern: r"(?i)\b(alot)\b",
        target_group: 1,
        replacement_template: "a lot",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.in_principal",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'principle' (a fundamental rule or doctrine)?",
        pattern: r"(?i)\b(as a matter of|in)\s+(principal)\b",
        target_group: 2,
        replacement_template: "principle",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.its_to_it_is",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'it’s' (contraction of 'it is') instead of possessive 'its'?",
        pattern: r"(?i)\b(its)\s+(a|an|the|not|very|going|been|clear|obvious|time|important|evident|cold|hot|muddy|dirty|clean|wet|dry|raining|sunny|broken|working|ready|fine|true|false|good|bad|hard|easy|late|early|too|so|quite|already)\b",
        target_group: 1,
        replacement_template: "it’s",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.it_is_to_its",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean possessive 'its' instead of contraction 'it's'?",
        pattern: r"(?i)\b(it['’]s)\s+(color|colour|tail|paws?|claws?|fur|eyes?|ears?|legs?|wings?|beak|name|surface|speed|price|size|purpose|features|quality|location|contents|meaning|head|pendulum|revenue|cratered|weight|height|length|width|shape|structure|components|requirements|origin|source|value|worth|cost|role|effect|impact)\b",
        target_group: 1,
        replacement_template: "its",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.wants_to_whats",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'what's' (contraction of 'what is') instead of 'wants'?",
        pattern: r"(?i)\b(wants)\s+(wrong|the\s+matter|happening|going\s+on|up|new|next)\b",
        target_group: 1,
        replacement_template: "what's",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.free_reign",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'rein' (from riding horses) rather than 'reign' (ruling)?",
        pattern: r"(?i)\b(free|tight|give)\s+(reign)\b",
        target_group: 2,
        replacement_template: "rein",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.defuse_tension",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'defuse' (to de-escalate or deactivate)?",
        pattern: r"(?i)\b(diffuse)\s+(the\s+tension|the\s+situation|the\s+crisis|the\s+bomb)\b",
        target_group: 1,
        replacement_template: "defuse",
        apply_all_eligible: true,
    },
    RuleDef {
        rule_id: "confusion.pay_compliment",
        category: Category::Grammar,
        severity: Severity::Error,
        message: "Did you mean 'compliment' (an expression of praise)?",
        pattern: r"(?i)\b(pay|paid|return|returned)\s+(?:a\s+|an\s+)?(complement)\b",
        target_group: 2,
        replacement_template: "compliment",
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
            target_group: d.target_group,
            replacement_template: d.replacement_template,
            apply_all_eligible: d.apply_all_eligible,
        })
        .collect()
});

fn match_capitalization(original: &str, replacement: &str) -> String {
    if original.starts_with(|c: char| c.is_uppercase()) {
        let mut chars = replacement.chars();
        match chars.next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        }
    } else {
        replacement.to_string()
    }
}

pub fn check_confusion_rules(text: &str) -> Vec<Issue> {
    let mut issues = Vec::new();

    for rule in COMPILED_RULES.iter() {
        for caps in rule.regex.captures_iter(text) {
            let target_match = caps.get(rule.target_group).or_else(|| caps.get(1));

            if let Some(mat) = target_match {
                let rep = match_capitalization(mat.as_str(), rule.replacement_template);
                let mut suggestions = vec![rep.clone()];
                if rule.rule_id == "confusion.wants_to_whats" {
                    suggestions.push(match_capitalization(mat.as_str(), "what is"));
                }

                issues.push(Issue {
                    id: format!("{}-{}", rule.rule_id, mat.start()),
                    rule_id: rule.rule_id.to_string(),
                    category: rule.category,
                    severity: rule.severity,
                    message: rule.message.to_string(),
                    start_offset: mat.start(),
                    end_offset: mat.end(),
                    matched_text: mat.as_str().to_string(),
                    replacement: Some(rep),
                    suggestions,
                    apply_all_eligible: rule.apply_all_eligible,
                });
            }
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wants_to_whats() {
        let text = "help me find wants wrong with this";
        let issues = check_confusion_rules(text);
        let wants_issue = issues.iter().find(|i| i.rule_id == "confusion.wants_to_whats");
        assert!(wants_issue.is_some());
        let issue = wants_issue.unwrap();
        assert_eq!(issue.matched_text, "wants");
        assert_eq!(issue.replacement, Some("what's".to_string()));
        assert_eq!(issue.start_offset, 13);
        assert_eq!(issue.end_offset, 18);
    }

    #[test]
    fn test_wants_to_whats_capitalized() {
        let text = "Wants wrong with that?";
        let issues = check_confusion_rules(text);
        let wants_issue = issues.iter().find(|i| i.rule_id == "confusion.wants_to_whats");
        assert!(wants_issue.is_some());
        let issue = wants_issue.unwrap();
        assert_eq!(issue.matched_text, "Wants");
        assert_eq!(issue.replacement, Some("What's".to_string()));
    }

    #[test]
    fn test_their_to_there_target_group_fix() {
        let text = "their is a problem";
        let issues = check_confusion_rules(text);
        let issue = issues.iter().find(|i| i.rule_id == "confusion.their_to_there").unwrap();
        assert_eq!(issue.matched_text, "their");
        assert_eq!(issue.replacement, Some("there".to_string()));
        assert_eq!(issue.start_offset, 0);
        assert_eq!(issue.end_offset, 5);
    }
}
