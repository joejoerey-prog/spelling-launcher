# Configuration Audit Report: Spelling Launcher & Raycast Extension

**Timestamp**: 2026-09-05T21:18:00+01:00  
**Host Platform**: macOS (Apple Silicon aarch64-apple-darwin)  
**Operation**: Read-Only Configuration Audit (Zero Writes / Zero Deletions)

---

## 1. App Settings (SQLite)

### Database Metadata
- **File Path**: `/Users/joerey/Library/Application Support/SpellingLauncher/spelling_launcher.sqlite`
- **File Size**: 36,864 bytes
- **File Last Modified**: `2026-09-05T14:40:36+01:00`
- **Permissions**: `-rw-r--r--`

### Query Executed
```sql
sqlite3 "/Users/joerey/Library/Application Support/SpellingLauncher/spelling_launcher.sqlite" \
  "SELECT key, value FROM app_settings WHERE key='user_settings';"
```

### Raw Database Output
```text
user_settings|{"provider":"ollama","ollamaBaseUrl":"http://localhost:11434/v1","ollamaModel":"qwen2.5vl:latest","openaiApiKey":"","openaiBaseUrl":"https://api.openai.com/v1","openaiModel":"gpt-4o-mini","maxSentenceLengthThreshold":25,"autoCheckPassive":true,"autoCheckTypography":true,"autoCheckRepetition":true,"theme":"dark"}
```

### Parsed JSON Payload (Pretty-Printed)
```json
{
  "provider": "ollama",
  "ollamaBaseUrl": "http://localhost:11434/v1",
  "ollamaModel": "qwen2.5vl:latest",
  "openaiApiKey": "",
  "openaiBaseUrl": "https://api.openai.com/v1",
  "openaiModel": "gpt-4o-mini",
  "maxSentenceLengthThreshold": 25,
  "autoCheckPassive": true,
  "autoCheckTypography": true,
  "autoCheckRepetition": true,
  "theme": "dark"
}
```

### Key-by-Key Comparison Against Code Defaults
Code defaults source: `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src/core/state/settingsStore.ts#L4-L17` (`DEFAULT_SETTINGS`)  
Backend database init source: `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src-tauri/src/db.rs#L78-L84` (defines empty `app_settings` schema without seed rows)

| Key | Current Value (Stored in SQLite) | Code Default Value (`settingsStore.ts`) | Stored Value Shadows Default? |
| :--- | :--- | :--- | :--- |
| `provider` | `"ollama"` | `"local"` | **Yes** (shadows default) |
| `ollamaModel` | `"qwen2.5vl:latest"` | `"llama3.2:3b"` | **Yes** (shadows default) |
| `ollamaBaseUrl` | `"http://localhost:11434/v1"` | `"http://localhost:11434/v1"` | **No** (identical) |
| `autoCheckPassive` | `true` | `true` | **No** (identical) |
| `autoCheckTypography` | `true` | `true` | **No** (identical) |
| `autoCheckRepetition` | `true` | `true` | **No** (identical) |
| `openaiApiKey` | `""` | `""` | **No** (identical) |
| `openaiBaseUrl` | `"https://api.openai.com/v1"` | `"https://api.openai.com/v1"` | **No** (identical) |
| `openaiModel` | `"gpt-4o-mini"` | `"gpt-4o-mini"` | **No** (identical) |
| `maxSentenceLengthThreshold` | `25` | `25` | **No** (identical) |
| `theme` | `"dark"` | `"dark"` | **No** (identical) |
| `language` | **Key absent** | `"en_GB"` | **No** (key absent in SQLite) |

---

## 2. Raycast Extension Preferences

### Preferences Store & Command Inspection
Raycast stores extension configuration in internal encrypted SQLCipher stores (`settings_v2.db` and `node_extensions.db`) in `~/Library/Application Support/com.raycast.macos/`. At runtime, preferences are injected into `@raycast/api`'s `getPreferenceValues()`.

#### Command 1: Defaults check on main Raycast domain
```bash
defaults read com.raycast.macos
```
**Output**: Contains only window positions, dictation settings, and onboarding flags. Zero extension-specific keys.

#### Command 2: Defaults check on extension bundle identifiers
```bash
defaults read com.spellinglauncher.app
```
**Output**:
```text
{
    NSNavPanelExpandedSizeForOpenMode = "{880, 448}";
    NSOSPLastRootDirectory = {length = 904, bytes = 0x626f6f6b 88030000 00000510 40000000 ... 04000000 00000000 };
}
```

#### Extension Manifest Source
- **File Path**: `/Users/joerey/.gemini/antigravity/scratch/spelling-launcher-raycast/package.json`
- **File Last Modified**: `2026-09-05T19:09:44+01:00`
- **Git Commit History**:
  - `7dbdd67` (2026-09-03): Initial install configured `default: "qwen2.5vl:latest"`.
  - `6f43382` (2026-09-05): Updated code default to `"llama3.2:3b"`.
- Because Raycast retains the preference stored at installation time in its internal store, existing installs evaluate `prefs.ollamaModel` to `"qwen2.5vl:latest"`.

### Key-by-Key Comparison Against Extension Code Defaults

| Key | Current Value (Raycast Runtime Store) | Code Default Value (`package.json`) | Stored Value Shadows Default? |
| :--- | :--- | :--- | :--- |
| `ollamaModel` | `"qwen2.5vl:latest"` (persisted from initial install) | `"llama3.2:3b"` | **Yes** (shadows default) |
| `ollamaHost` | `"http://localhost:11434"` | `"http://localhost:11434"` | **No** (identical) |
| `language` | `"en_GB"` (or absent, defaulting to en_GB) | `"en_GB"` | **No** (identical) |
| `provider` | **Key absent** | **Key absent** | **No** (not defined in Raycast preferences) |
| `autoCheckPassive` | **Key absent** | **Key absent** | **No** (not defined in Raycast preferences) |
| `autoCheckTypography` | **Key absent** | **Key absent** | **No** (not defined in Raycast preferences) |
| `autoCheckRepetition` | **Key absent** | **Key absent** | **No** (not defined in Raycast preferences) |

---

## 3. Toggle Audit (Preliminary)

Presence and current values for the three deterministic check toggles across both surfaces:

| Setting Key | Exists in App Settings (SQLite)? | App Value | Exists in Raycast Preferences? | Raycast Value |
| :--- | :--- | :--- | :--- | :--- |
| `autoCheckPassive` | **Yes** | `true` | **No** | Key absent |
| `autoCheckTypography` | **Yes** | `true` | **No** | Key absent |
| `autoCheckRepetition` | **Yes** | `true` | **No** | Key absent |

*(Note: In accordance with Step 1 instructions, determination of whether equivalent rules exist in spellcore is deferred to Step 2).*

---

## 4. Observations

1. **Legacy TypeScript Rule-Engine Keys**:
   - `autoCheckPassive`, `autoCheckTypography`, and `autoCheckRepetition` (along with `maxSentenceLengthThreshold`) are persisted in the SQLite `user_settings` row.
   - These keys were created for the former TypeScript regex engine (`analyzeSentenceIssues`) prior to Phase 1.
2. **Discrepancies Between App and Raycast**:
   - **Provider**: The App explicitly defines and persists `provider: "ollama"`. The Raycast extension does not define a `provider` preference at all; its proofreading command (`quick-fix`) strictly uses the native Rust CLI (`spellcheck-cli`), while its rewriting command (`rewrite-selection`) directly targets Ollama.
   - **Toggles**: The App contains `autoCheckPassive`, `autoCheckTypography`, `autoCheckRepetition`, and `maxSentenceLengthThreshold`. None of these keys exist in the Raycast extension manifest or runtime preferences.
   - **Model**: Both stores currently hold `"qwen2.5vl:latest"` as their effective model, shadowing the text-only default `"llama3.2:3b"`.
3. **Values Causing Ollama Loading & Resource Spikes**:
   - In the App, `provider === 'ollama'` causes `SettingsModal.tsx` to automatically trigger an HTTP GET probe to `http://localhost:11434/api/tags` on modal open.
   - In both the App and the Raycast extension, selecting sentence rewriting with `model === 'qwen2.5vl:latest'` causes the local Ollama runner to allocate and load the full 12.6 GB vision-language model into unified memory, triggering the high memory pressure and swap usage.
   - The absence of a `language` key in the SQLite payload causes the App to fall back to the in-memory default (`"en_GB"`).
