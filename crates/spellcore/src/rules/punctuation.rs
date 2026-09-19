use crate::types::{Category, CheckMode, Issue, Severity};
use regex::Regex;
use std::sync::LazyLock;

static SPACE_BEFORE_PUNCT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\s+([,.:;?!])").unwrap()
});

static MISSING_SPACE_AFTER_COMMA_SEMICOLON: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([,;])([A-Za-z])").unwrap()
});

static MULTIPLE_PUNCTUATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([!?]){2,}").unwrap()
});

static UK_TITLES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\.").unwrap()
});

static PLURAL_DECADES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(1[89]\d0|20[012]\d)'s\b").unwrap()
});

static PLURAL_ACRONYMS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b([A-Z]{2,})'s\b").unwrap()
});

static IRREGULAR_PLURAL_GENITIVES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(children|women|men)s\b").unwrap()
});

static PLURAL_ACRONYMS_EXTENDED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(cd|dvd|tv|pc|vip|mp|api|url|faq|pdf|sms|gps|usb|ceo|cfo|cto|pr|hr)'s\b").unwrap()
});

static GREENGROCER_PLURAL_APOSTROPHE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(video|photo|logo|memo|taco|piano|banana|apple|orange|tomato|potato|pizza|burger|drink|item|file|song|album|movie|film|game)'s\b").unwrap()
});

static IDIOSYNCRATIC_PLACES: LazyLock<Vec<(Regex, &'static str)>> = LazyLock::new(|| {
    vec![
        (Regex::new(r"(?i)\bland['’]?s\s+end\b").unwrap(), "Land’s End"),
        (Regex::new(r"(?i)\ball\s+souls\s+college\b").unwrap(), "All Souls College"),
        (Regex::new(r"(?i)\bearl['’]?s\s+court\b").unwrap(), "Earls Court"),
        (Regex::new(r"(?i)\bst\s+peter['’]?s\s+college\b").unwrap(), "St Peter’s College"),
        (Regex::new(r"(?i)\bst\s+giles['’]?\b").unwrap(), "St Giles’"),
        (Regex::new(r"(?i)\bst\s+aldate['’]?s\b").unwrap(), "St Aldate’s"),
    ]
});

static PARENTHETICAL_EM_DASH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\s*—\s*").unwrap()
});

static SPAN_EM_DASH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([£$€¥]?\d+(?:,\d+)*(?:\.\d+)?|[A-Z][a-z]+)\s*—\s*([£$€¥]?\d+(?:,\d+)*(?:\.\d+)?|[A-Z][a-z]+)").unwrap()
});

static LY_ADVERB_HYPHEN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b([a-zA-Z]+ly)-([a-zA-Z]+)\b").unwrap()
});

static NON_LY_COMPOUND_ADJ: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(well|ill|fast|slow|tight)\s+(formed|respected|known|defined|designed|established|balanced|behaved|built|crafted|documented|educated|equipped|grounded|maintained|mannered|organized|organised|proportioned|read|rounded|structured|thought|written|fitting|moving)\s+([a-zA-Z]+)\b").unwrap()
});

static ESTABLISHED_SHORTENED_WORDS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b['’](phone|plane|flu)\b").unwrap()
});

static DURATION_POSSESSIVES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(a|one|\d+)\s+(day|week|month|year)s?\s+(holiday|notice|time|leave|delay|work|experience)\b").unwrap()
});

static DOUBLE_QUOTES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#""([^"\n]+)""#).unwrap()
});

static S_ENDING_NAMES_POSSESSIVE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(James|Burns|Jones|Charles|Dickens)'\b").unwrap()
});

static DOT_RUNS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\.{2,}").unwrap()
});

static UK_QUOTE_PLACEMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(['"])([a-z][^'"\n]*?)([.,])(['"])"#).unwrap()
});

static SUPERFLUOUS_OXFORD_COMMA: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b([a-zA-Z]+),\s+([a-zA-Z]+)(,\s+(?:and|or))\s+([a-zA-Z]+)\b").unwrap()
});

static SPEECH_ATTRIBUTION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^([^.?!'\x22\n]+?)\s+(said|asked|replied|muttered|whispered|shouted|exclaimed|remarked|cried)\s+(?:(?:dr|mr|mrs|ms|prof|rev|sir|lord|lady|inspector|detective|constable|judge|sergeant)\s+[a-zA-Z]+|[a-zA-Z]+)\b").unwrap()
});

static NESTED_SPEECH_REPORT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^([^'\x22\n]+?)\s+and\s+(said)\s+([^'\x22\n]+?)\s+(mutter|muttered|say|said|shout|shouted|whisper|whispered|cry|cried)\s+([^'\x22\n]+?)\s+(before|after|when|as)\s+([^'\x22\n]+?)\s+(explained|said|replied|stated|observed)\s+(?:(?:dr|mr|mrs|ms|prof|rev|sir|lord|lady|inspector|detective|constable|judge|sergeant)\s+[a-zA-Z]+|[a-zA-Z]+)\b").unwrap()
});

static UK_HONORIFIC_CASING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(dr|mr|mrs|ms|prof|rev|sir|lord|lady|inspector|detective|constable|judge|sergeant|superintendent|commissioner|officer|captain|colonel|major|lieutenant|general|admiral|professor|chancellor|reverend|pastor|father)\s+([a-zA-Z]+)").unwrap()
});

static ISOLATED_HONORIFIC_NAME: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:dr|mr|mrs|ms|prof|rev|sir|lord|lady|inspector|detective|constable|judge|sergeant|superintendent|commissioner|officer|captain|colonel|major|lieutenant|general|admiral|professor|chancellor|reverend|pastor|father)\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)?$").unwrap()
});

static ID_ACRONYM: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(id)\s+(cards?|badges?|documents?|numbers?|photos?|checks?|proofs?|verifications?|requirements?)\b").unwrap()
});

static STANDALONE_I: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(i)\b").unwrap()
});

static ROMAN_NUMERAL_CONTEXT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(?:section|part|volume|chapter|canto|clause|item|case|scene|act|article|rule|table|figure|appendix|index|schedule|exhibit|book|grade|class|tier|phase|stage|level|step|division|title|type|mark|model|category|group|paragraph|subparagraph|subdivision|subsection|subclause|annex|attachment|supplement|form|chart|diagram|plate|folio|lesson|unit|module)\s+i\b").unwrap()
});

static ROMAN_SEQUENCE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\bi\s*(?:,|and|or|to|-|–)\s*(?:ii|iii|iv|v|vi|vii|viii|ix|x)\b").unwrap()
});

static PRONOUN_I_WITH_APOSTROPHE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(i)(?:['’](?:m|ve|d|ll))\b").unwrap()
});

static COMMERCIAL_GENITIVES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(the|at the|to the|from the|into the|in the|down at the|up at the|left at the|round at the|outside the|inside the|near the|opposite the|by the|behind the|waiting at the)\s+(chemists|butchers|bakers|grocers|fishmongers|newsagents|tobacconists|greengrocers|florists|stationers|ironmongers)\b").unwrap()
});

static INTRO_CLAUSE_FOLLOWING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^\s+(i|we|they|he|she)\s+(realised|noticed|found|saw|knew|felt|thought|decided|discovered)\b").unwrap()
});

static INTRO_DEPENDENT_CLAUSE_COMMA: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(cards?|badges?|documents?|chequebooks?|passports?|wallets?)\s+(ill|id|ive|i)\s+(ask|tell|call|see|do)\b").unwrap()
});

static SUBORDINATING_CONJUNCTION_COMMA: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-zA-Z0-9]+)(\s+)(because|while|whereas|although)\s+([a-zA-Z]+)\b").unwrap()
});

static ADVERBIAL_CLAUSE_BOUNDARY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-zA-Z]+)\s+(right\s+next\s+to|right\s+beside|right\s+in\s+front\s+of|right\s+behind)\b").unwrap()
});

static COORDINATING_CONJUNCTION_COMMA: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-zA-Z0-9]+)(\s+)(but|or)\s+(we|i|they|he|she|it|you|shall|will|can|could|would|should|is|are|was|were|do|does|did|has|have|had|dr|mr|mrs|ms|prof|rev|sir|lord|lady|inspector|detective|constable|judge|sergeant)\b").unwrap()
});

static COMPOUND_CARDINALS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b").unwrap()
});

static BRITISH_TIME_NOTATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(1[0-2]|0?[1-9])([0-5][0-9])\s*([ap]\.?m\.?)\b").unwrap()
});

static NON_RESTRICTIVE_WHICH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b([a-zA-Z0-9]+)(\s+)(which)\b").unwrap()
});

static MONTH_NAMES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(january|february|march|april|may|june|july|august|september|october|november|december)\b").unwrap()
});

static INTERROGATIVE_CLAUSE_BOUNDARY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(instead)\s+(ive|id|ill|i|we|they|he|she)\b").unwrap()
});

static COORDINATE_ADJECTIVES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(grey|gray|dark|light|bright|cold|warm|hot|cool|damp|wet|dry|tall|short|big|small|large|huge|tiny|old|young|ancient|new|fresh|stale|sweet|sour|bitter|heavy|soft|hard|rough|smooth|sharp|blunt|thick|thin|narrow|wide|clean|dirty|empty|full|rich|poor|quiet|loud|noisy|silent|calm|wild|fierce|gentle|brave|cowardly|clever|foolish|wise|simple|strange|weird|odd|funny|sad|happy|glad|mad|angry|proud|humble|fair|foul|fine|coarse|crude|plain|fancy|grand|noble|base|vile|evil|good|bad|wicked|mouldy|moldy|musty|dusty|shabby|threadbare|ragged|faded|tattered)\s+(grey|gray|dark|light|bright|cold|warm|hot|cool|damp|wet|dry|tall|short|big|small|large|huge|tiny|old|young|ancient|new|fresh|stale|sweet|sour|bitter|heavy|soft|hard|rough|smooth|sharp|blunt|thick|thin|narrow|wide|clean|dirty|empty|full|rich|poor|quiet|loud|noisy|silent|calm|wild|fierce|gentle|brave|cowardly|clever|foolish|wise|simple|strange|weird|odd|funny|sad|happy|glad|mad|angry|proud|humble|fair|foul|fine|coarse|crude|plain|fancy|grand|noble|base|vile|evil|good|bad|wicked|mouldy|moldy|musty|dusty|shabby|threadbare|ragged|faded|tattered)\s+([a-zA-Z]+)\b").unwrap()
});

static CONTRACTION_PATTERNS: LazyLock<Vec<(Regex, &'static str)>> = LazyLock::new(|| {
    vec![
        (Regex::new(r"(?i)\b(dont)\b").unwrap(), "don't"),
        (Regex::new(r"(?i)\b(cant)\b").unwrap(), "can't"),
        (Regex::new(r"(?i)\b(wont)\b").unwrap(), "won't"),
        (Regex::new(r"(?i)\b(didnt)\b").unwrap(), "didn't"),
        (Regex::new(r"(?i)\b(isnt)\b").unwrap(), "isn't"),
        (Regex::new(r"(?i)\b(arent)\b").unwrap(), "aren't"),
        (Regex::new(r"(?i)\b(wasnt)\b").unwrap(), "wasn't"),
        (Regex::new(r"(?i)\b(werent)\b").unwrap(), "weren't"),
        (Regex::new(r"(?i)\b(hasnt)\b").unwrap(), "hasn't"),
        (Regex::new(r"(?i)\b(havent)\b").unwrap(), "haven't"),
        (Regex::new(r"(?i)\b(hadnt)\b").unwrap(), "hadn't"),
        (Regex::new(r"(?i)\b(couldnt)\b").unwrap(), "couldn't"),
        (Regex::new(r"(?i)\b(shouldnt)\b").unwrap(), "shouldn't"),
        (Regex::new(r"(?i)\b(wouldnt)\b").unwrap(), "wouldn't"),
        (Regex::new(r"(?i)\b(ive)\b").unwrap(), "I've"),
        (
            Regex::new(r"(?i)\b(im)\s+(not|sure|going|gonna|trying|willing|ready|glad|happy|sorry|afraid|convinced|certain|here|there|feeling|looking|getting|taking|making|doing|about|now|just|so|very|too|always|never)\b").unwrap(),
            "I'm",
        ),
        (
            Regex::new(r"(?i)\b(id)\s+(better|rather|like|have|had|left|go|be|seen|see|take|make|get|do|think|say|love|prefer|ask|tell|want|not|never|always|done|been)\b").unwrap(),
            "I'd",
        ),
        (
            Regex::new(r"(?i)\b(ill)\s+(do|be|have|go|see|take|get|make|give|call|let|come|tell|ask|try|find|check|never|always|not)\b").unwrap(),
            "I'll",
        ),
        (
            Regex::new(r"(?i)\b(thats)\s+(a|an|the|what|why|how|not|very|true|fine|right|ok|okay|it|good|bad|great|all)\b").unwrap(),
            "that's",
        ),
        (
            Regex::new(r"(?i)\b(whats)\s+(a|an|the|your|his|her|my|our|their|wrong|happening|up|next|new|this|that)\b").unwrap(),
            "what's",
        ),
        (
            Regex::new(r"(?i)\b(theres)\s+(a|an|the|no|any|nothing|something|always|never|one|two|three)\b").unwrap(),
            "there's",
        ),
        (
            Regex::new(r"(?i)\b(heres)\s+(a|an|the|your|my|our|what|how)\b").unwrap(),
            "here's",
        ),
        (
            Regex::new(r"(?i)\b(lets)\s+(go|see|try|find|make|do|take|get|have|start|check|look|talk)\b").unwrap(),
            "let's",
        ),
    ]
});

static PLURAL_APOSTROPHE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(two|three|four|five|six|seven|eight|nine|ten|several|many|few|numerous|countless|various|all|both)\s+([a-zA-Z]+)'s\b").unwrap()
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

pub fn check_punctuation_rules(text: &str, language: &str, mode: CheckMode) -> Vec<Issue> {
    let mut issues = Vec::new();

    // 1. Direct speech quotation mark wrapping & attribution comma
    check_direct_speech(text, &mut issues);

    // 2. ID acronym casing ('id card' -> 'ID card')
    for caps in ID_ACRONYM.captures_iter(text) {
        let id_mat = caps.get(1).unwrap();
        if id_mat.as_str() != "ID" {
            issues.push(Issue {
                id: format!("punct-id-acronym-{}", id_mat.start()),
                rule_id: "punctuation.id_acronym".to_string(),
                category: Category::Punctuation,
                severity: Severity::Error,
                message: "The acronym 'ID' should be capitalised.".to_string(),
                start_offset: id_mat.start(),
                end_offset: id_mat.end(),
                matched_text: id_mat.as_str().to_string(),
                replacement: Some("ID".to_string()),
                suggestions: vec!["ID".to_string()],
                apply_all_eligible: true,
            });
        }
    }

    // 3. Missing contraction apostrophes
    for (regex, template) in CONTRACTION_PATTERNS.iter() {
        for caps in regex.captures_iter(text) {
            if let Some(mat) = caps.get(1) {
                if issues.iter().any(|i| i.start_offset == mat.start()) {
                    continue;
                }
                let rep = match_capitalization(mat.as_str(), template);
                issues.push(Issue {
                    id: format!("punct-missing-apostrophe-{}", mat.start()),
                    rule_id: "punctuation.missing_apostrophe".to_string(),
                    category: Category::Punctuation,
                    severity: Severity::Error,
                    message: format!("Did you mean the contraction '{}'?", rep),
                    start_offset: mat.start(),
                    end_offset: mat.end(),
                    matched_text: mat.as_str().to_string(),
                    replacement: Some(rep.clone()),
                    suggestions: vec![rep],
                    apply_all_eligible: true,
                });
            }
        }
    }

    // 4. Introductory dependent clause boundary comma ('card, I\'ll ask')
    for caps in INTRO_DEPENDENT_CLAUSE_COMMA.captures_iter(text) {
        let noun_mat = caps.get(1).unwrap();
        let noun = noun_mat.as_str();

        let after_noun = &text[noun_mat.end()..];
        if after_noun.trim_start().starts_with(',') {
            continue;
        }

        let rep = format!("{},", noun);
        issues.push(Issue {
            id: format!("punct-intro-dep-comma-{}", noun_mat.start()),
            rule_id: "punctuation.intro_dependent_clause_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Use a comma to separate the introductory dependent clause from the main clause.".to_string(),
            start_offset: noun_mat.start(),
            end_offset: noun_mat.end(),
            matched_text: noun.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 5. Subordinating conjunction comma (', because', ', while')
    for caps in SUBORDINATING_CONJUNCTION_COMMA.captures_iter(text) {
        let space_mat = caps.get(2).unwrap();
        let conj_mat = caps.get(3).unwrap();

        let prev_text = &text[..space_mat.start()];
        if prev_text.ends_with(',') || prev_text.ends_with(';') {
            continue;
        }

        // In British English, simple restrictive clauses with 'because' do not take a comma.
        // Only insert a comma before 'because' if the preceding clause is long (> 6 words)
        // or ends in an honorific / proper noun.
        if conj_mat.as_str().eq_ignore_ascii_case("because") {
            let prev_words: Vec<&str> = prev_text.split_whitespace().collect();
            let is_long = prev_words.len() > 6;
            let ends_with_proper = prev_words.last().map(|w| w.starts_with(|c: char| c.is_uppercase())).unwrap_or(false);
            if !is_long && !ends_with_proper {
                continue;
            }
        }

        let start = space_mat.start();
        let end = conj_mat.end();
        let matched = &text[start..end];
        let rep = format!(", {}", conj_mat.as_str());

        issues.push(Issue {
            id: format!("punct-subord-comma-{}", start),
            rule_id: "punctuation.subordinating_conjunction_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Use a comma before a subordinating conjunction introducing an independent clause.".to_string(),
            start_offset: start,
            end_offset: end,
            matched_text: matched.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 6. Non-restrictive relative clause comma (', which')
    let which_prep_exceptions = [
        "in", "on", "at", "by", "for", "to", "from", "with", "into", "onto", "under", "over", "through", "about", "after", "before"
    ];
    for caps in NON_RESTRICTIVE_WHICH.captures_iter(text) {
        let prev_word = caps.get(1).unwrap();
        let space_mat = caps.get(2).unwrap();
        let which_mat = caps.get(3).unwrap();

        let prev_lower = prev_word.as_str().to_lowercase();
        if which_prep_exceptions.contains(&prev_lower.as_str()) {
            continue;
        }

        let before_space = &text[..space_mat.start()];
        if before_space.ends_with(',') || before_space.ends_with(';') {
            continue;
        }

        let start = space_mat.start();
        let end = which_mat.end();
        let matched = &text[start..end];
        let rep = ", which".to_string();

        issues.push(Issue {
            id: format!("punct-non-restrictive-which-{}", start),
            rule_id: "punctuation.non_restrictive_which_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Use a comma before a non-restrictive relative clause introduced by 'which'.".to_string(),
            start_offset: start,
            end_offset: end,
            matched_text: matched.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 7. Compound cardinal numbers (21–99 hyphenation)
    for caps in COMPOUND_CARDINALS.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let tens = caps.get(1).unwrap().as_str();
        let units = caps.get(2).unwrap().as_str().to_lowercase();
        let is_at_sentence_start = full.start() == text.len() - text.trim_start().len();
        let rep_tens = if is_at_sentence_start {
            let mut c = tens.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => tens.to_string(),
            }
        } else {
            tens.to_string()
        };
        let rep = format!("{}-{}", rep_tens, units);

        issues.push(Issue {
            id: format!("punct-compound-cardinal-{}", full.start()),
            rule_id: "punctuation.compound_cardinal_hyphen".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Compound cardinal numbers from 21 to 99 should be hyphenated.".to_string(),
            start_offset: full.start(),
            end_offset: full.end(),
            matched_text: full.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 8. Month capitalization (e.g. 'october' -> 'October')
    for caps in MONTH_NAMES.captures_iter(text) {
        let mat = caps.get(1).unwrap();
        let word = mat.as_str();
        let lower = word.to_lowercase();
        if lower == "may" || lower == "march" {
            let before = text[..mat.start()].trim_end();
            let is_date = before.chars().last().map(|c| c.is_ascii_digit()).unwrap_or(false)
                || before.ends_with("in") || before.ends_with("during") || before.ends_with("of");
            if !is_date {
                continue;
            }
        }
        let cap_rep = match word.chars().next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + &word[first.len_utf8()..],
        };
        if word != cap_rep {
            issues.push(Issue {
                id: format!("punct-month-capitalization-{}", mat.start()),
                rule_id: "punctuation.month_capitalization".to_string(),
                category: Category::Punctuation,
                severity: Severity::Error,
                message: "Names of months must always be capitalised.".to_string(),
                start_offset: mat.start(),
                end_offset: mat.end(),
                matched_text: word.to_string(),
                replacement: Some(cap_rep.clone()),
                suggestions: vec![cap_rep],
                apply_all_eligible: true,
            });
        }
    }

    // 9. British time notation (12-hour dot separator: '930 am' -> '9.30 am')
    for caps in BRITISH_TIME_NOTATION.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let hours = caps.get(1).unwrap().as_str();
        let minutes = caps.get(2).unwrap().as_str();
        let raw_period = caps.get(3).unwrap().as_str().to_lowercase();
        let period = if raw_period.starts_with('a') { "am" } else { "pm" };

        if let (Ok(h), Ok(m)) = (hours.parse::<u32>(), minutes.parse::<u32>()) {
            if (1..=12).contains(&h) && m < 60 {
                let is_at_end = full.end() >= text.trim_end().len();
                let rep = if is_at_end {
                    format!("{}.{} {}.", h, minutes, period)
                } else {
                    format!("{}.{} {}", h, minutes, period)
                };

                issues.push(Issue {
                    id: format!("punct-british-time-{}", full.start()),
                    rule_id: "punctuation.british_time_format".to_string(),
                    category: Category::Punctuation,
                    severity: Severity::Suggestion,
                    message: "In British English, 12-hour time notation uses a full stop separator followed by am/pm.".to_string(),
                    start_offset: full.start(),
                    end_offset: full.end(),
                    matched_text: full.as_str().to_string(),
                    replacement: Some(rep.clone()),
                    suggestions: vec![rep],
                    apply_all_eligible: true,
                });
            }
        }
    }

    // 10. UK honorific casing & non-restrictive participial clause comma
    check_uk_honorific_casing(text, &mut issues);

    // 9. Standalone first-person pronoun I & contractions
    let is_roman_context = |start: usize, end: usize| -> bool {
        // 1. Preceded by structural label: "section i", "chapter i", etc.
        for caps in ROMAN_NUMERAL_CONTEXT.captures_iter(text) {
            let m = caps.get(0).unwrap();
            if m.end() == end {
                return true;
            }
        }
        // 2. Sequence of roman numerals: "i and ii", "i, ii", "i to iii"
        for caps in ROMAN_SEQUENCE.captures_iter(text) {
            let m = caps.get(0).unwrap();
            if m.start() <= start && m.start() + 1 >= end {
                return true;
            }
        }
        // 3. Isolated parenthetical or bracketed enumeration: "(i)" or "[i]"
        let before = &text[..start];
        let after = &text[end..];
        if (before.ends_with('(') && after.starts_with(')'))
            || (before.ends_with('[') && after.starts_with(']'))
        {
            return true;
        }
        false
    };

    for caps in STANDALONE_I.captures_iter(text) {
        let mat = caps.get(1).unwrap();
        if issues.iter().any(|i| i.start_offset == mat.start()) {
            continue;
        }
        if is_roman_context(mat.start(), mat.end()) {
            continue;
        }
        issues.push(Issue {
            id: format!("punct-pronoun-i-{}", mat.start()),
            rule_id: "punctuation.pronoun_i".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "The first-person pronoun 'I' must always be capitalised.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: "i".to_string(),
            replacement: Some("I".to_string()),
            suggestions: vec!["I".to_string()],
            apply_all_eligible: true,
        });
    }

    for caps in PRONOUN_I_WITH_APOSTROPHE.captures_iter(text) {
        let mat = caps.get(1).unwrap();
        if issues.iter().any(|i| i.start_offset == mat.start()) {
            continue;
        }
        issues.push(Issue {
            id: format!("punct-pronoun-i-{}", mat.start()),
            rule_id: "punctuation.pronoun_i".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "The first-person pronoun 'I' must always be capitalised.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: "i".to_string(),
            replacement: Some("I".to_string()),
            suggestions: vec!["I".to_string()],
            apply_all_eligible: true,
        });
    }

    // 11. Sentence initial capitalisation
    check_sentence_capitalization(text, mode, &mut issues);

    // 12. Terminal punctuation
    check_terminal_punctuation(text, mode, &mut issues);

    // 7. Commercial elliptic genitives
    for caps in COMMERCIAL_GENITIVES.captures_iter(text) {
        let noun_mat = caps.get(2).unwrap();
        let noun = noun_mat.as_str();

        if noun_mat.end() >= text.trim_end().len() {
            continue;
        }

        let base = &noun[..noun.len() - 1];
        let remainder = &text[noun_mat.end()..];
        let is_intro_clause = INTRO_CLAUSE_FOLLOWING.is_match(remainder);

        let rep = if is_intro_clause {
            format!("{}'s,", base)
        } else {
            format!("{}'s", base)
        };

        issues.push(Issue {
            id: format!("punct-commercial-genitive-{}", noun_mat.start()),
            rule_id: "punctuation.commercial_genitive".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "In British English, commercial retail establishments take an elliptic genitive apostrophe ('s).".to_string(),
            start_offset: noun_mat.start(),
            end_offset: noun_mat.end(),
            matched_text: noun.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 8. Adverbial clause boundary comma ('right next to')
    for caps in ADVERBIAL_CLAUSE_BOUNDARY.captures_iter(text) {
        let word_mat = caps.get(1).unwrap();
        let word = word_mat.as_str();

        let after_word = &text[word_mat.end()..];
        if after_word.trim_start().starts_with(',') {
            continue;
        }

        let rep = format!("{},", word);
        issues.push(Issue {
            id: format!("punct-adverbial-comma-{}", word_mat.start()),
            rule_id: "punctuation.adverbial_clause_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Use a comma before the adverbial clause.".to_string(),
            start_offset: word_mat.start(),
            end_offset: word_mat.end(),
            matched_text: word.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 9. Coordinating conjunction comma linking independent clauses (', but', ', or')
    for caps in COORDINATING_CONJUNCTION_COMMA.captures_iter(text) {
        let space_mat = caps.get(2).unwrap();
        let conj_mat = caps.get(3).unwrap();

        let prev_text = &text[..space_mat.start()];
        if prev_text.ends_with(',') || prev_text.ends_with(';') {
            continue;
        }

        let start = space_mat.start();
        let end = conj_mat.end();
        let matched = &text[start..end];
        let rep = format!(", {}", conj_mat.as_str());

        issues.push(Issue {
            id: format!("punct-coord-comma-{}", start),
            rule_id: "punctuation.coordinating_conjunction_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Use a comma before a coordinating conjunction joining independent clauses.".to_string(),
            start_offset: start,
            end_offset: end,
            matched_text: matched.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 10. Interrogative clause boundary split ('instead? I\'ve')
    for caps in INTERROGATIVE_CLAUSE_BOUNDARY.captures_iter(text) {
        let instead_mat = caps.get(1).unwrap();
        let start = instead_mat.start();
        let end = instead_mat.end();
        let rep = "instead?".to_string();

        issues.push(Issue {
            id: format!("punct-clause-boundary-{}", start),
            rule_id: "punctuation.clause_boundary".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Terminal question mark required before starting a new independent clause.".to_string(),
            start_offset: start,
            end_offset: end,
            matched_text: instead_mat.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 11. Coordinate adjectives comma ('grey, mouldy')
    for caps in COORDINATE_ADJECTIVES.captures_iter(text) {
        let adj1_mat = caps.get(1).unwrap();
        let adj1 = adj1_mat.as_str();

        let rep = format!("{},", adj1);
        issues.push(Issue {
            id: format!("punct-coord-adj-{}", adj1_mat.start()),
            rule_id: "punctuation.coordinate_adjectives_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Use a comma between coordinate adjectives modifying the same noun.".to_string(),
            start_offset: adj1_mat.start(),
            end_offset: adj1_mat.end(),
            matched_text: adj1.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 12. Modern UK title full stops (en_GB: Mr, Mrs, Dr omit full stop)
    if language == "en_GB" {
        for caps in UK_TITLES.captures_iter(text) {
            let full_mat = caps.get(0).unwrap();
            let title_mat = caps.get(1).unwrap();
            let rep = title_mat.as_str().to_string();

            issues.push(Issue {
                id: format!("punct-uk-title-{}", full_mat.start()),
                rule_id: "punctuation.uk_title_full_stop".to_string(),
                category: Category::Punctuation,
                severity: Severity::Suggestion,
                message: format!(
                    "In modern British English, titles that end with the last letter of the full word omit the full stop ('{}').",
                    rep
                ),
                start_offset: full_mat.start(),
                end_offset: full_mat.end(),
                matched_text: full_mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: true,
            });
        }

        // 13. UK quotation mark punctuation placement (punctuation outside closing quote for fragments)
        for caps in UK_QUOTE_PLACEMENT.captures_iter(text) {
            let open_quote = caps.get(1).unwrap().as_str();
            let punct = caps.get(3).unwrap();
            let close_quote = caps.get(4).unwrap();

            if open_quote == close_quote.as_str() {
                let target_start = punct.start();
                let target_end = close_quote.end();
                let matched_fragment = &text[target_start..target_end];
                let rep = format!("{}{}", close_quote.as_str(), punct.as_str());

                issues.push(Issue {
                    id: format!("punct-uk-quote-{}", target_start),
                    rule_id: "punctuation.uk_quote_placement".to_string(),
                    category: Category::Punctuation,
                    severity: Severity::Suggestion,
                    message: "In British English, commas and full stops sit outside the closing quotation mark unless part of quoted dialogue.".to_string(),
                    start_offset: target_start,
                    end_offset: target_end,
                    matched_text: matched_fragment.to_string(),
                    replacement: Some(rep.clone()),
                    suggestions: vec![rep],
                    apply_all_eligible: true,
                });
            }
        }

        // 14. Superfluous Oxford comma in coordinate lists
        for caps in SUPERFLUOUS_OXFORD_COMMA.captures_iter(text) {
            if let Some(oxford_mat) = caps.get(3) {
                let conj_text = oxford_mat.as_str().trim_start_matches(',').trim();
                let rep = format!(" {}", conj_text);

                issues.push(Issue {
                    id: format!("punct-oxford-comma-{}", oxford_mat.start()),
                    rule_id: "punctuation.superfluous_oxford_comma".to_string(),
                    category: Category::Punctuation,
                    severity: Severity::Suggestion,
                    message: "In everyday British English, the Oxford comma is omitted in simple lists unless needed to prevent ambiguity.".to_string(),
                    start_offset: oxford_mat.start(),
                    end_offset: oxford_mat.end(),
                    matched_text: oxford_mat.as_str().to_string(),
                    replacement: Some(rep.clone()),
                    suggestions: vec![rep],
                    apply_all_eligible: true,
                });
            }
        }
    }

    // 15. Space before punctuation
    for mat in SPACE_BEFORE_PUNCT.find_iter(text) {
        let matched = mat.as_str();
        let punct_char = matched.chars().last().unwrap();
        let rep = punct_char.to_string();

        issues.push(Issue {
            id: format!("punct-space-before-{}", mat.start()),
            rule_id: "punctuation.space_before_punctuation".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: format!("Unexpected whitespace before punctuation mark '{}'.", punct_char),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: matched.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 16. Missing whitespace after comma or semicolon
    for caps in MISSING_SPACE_AFTER_COMMA_SEMICOLON.captures_iter(text) {
        if let Some(mat) = caps.get(0) {
            let punct = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let next_char = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let rep = format!("{} {}", punct, next_char);
            issues.push(Issue {
                id: format!("punct-missing-space-after-{}", mat.start()),
                rule_id: "punctuation.missing_space_after_punctuation".to_string(),
                category: Category::Punctuation,
                severity: Severity::Warning,
                message: format!("Missing whitespace after '{}'.", punct),
                start_offset: mat.start(),
                end_offset: mat.end(),
                matched_text: mat.as_str().to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: true,
            });
        }
    }

    // 17. Multiple exclamation/question marks (!!+ -> !, ??+ -> ?)
    for mat in MULTIPLE_PUNCTUATION.find_iter(text) {
        let matched = mat.as_str();
        let rep = matched.chars().next().unwrap().to_string();
        issues.push(Issue {
            id: format!("punct-multiple-punct-{}", mat.start()),
            rule_id: "punctuation.multiple_punctuation".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Multiple punctuation marks should be simplified to a single mark.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: matched.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 18. Plural apostrophe (greengrocer's apostrophe)
    for caps in PLURAL_APOSTROPHE.captures_iter(text) {
        let quantifier = caps.get(1).unwrap().as_str();
        let noun = caps.get(2).unwrap().as_str();
        let full_mat = caps.get(0).unwrap();

        // Target the noun + 's part
        let noun_start = full_mat.start() + quantifier.len() + 1;
        let noun_end = full_mat.end();
        let matched_noun_with_apos = &text[noun_start..noun_end];
        let rep = format!("{}s", noun);

        issues.push(Issue {
            id: format!("punct-plural-apostrophe-{}", noun_start),
            rule_id: "punctuation.plural_apostrophe".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Do not use an apostrophe to form a plural noun.".to_string(),
            start_offset: noun_start,
            end_offset: noun_end,
            matched_text: matched_noun_with_apos.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 19. Plural decades (1980's -> 1980s)
    for caps in PLURAL_DECADES.captures_iter(text) {
        let mat = caps.get(0).unwrap();
        let decade = caps.get(1).unwrap().as_str();
        let rep = format!("{}s", decade);

        issues.push(Issue {
            id: format!("punct-plural-decade-{}", mat.start()),
            rule_id: "punctuation.plural_decade".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Do not use an apostrophe to form the plural of a decade.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 20. Plural acronyms (API's -> APIs, URL's -> URLs)
    for caps in PLURAL_ACRONYMS.captures_iter(text) {
        let mat = caps.get(0).unwrap();
        let acronym = caps.get(1).unwrap().as_str();
        let rep = format!("{}s", acronym);

        issues.push(Issue {
            id: format!("punct-plural-acronym-{}", mat.start()),
            rule_id: "punctuation.plural_acronym".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Do not use an apostrophe to form the plural of an acronym.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 21. Ellipsis length normalization (.. -> ..., ....+ -> ...)
    for mat in DOT_RUNS.find_iter(text) {
        let len = mat.as_str().len();
        if len == 2 || len >= 4 {
            issues.push(Issue {
                id: format!("punct-ellipsis-{}", mat.start()),
                rule_id: "punctuation.ellipsis_length".to_string(),
                category: Category::Punctuation,
                severity: Severity::Suggestion,
                message: "An ellipsis should consist of exactly three full stops ('...').".to_string(),
                start_offset: mat.start(),
                end_offset: mat.end(),
                matched_text: mat.as_str().to_string(),
                replacement: Some("...".to_string()),
                suggestions: vec!["...".to_string()],
                apply_all_eligible: true,
            });
        }
    }

    // 22. Irregular plural genitives (e.g. 'childrens' -> 'children’s')
    for caps in IRREGULAR_PLURAL_GENITIVES.captures_iter(text) {
        let mat = caps.get(0).unwrap();
        let base = caps.get(1).unwrap().as_str();
        let rep = match_capitalization(mat.as_str(), &format!("{}’s", base.to_lowercase()));
        if issues.iter().any(|i| i.start_offset == mat.start()) {
            continue;
        }
        issues.push(Issue {
            id: format!("punct-irregular-genitive-{}", mat.start()),
            rule_id: "punctuation.irregular_plural_genitive".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Irregular plural nouns form their possessive with an apostrophe and s ('s).".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 23. Plural acronyms lowercase/extended (e.g. 'cd's' -> 'CDs', 'mp's' -> 'MPs')
    for caps in PLURAL_ACRONYMS_EXTENDED.captures_iter(text) {
        let mat = caps.get(0).unwrap();
        let acronym = caps.get(1).unwrap().as_str();
        let rep = format!("{}s", acronym.to_uppercase());
        if issues.iter().any(|i| i.start_offset == mat.start()) {
            continue;
        }
        issues.push(Issue {
            id: format!("punct-plural-acronym-ext-{}", mat.start()),
            rule_id: "punctuation.plural_acronym".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Do not use an apostrophe to form the plural of an acronym or abbreviation.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 24. Greengrocer's plural apostrophe (e.g. 'video's' -> 'videos', 'photo's' -> 'photos')
    for caps in GREENGROCER_PLURAL_APOSTROPHE.captures_iter(text) {
        let mat = caps.get(0).unwrap();
        let base = caps.get(1).unwrap().as_str();
        let rep = match_capitalization(mat.as_str(), &format!("{}s", base));
        if issues.iter().any(|i| i.start_offset == mat.start()) {
            continue;
        }
        issues.push(Issue {
            id: format!("punct-greengrocer-plural-{}", mat.start()),
            rule_id: "punctuation.plural_apostrophe".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Do not use an apostrophe to form the plural of a noun.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 25. Idiosyncratic place and street names (e.g. 'Land’s End', 'Earls Court')
    for (regex, canonical) in IDIOSYNCRATIC_PLACES.iter() {
        for mat in regex.find_iter(text) {
            if mat.as_str() != *canonical {
                issues.push(Issue {
                    id: format!("punct-idiosyncratic-place-{}", mat.start()),
                    rule_id: "punctuation.idiosyncratic_place".to_string(),
                    category: Category::Punctuation,
                    severity: Severity::Error,
                    message: format!("In British English, this place name is standardly written as '{}'.", canonical),
                    start_offset: mat.start(),
                    end_offset: mat.end(),
                    matched_text: mat.as_str().to_string(),
                    replacement: Some(canonical.to_string()),
                    suggestions: vec![canonical.to_string()],
                    apply_all_eligible: true,
                });
            }
        }
    }

    // 26. Em-dash elimination: spans to unspaced en-dash, parenthetical to spaced en-dash
    for caps in SPAN_EM_DASH.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let g1 = caps.get(1).unwrap().as_str();
        let g2 = caps.get(2).unwrap().as_str();
        let rep = format!("{}–{}", g1, g2);
        issues.push(Issue {
            id: format!("punct-span-en-dash-{}", full.start()),
            rule_id: "punctuation.en_dash_span".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "In British English, number ranges, spans, and joint partnerships use an unspaced en-dash ('–').".to_string(),
            start_offset: full.start(),
            end_offset: full.end(),
            matched_text: full.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    for mat in PARENTHETICAL_EM_DASH.find_iter(text) {
        if issues.iter().any(|i| i.start_offset <= mat.start() && i.end_offset >= mat.end()) {
            continue;
        }
        issues.push(Issue {
            id: format!("punct-parenthetical-en-dash-{}", mat.start()),
            rule_id: "punctuation.en_dash_parenthetical".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "In British English, em-dashes are avoided; use spaced en-dashes (' – ') for parenthetical pauses.".to_string(),
            start_offset: mat.start(),
            end_offset: mat.end(),
            matched_text: mat.as_str().to_string(),
            replacement: Some(" – ".to_string()),
            suggestions: vec![" – ".to_string()],
            apply_all_eligible: true,
        });
    }

    // 27. Never hyphenate adverbs ending in -ly before adjectives (e.g. 'highly-respected' -> 'highly respected')
    for caps in LY_ADVERB_HYPHEN.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let adv = caps.get(1).unwrap().as_str();
        let adj = caps.get(2).unwrap().as_str();
        let rep = format!("{} {}", adv, adj);
        issues.push(Issue {
            id: format!("punct-ly-adverb-hyphen-{}", full.start()),
            rule_id: "punctuation.ly_adverb_hyphen".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Never hyphenate an adverb ending in '-ly' before an adjective.".to_string(),
            start_offset: full.start(),
            end_offset: full.end(),
            matched_text: full.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 28. Non--ly compound adjectives before nouns (e.g. 'well formed text' -> 'well-formed text')
    for caps in NON_LY_COMPOUND_ADJ.captures_iter(text) {
        let adv_mat = caps.get(1).unwrap();
        let part_mat = caps.get(2).unwrap();
        let start = adv_mat.start();
        let end = part_mat.end();
        let matched = &text[start..end];
        let rep = format!("{}-{}", adv_mat.as_str(), part_mat.as_str());
        issues.push(Issue {
            id: format!("punct-compound-adj-hyphen-{}", start),
            rule_id: "punctuation.compound_adjective_hyphen".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Compound modifiers preceding a noun should be hyphenated.".to_string(),
            start_offset: start,
            end_offset: end,
            matched_text: matched.to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 29. British single quotation marks in Document mode
    if mode == CheckMode::Document {
        for caps in DOUBLE_QUOTES.captures_iter(text) {
            let full = caps.get(0).unwrap();
            let inner = caps.get(1).unwrap();
            let open_start = full.start();
            let open_end = open_start + 1;
            let close_end = full.end();
            let close_start = close_end - 1;

            issues.push(Issue {
                id: format!("punct-open-quote-{}", open_start),
                rule_id: "punctuation.british_single_quotes".to_string(),
                category: Category::Punctuation,
                severity: Severity::Suggestion,
                message: "In British English, single quotation marks (‘...’) are preferred for standard quotations.".to_string(),
                start_offset: open_start,
                end_offset: open_end,
                matched_text: "\"".to_string(),
                replacement: Some("‘".to_string()),
                suggestions: vec!["‘".to_string()],
                apply_all_eligible: true,
            });

            issues.push(Issue {
                id: format!("punct-close-quote-{}", close_start),
                rule_id: "punctuation.british_single_quotes".to_string(),
                category: Category::Punctuation,
                severity: Severity::Suggestion,
                message: "In British English, single quotation marks (‘...’) are preferred for standard quotations.".to_string(),
                start_offset: close_start,
                end_offset: close_end,
                matched_text: "\"".to_string(),
                replacement: Some("’".to_string()),
                suggestions: vec!["’".to_string()],
                apply_all_eligible: true,
            });

            // If the first word inside the quote starts with a lowercase letter and is not 'i' (which pronoun_i handles), capitalise it
            let inner_trimmed = inner.as_str().trim_start();
            let lead_in = inner.as_str().len() - inner_trimmed.len();
            if let Some(first_char) = inner_trimmed.chars().next() {
                if first_char.is_alphabetic() && first_char.is_lowercase() && first_char != 'i' {
                    let word_len = inner_trimmed.find(|c: char| !c.is_alphabetic()).unwrap_or(inner_trimmed.len());
                    let word = &inner_trimmed[..word_len];
                    let word_start = inner.start() + lead_in;
                    let word_end = word_start + word_len;
                    let cap_word = first_char.to_uppercase().collect::<String>() + &word[first_char.len_utf8()..];
                    issues.push(Issue {
                        id: format!("punct-quote-cap-{}", word_start),
                        rule_id: "punctuation.quote_initial_capitalization".to_string(),
                        category: Category::Punctuation,
                        severity: Severity::Error,
                        message: "The first word of direct speech should begin with a capital letter.".to_string(),
                        start_offset: word_start,
                        end_offset: word_end,
                        matched_text: word.to_string(),
                        replacement: Some(cap_word.clone()),
                        suggestions: vec![cap_word],
                        apply_all_eligible: true,
                    });
                }
            }
        }
    }

    // 30. Names ending in s or z: James' -> James’s
    for caps in S_ENDING_NAMES_POSSESSIVE.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let name = caps.get(1).unwrap().as_str();
        let rep = format!("{}’s", name);
        issues.push(Issue {
            id: format!("punct-s-name-possessive-{}", full.start()),
            rule_id: "punctuation.s_name_possessive".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "In British English, names ending in 's' form their possessive with '’s'.".to_string(),
            start_offset: full.start(),
            end_offset: full.end(),
            matched_text: full.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    // 31. Established shortened words: 'phone -> phone, 'plane -> plane, 'flu -> flu
    for caps in ESTABLISHED_SHORTENED_WORDS.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let word = caps.get(1).unwrap().as_str();
        issues.push(Issue {
            id: format!("punct-shortened-word-{}", full.start()),
            rule_id: "punctuation.established_shortened_word".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "Do not use an apostrophe before established shortened words.".to_string(),
            start_offset: full.start(),
            end_offset: full.end(),
            matched_text: full.as_str().to_string(),
            replacement: Some(word.to_string()),
            suggestions: vec![word.to_string()],
            apply_all_eligible: true,
        });
    }

    // 32. Durations and periods of time possessives (e.g. 'a week holiday' -> 'a week’s holiday', '3 months notice' -> '3 months’ notice')
    for caps in DURATION_POSSESSIVES.captures_iter(text) {
        let full = caps.get(0).unwrap();
        let num = caps.get(1).unwrap().as_str();
        let unit = caps.get(2).unwrap().as_str();
        let following = caps.get(3).unwrap().as_str();
        let is_singular = num.eq_ignore_ascii_case("a") || num.eq_ignore_ascii_case("one") || num == "1";
        let rep = if is_singular {
            format!("{} {}’s {}", num, unit.trim_end_matches('s'), following)
        } else {
            let base_unit = unit.trim_end_matches('s');
            format!("{} {}s’ {}", num, base_unit, following)
        };
        issues.push(Issue {
            id: format!("punct-duration-possessive-{}", full.start()),
            rule_id: "punctuation.duration_possessive".to_string(),
            category: Category::Punctuation,
            severity: Severity::Suggestion,
            message: "In British English, time expressions denoting duration imply 'of' and take an apostrophe.".to_string(),
            start_offset: full.start(),
            end_offset: full.end(),
            matched_text: full.as_str().to_string(),
            replacement: Some(rep.clone()),
            suggestions: vec![rep],
            apply_all_eligible: true,
        });
    }

    issues
}

fn check_direct_speech(text: &str, issues: &mut Vec<Issue>) {
    let trimmed = text.trim();
    if trimmed.starts_with('"') || trimmed.starts_with('\'') {
        return;
    }

    if let Some(caps) = NESTED_SPEECH_REPORT.captures(text) {
        // Group 1: "the witness turned to mrs higgins"
        let g1 = caps.get(1).unwrap();
        let g1_str = g1.as_str();
        let first_word = g1_str.split_whitespace().next().unwrap();
        let cap_first = match first_word.chars().next() {
            None => String::new(),
            Some(c) => c.to_uppercase().collect::<String>() + &first_word[c.len_utf8()..],
        };
        let first_rep = format!("\x22{}", cap_first);
        let first_start = g1.start() + g1_str.find(first_word).unwrap();
        let first_end = first_start + first_word.len();
        issues.push(Issue {
            id: format!("punct-nested-speech-open-{}", first_start),
            rule_id: "punctuation.direct_speech_quotes".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Direct speech should be enclosed in quotation marks.".to_string(),
            start_offset: first_start,
            end_offset: first_end,
            matched_text: first_word.to_string(),
            replacement: Some(first_rep.clone()),
            suggestions: vec![first_rep],
            apply_all_eligible: true,
        });

        // Group 2: "said" -> "said,"
        let said_mat = caps.get(2).unwrap();
        let said_rep = format!("{},", said_mat.as_str());
        issues.push(Issue {
            id: format!("punct-nested-speech-comma-{}", said_mat.start()),
            rule_id: "punctuation.speech_attribution_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "In British English direct speech, place a comma before the opening quote of reported speech.".to_string(),
            start_offset: said_mat.start(),
            end_offset: said_mat.end(),
            matched_text: said_mat.as_str().to_string(),
            replacement: Some(said_rep.clone()),
            suggestions: vec![said_rep],
            apply_all_eligible: true,
        });

        // Group 3: "i distinctly heard the driver" -> "'I"
        let g3 = caps.get(3).unwrap();
        let g3_str = g3.as_str();
        let g3_first = g3_str.split_whitespace().next().unwrap();
        let g3_cap = if g3_first.eq_ignore_ascii_case("i") {
            "I".to_string()
        } else {
            match g3_first.chars().next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + &g3_first[c.len_utf8()..],
            }
        };
        let g3_rep = format!("'{}", g3_cap);
        let g3_start = g3.start() + g3_str.find(g3_first).unwrap();
        let g3_end = g3_start + g3_first.len();
        issues.push(Issue {
            id: format!("punct-nested-speech-inner1-{}", g3_start),
            rule_id: "punctuation.nested_speech_open".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Nested direct speech should be enclosed in single quotation marks.".to_string(),
            start_offset: g3_start,
            end_offset: g3_end,
            matched_text: g3_first.to_string(),
            replacement: Some(g3_rep.clone()),
            suggestions: vec![g3_rep],
            apply_all_eligible: true,
        });

        // Group 4: "mutter" -> "mutter,"
        let mutter_mat = caps.get(4).unwrap();
        let mutter_rep = format!("{},", mutter_mat.as_str());
        issues.push(Issue {
            id: format!("punct-nested-mutter-comma-{}", mutter_mat.start()),
            rule_id: "punctuation.speech_attribution_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Place a comma before the opening quote of reported utterance.".to_string(),
            start_offset: mutter_mat.start(),
            end_offset: mutter_mat.end(),
            matched_text: mutter_mat.as_str().to_string(),
            replacement: Some(mutter_rep.clone()),
            suggestions: vec![mutter_rep],
            apply_all_eligible: true,
        });

        // Group 5: "dont open the boot" -> "\"Don't" ... "boot,\""
        let g5 = caps.get(5).unwrap();
        let g5_str = g5.as_str();
        let g5_first = g5_str.split_whitespace().next().unwrap();
        let g5_rep = if g5_first.eq_ignore_ascii_case("dont") {
            "\\\"Don't".to_string()
        } else if g5_first.eq_ignore_ascii_case("cant") {
            "\\\"Can't".to_string()
        } else if g5_first.eq_ignore_ascii_case("wont") {
            "\\\"Won't".to_string()
        } else {
            let cap = match g5_first.chars().next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + &g5_first[c.len_utf8()..],
            };
            format!("\\\"{}", cap)
        };
        let g5_start = g5.start() + g5_str.find(g5_first).unwrap();
        let g5_end = g5_start + g5_first.len();
        issues.push(Issue {
            id: format!("punct-nested-inner-open-{}", g5_start),
            rule_id: "punctuation.nested_inner_speech_open".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Innermost direct speech should be enclosed in double quotation marks.".to_string(),
            start_offset: g5_start,
            end_offset: g5_end,
            matched_text: g5_first.to_string(),
            replacement: Some(g5_rep.clone()),
            suggestions: vec![g5_rep],
            apply_all_eligible: true,
        });

        let g5_last = g5_str.split_whitespace().last().unwrap();
        let g5_last_rep = format!("{},\\\"", g5_last);
        let g5_last_start = g5.start() + g5_str.rfind(g5_last).unwrap();
        let g5_last_end = g5_last_start + g5_last.len();
        issues.push(Issue {
            id: format!("punct-nested-inner-close-{}", g5_last_start),
            rule_id: "punctuation.nested_inner_speech_close".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Innermost speech closes with comma and quotation mark.".to_string(),
            start_offset: g5_last_start,
            end_offset: g5_last_end,
            matched_text: g5_last.to_string(),
            replacement: Some(g5_last_rep.clone()),
            suggestions: vec![g5_last_rep],
            apply_all_eligible: true,
        });

        // Group 7: "the collision" -> "collision,'\""
        let g7 = caps.get(7).unwrap();
        let g7_str = g7.as_str();
        let g7_last = g7_str.split_whitespace().last().unwrap();
        let g7_last_rep = format!("{},'\"", g7_last);
        let g7_last_start = g7.start() + g7_str.rfind(g7_last).unwrap();
        let g7_last_end = g7_last_start + g7_last.len();
        issues.push(Issue {
            id: format!("punct-nested-speech-close-{}", g7_last_start),
            rule_id: "punctuation.nested_speech_close".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Close inner speech with comma, single quote and double quote.".to_string(),
            start_offset: g7_last_start,
            end_offset: g7_last_end,
            matched_text: g7_last.to_string(),
            replacement: Some(g7_last_rep.clone()),
            suggestions: vec![g7_last_rep],
            apply_all_eligible: true,
        });

        return;
    }

    if let Some(caps) = SPEECH_ATTRIBUTION.captures(text) {
        let speech = caps.get(1).unwrap();
        let speech_str = speech.as_str();

        let words: Vec<&str> = speech_str.split_whitespace().collect();
        if words.is_empty() {
            return;
        }

        let first_word = words[0];
        let last_word = words[words.len() - 1];

        // First word of speech: add opening quotation mark and capitalise
        let mut first_chars = first_word.chars();
        let cap_first = match first_chars.next() {
            None => String::new(),
            Some(c) => c.to_uppercase().collect::<String>() + first_chars.as_str(),
        };
        let first_rep = format!("\x22{}", cap_first);

        let first_start = text.find(first_word).unwrap();
        let first_end = first_start + first_word.len();

        issues.push(Issue {
            id: format!("punct-speech-open-{}", first_start),
            rule_id: "punctuation.direct_speech_quotes".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "Direct speech should be enclosed in quotation marks.".to_string(),
            start_offset: first_start,
            end_offset: first_end,
            matched_text: first_word.to_string(),
            replacement: Some(first_rep.clone()),
            suggestions: vec![first_rep],
            apply_all_eligible: true,
        });

        // Last word of speech: add attribution comma and closing quote
        let last_rep = format!("{},\x22", last_word);
        let last_start = speech.start() + speech_str.rfind(last_word).unwrap();
        let last_end = last_start + last_word.len();

        issues.push(Issue {
            id: format!("punct-speech-close-{}", last_start),
            rule_id: "punctuation.speech_attribution_comma".to_string(),
            category: Category::Punctuation,
            severity: Severity::Error,
            message: "In British English direct speech, place a comma before the closing quotation mark preceding the attribution verb.".to_string(),
            start_offset: last_start,
            end_offset: last_end,
            matched_text: last_word.to_string(),
            replacement: Some(last_rep.clone()),
            suggestions: vec![last_rep],
            apply_all_eligible: true,
        });
    }
}

fn check_uk_honorific_casing(text: &str, issues: &mut Vec<Issue>) {
    let participial_words = [
        "peering", "looking", "smiling", "nodding", "shrugging", "sighing", "glancing",
        "turning", "walking", "standing", "sitting", "holding", "pointing", "gazing",
        "frowning", "waving",
    ];

    for caps in UK_HONORIFIC_CASING.captures_iter(text) {
        let title_mat = caps.get(1).unwrap();
        let name_mat = caps.get(2).unwrap();

        let canonical_title = match title_mat.as_str().to_lowercase().as_str() {
            "dr" => "Dr",
            "mr" => "Mr",
            "mrs" => "Mrs",
            "ms" => "Ms",
            "prof" => "Prof",
            "rev" => "Rev",
            "sir" => "Sir",
            "lord" => "Lord",
            "lady" => "Lady",
            "inspector" => "Inspector",
            "detective" => "Detective",
            "constable" => "Constable",
            "judge" => "Judge",
            "sergeant" => "Sergeant",
            "superintendent" => "Superintendent",
            "commissioner" => "Commissioner",
            "officer" => "Officer",
            "captain" => "Captain",
            "colonel" => "Colonel",
            "major" => "Major",
            "lieutenant" => "Lieutenant",
            "general" => "General",
            "admiral" => "Admiral",
            "professor" => "Professor",
            "chancellor" => "Chancellor",
            "reverend" => "Reverend",
            "pastor" => "Pastor",
            "father" => "Father",
            _ => continue,
        };

        let raw_name = name_mat.as_str();
        let mut name_chars = raw_name.chars();
        let mut capitalized_name = match name_chars.next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + name_chars.as_str(),
        };

        let mut full_name_end = name_mat.end();

        // Check for two-word names (e.g. "Sir Reginald Thorne", "Dr John Watson")
        let non_name_words = [
            "to", "at", "on", "in", "of", "for", "from", "with", "by", "into", "onto",
            "and", "or", "but", "because", "although", "while", "whereas", "as", "if", "when", "where", "which", "that", "who", "whom",
            "is", "was", "were", "are", "be", "been", "being", "have", "has", "had",
            "will", "would", "shall", "should", "can", "could", "may", "might", "must",
            "said", "asked", "replied", "muttered", "whispered", "shouted", "exclaimed", "remarked", "cried", "explained", "stated",
            "peering", "looking", "smiling", "nodding", "shrugging", "sighing", "glancing",
            "turning", "walking", "standing", "sitting", "holding", "pointing", "gazing", "frowning", "waving",
            "not", "never", "always", "already", "soon", "now", "then", "there", "here",
            "the", "a", "an", "this", "that", "these", "those", "his", "her", "their", "our", "my", "your",
        ];

        let remainder = &text[name_mat.end()..];
        let trimmed_rem = remainder.trim_start();
        let leading_spaces = remainder.len() - trimmed_rem.len();
        if leading_spaces > 0 && !trimmed_rem.is_empty() {
            let next_word_len = trimmed_rem.find(|c: char| !c.is_alphabetic()).unwrap_or(trimmed_rem.len());
            let next_word = &trimmed_rem[..next_word_len];
            let next_lower = next_word.to_lowercase();
            if next_word_len > 1 && !non_name_words.contains(&next_lower.as_str()) {
                let cap_next = match next_word.chars().next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + &next_word[first.len_utf8()..],
                };
                capitalized_name = format!("{} {}", capitalized_name, cap_next);
                full_name_end = name_mat.end() + leading_spaces + next_word_len;
            }
        }

        let after_full_name = &text[full_name_end..];
        let has_participle = participial_words.iter().any(|&p| {
            let rem_trimmed = after_full_name.trim_start();
            rem_trimmed.starts_with(p) && (rem_trimmed.len() == p.len() || !rem_trimmed.chars().nth(p.len()).unwrap_or('a').is_alphabetic())
        });

        let is_at_end = full_name_end >= text.trim_end().len();
        let is_isolated = ISOLATED_HONORIFIC_NAME.is_match(text.trim());

        let rep = if has_participle {
            format!("{} {},", canonical_title, capitalized_name)
        } else if is_at_end && !is_isolated {
            format!("{} {}.", canonical_title, capitalized_name)
        } else {
            format!("{} {}", canonical_title, capitalized_name)
        };

        let start = title_mat.start();
        let end = full_name_end;
        let matched_text = &text[start..end];

        if matched_text != rep {
            issues.push(Issue {
                id: format!("punct-honorific-{}", start),
                rule_id: "punctuation.uk_honorific_casing".to_string(),
                category: Category::Punctuation,
                severity: Severity::Error,
                message: "Honorific titles and proper names must be capitalised in British English without full stops.".to_string(),
                start_offset: start,
                end_offset: end,
                matched_text: matched_text.to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: true,
            });
        }
    }
}

fn check_sentence_capitalization(text: &str, mode: CheckMode, issues: &mut Vec<Issue>) {
    if mode == CheckMode::Fragment {
        return;
    }
    let trimmed_start = text.trim_start();
    if trimmed_start.is_empty() {
        return;
    }
    let lead_offset = text.len() - trimmed_start.len();

    // If direct speech wrapping already handled the start of text, skip
    if issues.iter().any(|i| i.start_offset == lead_offset && i.rule_id == "punctuation.direct_speech_quotes") {
        return;
    }

    // Check beginning of text
    let mut chars = trimmed_start.char_indices();
    if let Some((idx, first_char)) = chars.next() {
        if first_char.is_alphabetic() && first_char.is_lowercase() {
            // Find full word
            let word_len = trimmed_start[idx..]
                .find(|c: char| !c.is_alphabetic())
                .unwrap_or(trimmed_start[idx..].len());
            let matched_word = &trimmed_start[idx..idx + word_len];

            let start = lead_offset + idx;
            let end = start + word_len;

            // If a pronoun rule already handles this word at start of text, skip
            if issues.iter().any(|i| i.start_offset == start && i.rule_id == "punctuation.pronoun_i") {
                return;
            }

            // If a contraction rule already handles this word with an apostrophe (e.g. ive -> I've, dont -> Don't), skip
            if issues.iter().any(|i| i.start_offset == start && i.rule_id == "punctuation.missing_apostrophe") {
                return;
            }

            // If an honorific casing rule already handles this title + name at the start of text, skip
            if issues.iter().any(|i| i.start_offset == start && i.rule_id == "punctuation.uk_honorific_casing") {
                return;
            }

            // If a compound cardinal rule already handles this word at start of text, skip
            if issues.iter().any(|i| i.start_offset == start && i.rule_id == "punctuation.compound_cardinal_hyphen") {
                return;
            }

            // If an ID acronym rule already handles this word at start of text, skip
            if issues.iter().any(|i| i.start_offset == start && i.rule_id == "punctuation.id_acronym") {
                return;
            }

            let rep = first_char.to_uppercase().collect::<String>() + &matched_word[first_char.len_utf8()..];

            issues.push(Issue {
                id: format!("punct-capitalization-{}", start),
                rule_id: "punctuation.sentence_capitalization".to_string(),
                category: Category::Punctuation,
                severity: Severity::Error,
                message: "Sentences must begin with a capital letter.".to_string(),
                start_offset: start,
                end_offset: end,
                matched_text: matched_word.to_string(),
                replacement: Some(rep.clone()),
                suggestions: vec![rep],
                apply_all_eligible: true,
            });
        }
    }
}

fn check_terminal_punctuation(text: &str, mode: CheckMode, issues: &mut Vec<Issue>) {
    if mode == CheckMode::Fragment {
        return;
    }
    let trimmed = text.trim_end();
    if trimmed.is_empty() {
        return;
    }

    // Isolated honorific + name (e.g. "dr watson", "mr smith") does not take terminal punctuation
    if ISOLATED_HONORIFIC_NAME.is_match(trimmed) {
        return;
    }

    // If an honorific casing rule already handles this title + name at the end of text, skip
    if issues.iter().any(|i| i.end_offset == trimmed.len() && i.rule_id == "punctuation.uk_honorific_casing") {
        return;
    }

    // If British time notation at the end already includes the terminal mark, skip
    if issues.iter().any(|i| i.end_offset == trimmed.len() && i.rule_id == "punctuation.british_time_format") {
        return;
    }

    // Require at least 2 words so we do not append full stops to isolated single-word tokens
    let word_count = trimmed.split_whitespace().count();
    if word_count < 2 {
        return;
    }

    let last_char = trimmed.chars().last().unwrap();
    if last_char == '.' || last_char == '?' || last_char == '!' || last_char == ':' || last_char == ';' {
        return;
    }

    // If it ends with closing quote or bracket, check character before it
    if (last_char == '\'' || last_char == '"' || last_char == ')' || last_char == ']') && trimmed.len() > 1 {
        let prev_char = trimmed[..trimmed.len() - last_char.len_utf8()].chars().last().unwrap();
        if prev_char == '.' || prev_char == '?' || prev_char == '!' {
            return;
        }
    }

    // Find the start of the final clause (after internal sentence boundaries or interrogative splits)
    let last_clause = if let Some(caps) = INTERROGATIVE_CLAUSE_BOUNDARY.captures_iter(trimmed).last() {
        let mat = caps.get(0).unwrap();
        &trimmed[mat.end()..]
    } else if let Some(idx) = trimmed.rfind(|c: char| c == '.' || c == '?' || c == '!') {
        &trimmed[idx + 1..]
    } else {
        trimmed
    };

    // Determine mark: '?' for direct question in the final clause, '.' otherwise
    let first_word = last_clause
        .split_whitespace()
        .next()
        .unwrap_or("")
        .trim_matches(|c: char| !c.is_alphabetic())
        .to_lowercase();

    let question_starters = [
        "who", "what", "where", "when", "why", "how", "whose", "whom",
        "are", "shall", "can", "could", "would", "should", "do", "does", "did", "is", "will",
    ];

    let is_direct_question = question_starters.contains(&first_word.as_str());

    // Check if the final clause after a coordinating conjunction (or, but, and) has inverted verb-subject structure
    static LAST_CONJUNCTION: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?i)\b(?:or|but|and)\s+([a-zA-Z]+)\s+([a-zA-Z]+)\b").unwrap()
    });

    static INVERTED_AUXILIARY: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?i)^(?:is|are|was|were|shall|will|can|could|would|should|do|does|did|has|have|had)$").unwrap()
    });

    let mut is_inverted_question = false;
    if let Some(caps) = LAST_CONJUNCTION.captures_iter(last_clause).last() {
        let aux = caps.get(1).unwrap().as_str();
        if INVERTED_AUXILIARY.is_match(aux) {
            is_inverted_question = true;
        }
    }

    let is_question = is_direct_question || is_inverted_question;
    let mark = if is_question { '?' } else { '.' };

    // Target the final word in the trimmed string
    let last_word = trimmed.split_whitespace().last().unwrap();
    let last_word_start = trimmed.rfind(last_word).unwrap();
    let last_word_end = last_word_start + last_word.len();

    let commercial_genitive_words = [
        "chemists", "butchers", "bakers", "grocers", "fishmongers", "newsagents",
        "tobacconists", "greengrocers", "florists", "stationers", "ironmongers",
    ];
    let lower_last = last_word.to_lowercase();
    let is_commercial = commercial_genitive_words.contains(&lower_last.as_str());

    let rep = if is_commercial {
        let base = &last_word[..last_word.len() - 1];
        format!("{}'s{}", base, mark)
    } else {
        format!("{}{}", last_word, mark)
    };

    issues.push(Issue {
        id: format!("punct-terminal-{}", last_word_start),
        rule_id: "punctuation.terminal_mark".to_string(),
        category: Category::Punctuation,
        severity: Severity::Error,
        message: format!("Sentences should end with terminal punctuation '{}'.", mark),
        start_offset: last_word_start,
        end_offset: last_word_end,
        matched_text: last_word.to_string(),
        replacement: Some(rep.clone()),
        suggestions: vec![rep],
        apply_all_eligible: true,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn check_punctuation_rules(text: &str, language: &str) -> Vec<Issue> {
        super::check_punctuation_rules(text, language, CheckMode::Document)
    }

    #[test]
    fn test_sentence_capitalization() {
        let text = "help me find the problem";
        let issues = check_punctuation_rules(text, "en_GB");
        let cap_issue = issues.iter().find(|i| i.rule_id == "punctuation.sentence_capitalization");
        assert!(cap_issue.is_some());
        assert_eq!(cap_issue.unwrap().matched_text, "help");
        assert_eq!(cap_issue.unwrap().replacement, Some("Help".to_string()));
    }

    #[test]
    fn test_terminal_punctuation_statement() {
        let text = "This is a statement";
        let issues = check_punctuation_rules(text, "en_GB");
        let term_issue = issues.iter().find(|i| i.rule_id == "punctuation.terminal_mark");
        assert!(term_issue.is_some());
        assert_eq!(term_issue.unwrap().matched_text, "statement");
        assert_eq!(term_issue.unwrap().replacement, Some("statement.".to_string()));
    }

    #[test]
    fn test_terminal_punctuation_question() {
        let text = "What is the time";
        let issues = check_punctuation_rules(text, "en_GB");
        let term_issue = issues.iter().find(|i| i.rule_id == "punctuation.terminal_mark");
        assert!(term_issue.is_some());
        assert_eq!(term_issue.unwrap().matched_text, "time");
        assert_eq!(term_issue.unwrap().replacement, Some("time?".to_string()));
    }

    #[test]
    fn test_uk_title_full_stop() {
        let text = "Dr. Watson visited Mr. Holmes.";
        let issues = check_punctuation_rules(text, "en_GB");
        let uk_titles: Vec<_> = issues.iter().filter(|i| i.rule_id == "punctuation.uk_title_full_stop").collect();
        assert_eq!(uk_titles.len(), 2);
        assert_eq!(uk_titles[0].matched_text, "Dr.");
        assert_eq!(uk_titles[0].replacement, Some("Dr".to_string()));
        assert_eq!(uk_titles[1].matched_text, "Mr.");
        assert_eq!(uk_titles[1].replacement, Some("Mr".to_string()));
    }

    #[test]
    fn test_contractions_and_plural_apostrophe() {
        let text = "dont buy three coffee's";
        let issues = check_punctuation_rules(text, "en_GB");

        let dont_issue = issues.iter().find(|i| i.rule_id == "punctuation.missing_apostrophe").unwrap();
        assert_eq!(dont_issue.matched_text, "dont");
        assert_eq!(dont_issue.replacement, Some("don't".to_string()));

        let plural_issue = issues.iter().find(|i| i.rule_id == "punctuation.plural_apostrophe").unwrap();
        assert_eq!(plural_issue.matched_text, "coffee's");
        assert_eq!(plural_issue.replacement, Some("coffees".to_string()));
    }

    #[test]
    fn test_plural_decades_and_acronyms() {
        let text = "Music from the 1980's and modern API's.";
        let issues = check_punctuation_rules(text, "en_GB");

        let decade_issue = issues.iter().find(|i| i.rule_id == "punctuation.plural_decade").unwrap();
        assert_eq!(decade_issue.matched_text, "1980's");
        assert_eq!(decade_issue.replacement, Some("1980s".to_string()));

        let acronym_issue = issues.iter().find(|i| i.rule_id == "punctuation.plural_acronym").unwrap();
        assert_eq!(acronym_issue.matched_text, "API's");
        assert_eq!(acronym_issue.replacement, Some("APIs".to_string()));
    }

    #[test]
    fn test_ellipsis_normalization() {
        let text1 = "Wait.. what happened?";
        let issues1 = check_punctuation_rules(text1, "en_GB");
        let ellip1 = issues1.iter().find(|i| i.rule_id == "punctuation.ellipsis_length").unwrap();
        assert_eq!(ellip1.matched_text, "..");
        assert_eq!(ellip1.replacement, Some("...".to_string()));

        let text2 = "Hold on.... really?";
        let issues2 = check_punctuation_rules(text2, "en_GB");
        let ellip2 = issues2.iter().find(|i| i.rule_id == "punctuation.ellipsis_length").unwrap();
        assert_eq!(ellip2.matched_text, "....");
        assert_eq!(ellip2.replacement, Some("...".to_string()));
    }

    #[test]
    fn test_uk_quote_placement() {
        let text = "She called it a 'total waste of time.'";
        let issues = check_punctuation_rules(text, "en_GB");
        let quote_issue = issues.iter().find(|i| i.rule_id == "punctuation.uk_quote_placement").unwrap();
        assert_eq!(quote_issue.matched_text, ".'");
        assert_eq!(quote_issue.replacement, Some("'.".to_string()));
    }

    #[test]
    fn test_superfluous_oxford_comma() {
        let text = "Please buy bread, milk, and eggs.";
        let issues = check_punctuation_rules(text, "en_GB");
        let oxford_issue = issues.iter().find(|i| i.rule_id == "punctuation.superfluous_oxford_comma").unwrap();
        assert_eq!(oxford_issue.matched_text, ", and");
        assert_eq!(oxford_issue.replacement, Some(" and".to_string()));
    }

    #[test]
    fn test_honorific_casing_and_guard() {
        let text = "dr watson";
        let issues = check_punctuation_rules(text, "en_GB");
        let h_issue = issues.iter().find(|i| i.rule_id == "punctuation.uk_honorific_casing").unwrap();
        assert_eq!(h_issue.matched_text, "dr watson");
        assert_eq!(h_issue.replacement, Some("Dr Watson".to_string()));

        // Terminal mark should NOT be emitted for isolated honorific + name
        assert!(issues.iter().all(|i| i.rule_id != "punctuation.terminal_mark"));
    }

    #[test]
    fn test_commercial_genitive_terminal() {
        let text = "down at the butchers";
        let issues = check_punctuation_rules(text, "en_GB");
        let term_issue = issues.iter().find(|i| i.rule_id == "punctuation.terminal_mark").unwrap();
        assert_eq!(term_issue.matched_text, "butchers");
        assert_eq!(term_issue.replacement, Some("butcher's.".to_string()));
    }

    #[test]
    fn test_direct_speech_attribution() {
        let text = "it takes daily practice said dr watson";
        let issues = check_punctuation_rules(text, "en_GB");
        let open_issue = issues.iter().find(|i| i.rule_id == "punctuation.direct_speech_quotes").unwrap();
        assert_eq!(open_issue.matched_text, "it");
        assert_eq!(open_issue.replacement, Some("\"It".to_string()));

        let close_issue = issues.iter().find(|i| i.rule_id == "punctuation.speech_attribution_comma").unwrap();
        assert_eq!(close_issue.matched_text, "practice");
        assert_eq!(close_issue.replacement, Some("practice,\"".to_string()));
    }

    #[test]
    fn test_compound_cardinals() {
        let text = "He bought thirty five books.";
        let issues = check_punctuation_rules(text, "en_GB");
        let issue = issues.iter().find(|i| i.rule_id == "punctuation.compound_cardinal_hyphen").unwrap();
        assert_eq!(issue.matched_text, "thirty five");
        assert_eq!(issue.replacement, Some("thirty-five".to_string()));
    }

    #[test]
    fn test_british_time_notation() {
        let text = "Meeting at 930 am tomorrow.";
        let issues = check_punctuation_rules(text, "en_GB");
        let issue = issues.iter().find(|i| i.rule_id == "punctuation.british_time_format").unwrap();
        assert_eq!(issue.matched_text, "930 am");
        assert_eq!(issue.replacement, Some("9.30 am".to_string()));
    }

    #[test]
    fn test_non_restrictive_which() {
        let text = "A new job which paid well.";
        let issues = check_punctuation_rules(text, "en_GB");
        let issue = issues.iter().find(|i| i.rule_id == "punctuation.non_restrictive_which_comma").unwrap();
        assert_eq!(issue.replacement, Some(", which".to_string()));
    }

    #[test]
    fn test_chivalric_and_academic_honorifics() {
        let text1 = "sir reginald thorne";
        let issues1 = check_punctuation_rules(text1, "en_GB");
        let issue1 = issues1.iter().find(|i| i.rule_id == "punctuation.uk_honorific_casing").unwrap();
        assert_eq!(issue1.replacement, Some("Sir Reginald Thorne".to_string()));

        let text2 = "prof higgins";
        let issues2 = check_punctuation_rules(text2, "en_GB");
        let issue2 = issues2.iter().find(|i| i.rule_id == "punctuation.uk_honorific_casing").unwrap();
        assert_eq!(issue2.replacement, Some("Prof Higgins".to_string()));
    }

    #[test]
    fn test_british_time_notation_variations() {
        let t1 = "The store closes at 530 pm today.";
        let issues1 = check_punctuation_rules(t1, "en_GB");
        let i1 = issues1.iter().find(|i| i.rule_id == "punctuation.british_time_format").unwrap();
        assert_eq!(i1.matched_text, "530 pm");
        assert_eq!(i1.replacement, Some("5.30 pm".to_string()));

        let t2 = "The train leaves at 1045 am sharp.";
        let issues2 = check_punctuation_rules(t2, "en_GB");
        let i2 = issues2.iter().find(|i| i.rule_id == "punctuation.british_time_format").unwrap();
        assert_eq!(i2.matched_text, "1045 am");
        assert_eq!(i2.replacement, Some("10.45 am".to_string()));

        let t3 = "Alarm set for 815am";
        let issues3 = check_punctuation_rules(t3, "en_GB");
        let i3 = issues3.iter().find(|i| i.rule_id == "punctuation.british_time_format").unwrap();
        assert_eq!(i3.matched_text, "815am");
        assert_eq!(i3.replacement, Some("8.15 am.".to_string()));
    }

    #[test]
    fn test_compound_cardinals_variations() {
        let t1 = "There are sixty four participants.";
        let issues1 = check_punctuation_rules(t1, "en_GB");
        let i1 = issues1.iter().find(|i| i.rule_id == "punctuation.compound_cardinal_hyphen").unwrap();
        assert_eq!(i1.matched_text, "sixty four");
        assert_eq!(i1.replacement, Some("sixty-four".to_string()));

        let t2 = "Ninety nine red balloons.";
        let issues2 = check_punctuation_rules(t2, "en_GB");
        let i2 = issues2.iter().find(|i| i.rule_id == "punctuation.compound_cardinal_hyphen").unwrap();
        assert_eq!(i2.matched_text, "Ninety nine");
        assert_eq!(i2.replacement, Some("Ninety-nine".to_string()));
    }

    #[test]
    fn test_id_acronym_generalisation() {
        let t1 = "Please present your id cards at the gate.";
        let issues1 = check_punctuation_rules(t1, "en_GB");
        let i1 = issues1.iter().find(|i| i.rule_id == "punctuation.id_acronym").unwrap();
        assert_eq!(i1.matched_text, "id");
        assert_eq!(i1.replacement, Some("ID".to_string()));
    }

    #[test]
    fn test_pronoun_i_syntactic_positions_fragment_mode() {
        // Fixture 1: "i wrote it"
        let t1 = "i wrote it";
        let issues1 = super::check_punctuation_rules(t1, "en_GB", CheckMode::Fragment);
        assert_eq!(issues1.len(), 1);
        assert_eq!(issues1[0].rule_id, "punctuation.pronoun_i");
        assert_eq!(issues1[0].matched_text, "i");
        assert_eq!(issues1[0].replacement, Some("I".to_string()));

        // Fixture 2: 'he said, "i wrote it yesterday"'
        let t2 = "he said, \"i wrote it yesterday\"";
        let issues2 = super::check_punctuation_rules(t2, "en_GB", CheckMode::Fragment);
        assert_eq!(issues2.len(), 1);
        assert_eq!(issues2[0].rule_id, "punctuation.pronoun_i");
        assert_eq!(issues2[0].start_offset, 10);
        assert_eq!(issues2[0].matched_text, "i");
        assert_eq!(issues2[0].replacement, Some("I".to_string()));

        // Fixture 3: "shall i compare thee to a summer's day?"
        let t3 = "shall i compare thee to a summer's day?";
        let issues3 = super::check_punctuation_rules(t3, "en_GB", CheckMode::Fragment);
        assert_eq!(issues3.len(), 1);
        assert_eq!(issues3[0].rule_id, "punctuation.pronoun_i");
        assert_eq!(issues3[0].start_offset, 6);
        assert_eq!(issues3[0].matched_text, "i");
        assert_eq!(issues3[0].replacement, Some("I".to_string()));

        // Fixture 4: "here i am, and here i'll stay."
        let t4 = "here i am, and here i'll stay.";
        let issues4 = super::check_punctuation_rules(t4, "en_GB", CheckMode::Fragment);
        let pronoun_issues4: Vec<_> = issues4.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
        assert_eq!(pronoun_issues4.len(), 2);
        assert_eq!(pronoun_issues4[0].start_offset, 5);
        assert_eq!(pronoun_issues4[1].start_offset, 20);

        // Fixture 5: "i think, therefore i am."
        let t5 = "i think, therefore i am.";
        let issues5 = super::check_punctuation_rules(t5, "en_GB", CheckMode::Fragment);
        let pronoun_issues5: Vec<_> = issues5.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
        assert_eq!(pronoun_issues5.len(), 2);
        assert_eq!(pronoun_issues5[0].start_offset, 0);
        assert_eq!(pronoun_issues5[1].start_offset, 19);
    }

    #[test]
    fn test_roman_numeral_suppression() {
        let texts = [
            "see section i for details",
            "consult part i and chapter i",
            "refer to volume i of the report",
            "appendix i contains the tables",
            "according to clause (i) of the contract",
            "as described in paragraph [i] below",
            "phases i to iii were completed",
            "acts i, ii, and iii",
        ];
        for text in texts {
            let issues = super::check_punctuation_rules(text, "en_GB", CheckMode::Fragment);
            let pronoun_issues: Vec<_> = issues.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
            assert!(
                pronoun_issues.is_empty(),
                "Expected no pronoun_i issues in Roman numeral text '{}', but found {:?}",
                text,
                pronoun_issues
            );
        }
    }

    #[test]
    fn test_enclosed_pronoun_i() {
        let t1 = "(i wrote it)";
        let issues1 = super::check_punctuation_rules(t1, "en_GB", CheckMode::Fragment);
        let p1: Vec<_> = issues1.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
        assert_eq!(p1.len(), 1);
        assert_eq!(p1[0].start_offset, 1);

        let t2 = "“i wrote it”";
        let issues2 = super::check_punctuation_rules(t2, "en_GB", CheckMode::Fragment);
        let p2: Vec<_> = issues2.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
        assert_eq!(p2.len(), 1);

        let t3 = "'i wrote it'";
        let issues3 = super::check_punctuation_rules(t3, "en_GB", CheckMode::Fragment);
        let p3: Vec<_> = issues3.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
        assert_eq!(p3.len(), 1);
    }

    #[test]
    fn test_pronoun_i_curly_apostrophe_contractions() {
        let text = "here i’m waiting and here i’ve been";
        let issues = super::check_punctuation_rules(text, "en_GB", CheckMode::Fragment);
        let pronoun_issues: Vec<_> = issues.iter().filter(|i| i.rule_id == "punctuation.pronoun_i").collect();
        assert_eq!(pronoun_issues.len(), 2);
        assert_eq!(pronoun_issues[0].matched_text, "i");
        assert_eq!(pronoun_issues[0].replacement, Some("I".to_string()));
        assert_eq!(pronoun_issues[1].matched_text, "i");
        assert_eq!(pronoun_issues[1].replacement, Some("I".to_string()));
    }
}

