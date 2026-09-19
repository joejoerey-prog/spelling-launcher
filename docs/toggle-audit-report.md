# Toggle & Rule Audit Report: Spellcore vs Application Settings

**Timestamp**: 2026-09-05T21:22:00+01:00  
**Operation**: Read-Only Audit (Zero Writes / Zero Modifications)  
**Target Repositories**:
- Spellcore Crate: `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/crates/spellcore`
- App Settings & Tauri Backend: `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src-tauri/src` & `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src`

---

## 1. Rule Existence in Spellcore

### Passive Voice
- **Existence**: **Rule not found in spellcore**
- **Search Scope**: Audited all modules in `crates/spellcore/src/rules/` (`confusion.rs`, `dialect.rs`, `distractor.rs`, `mod.rs`, `punctuation.rs`, `repetition.rs`, `wordiness.rs`), `checker.rs`, `engine.rs`, and test files.
- **Details**: No regex, heuristic, AST pattern, or syntactic parser for passive voice exists in the Rust codebase. Passive voice detection was exclusively a legacy TypeScript heuristic in `src/core/engine/deterministicRules.ts`, which has been completely removed.

### Typography Rules
- **Existence**: **Yes (partial: punctuation spacing rules exist; curly quotes/em-dashes do not)**
- **Rule Names & File Paths**:
  - `punctuation.space_before_comma` — [crates/spellcore/src/rules/punctuation.rs:19](file:///Users/joerey/.gemini/antigravity/scratch/wordtune-personal/crates/spellcore/src/rules/punctuation.rs#L19)
  - `punctuation.missing_space_after_comma` — [crates/spellcore/src/rules/punctuation.rs:38](file:///Users/joerey/.gemini/antigravity/scratch/wordtune-personal/crates/spellcore/src/rules/punctuation.rs#L38)
- **Configuration Struct**: **None**.
- **Enabled by Default**: **Yes**. In [crates/spellcore/src/rules/mod.rs:62](file:///Users/joerey/.gemini/antigravity/scratch/wordtune-personal/crates/spellcore/src/rules/mod.rs#L62), `issues.extend(punctuation::check_punctuation_rules(text));` executes unconditionally on every check pass.
- **Note on UI Mismatch**: The UI toggle in `SettingsModal.tsx` advertises "Auto typography (curly quotes, em-dashes)", but spellcore contains zero rules for curly quotes or em-dashes.

### Repetition Rules
- **Existence**: **Yes**
- **Rule Name & File Path**:
  - `repetition.duplicate_words` — [crates/spellcore/src/rules/repetition.rs:17](file:///Users/joerey/.gemini/antigravity/scratch/wordtune-personal/crates/spellcore/src/rules/repetition.rs#L17)
- **Configuration Struct**: **None**.
- **Enabled by Default**: **Yes**. In [crates/spellcore/src/rules/mod.rs:59](file:///Users/joerey/.gemini/antigravity/scratch/wordtune-personal/crates/spellcore/src/rules/mod.rs#L59), `issues.extend(repetition::check_repetition_rules(text));` executes unconditionally on every check pass.

---

## 2. Settings Consumption in App

Search across Tauri backend (`src-tauri/src/`) and frontend (`src/`):

### `autoCheckPassive`
- **File Paths Where Read/Stored**:
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/types/database.ts:34`
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/core/state/settingsStore.ts:12`
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/components/modals/SettingsModal.tsx:26, 74, 332`
- **Tauri Backend Usage (`src-tauri/src/`)**: **Zero references.** It is never read, passed, or deserialized in Rust.
- **How It's Used**: Stored in SQLite as a JSON field in `user_settings`, loaded into UI state, rendered as a toggle in `SettingsModal.tsx`.
- **Affects Spellcore Behaviour?**: **No.** Completely inert.

### `autoCheckTypography`
- **File Paths Where Read/Stored**:
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/types/database.ts:35`
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/core/state/settingsStore.ts:13`
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/components/modals/SettingsModal.tsx:27, 75, 343`
- **Tauri Backend Usage (`src-tauri/src/`)**: **Zero references.** It is never read, passed, or deserialized in Rust.
- **How It's Used**: Stored in SQLite as a JSON field in `user_settings`, loaded into UI state, rendered as a toggle in `SettingsModal.tsx`.
- **Affects Spellcore Behaviour?**: **No.** Completely inert (spellcore executes `punctuation` rules regardless of toggle value).

### `autoCheckRepetition`
- **File Paths Where Read/Stored**:
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/types/database.ts:36`
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/core/state/settingsStore.ts:14`
  - `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/components/modals/SettingsModal.tsx:28, 76, 322`
- **Tauri Backend Usage (`src-tauri/src/`)**: **Zero references.** It is never read, passed, or deserialized in Rust.
- **How It's Used**: Stored in SQLite as a JSON field in `user_settings`, loaded into UI state, rendered as a toggle in `SettingsModal.tsx`.
- **Affects Spellcore Behaviour?**: **No.** Completely inert (spellcore executes `repetition` rules regardless of toggle value).

### Additional Audit Finding: `maxSentenceLengthThreshold`
- **File Paths Where Read/Stored**: `types/database.ts:33`, `settingsStore.ts:11`, `SettingsModal.tsx:25, 73, 351`.
- **Tauri Backend Usage**: Zero references.
- **Affects Spellcore Behaviour?**: **No.** Completely inert slider (15–45 words) that has no consumer in Rust.

---

## 3. Recommendations

| Toggle Key | Recommendation | Reasoning |
| :--- | :--- | :--- |
| `autoCheckPassive` | **Remove** | Passive voice detection does not exist in spellcore and is not planned, so retaining an inert toggle misleads users and clutters the UI. |
| `autoCheckTypography` | **Keep and wire through** | Punctuation spacing rules exist in spellcore and should be controllable by the user rather than running unconditionally while an un-wired toggle sits in settings. |
| `autoCheckRepetition` | **Keep and wire through** | Consecutive repeated-word detection exists in spellcore and should be wired through so users can toggle duplicate word flagging on or off. |
| `maxSentenceLengthThreshold` | **Remove** | Arbitrary sentence length thresholds were an artifact of the deleted legacy rule analyzer and have no consumer in the native architecture. |
