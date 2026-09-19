# Settings Migration Note: Schema Version 1

Date: 05/09/2026  
Author: Antigravity

## Summary of Changes

A versioned, transactional, and recoverable database migration has been applied to the Spelling Launcher application SQLite store (`spelling_launcher.sqlite`). This updates user settings from schema version 0 (pre-migration) to schema version 1.

### 1. Database Schema & Migration Runner
- **`schema_metadata`**: Created table tracking `schema_version`.
- **`settings_migrations`**: Created audit table archiving the exact pre-migration JSON payload, version transition metadata, application timestamp, and user acknowledgement status. Structural idempotency is guaranteed by a `UNIQUE` constraint on `schema_version`.
- **Atomic Execution**: All updates execute in a single SQLite transaction with automatic rollback if any constraint or deserialisation fails.
- **Payload Alignment**:
  - `provider`: Reset to `'local'` (heuristics engine).
  - `ollamaModel`: Vision model `qwen2.5vl:latest` replaced with `llama3.2:3b`. Unrecognised non-vision models are preserved untouched.
  - `language`: Guaranteed `'en_GB'` default.
  - Pruned inert toggles: Removed `autoCheckPassive` and `maxSentenceLengthThreshold` (which had zero backend rule implementations).
  - Preserved active toggles: Retained `autoCheckTypography` and `autoCheckRepetition`.

### 2. User Disclosure & Settings UI
- **Disclosure Notice**: When an unacknowledged migration row is detected, a banner is surfaced in `<SettingsModal />` informing the user of the migration. The notice persists across modal dismissals until explicitly dismissed via the "Acknowledge" button.
- **Probe Elimination**: Automated on-mount probing to port 11434 (`http://localhost:11434/api/tags`) has been removed. Local Ollama is queried only on explicit user invocation via the "Test Connection" button.
- **Resource Footprint**: Added clear memory documentation (`2,595 MB peak while generating, 112 MB after idle unload (measured for llama3.2:3b)`).
- **Point-of-Use Validation**: Sentence rewriter checks that the requested model is actually installed in local Ollama before attempting generation, returning a clear error if missing.

### 3. Raycast Extension Guard
- **Vision Model Runtime Check**: Added runtime guard in `spelling-launcher-raycast/src/engine/ollama.ts` that detects vision-language models (`*vl*`, `*vision*`), displays a warning toast, and refuses the invocation.
- **Manual Preference Update Guide**: Documented steps in `spelling-launcher-raycast/README.md` for manually updating stored Raycast preferences.

---

## Test Count Changes

### Rust Workspace (`cargo test --workspace`)
- Total lib tests in `spelling_launcher_lib` increased from **8** to **14**:
  1. `test_migration_idempotence_and_audit`
  2. `test_migration_preserves_post_migration_changes`
  3. `test_migration_unrecognised_model_untouched`
  4. `test_migration_interrupted_rollback`
  5. `test_migration_acknowledgement`
  6. `test_live_db_migration`
- All native AppKit and spellcore integration tests remain at 100% pass rate.

### Frontend Vitest Suite (`npm test`)
- Total tests increased from **25** to **30** (30 passing across 8 test suites):
  - `tests/amendment3_isolation.test.ts` increased from **4** to **9** tests:
    1. `mounting SettingsModal with stored provider=ollama does not probe port 11434 on mount`
    2. `SettingsModal displays persistent migration disclosure notice until explicitly acknowledged`
    3. `closing SettingsModal does NOT acknowledge migration`
    4. `point-of-use model validation flags absent model and falls back safely`
    5. `editorStore respects autoCheckTypography and autoCheckRepetition toggles`
