# Phase 0: Discovery Report — Native macOS NSSpellChecker Migration

**Date:** September 5, 2026  
**Target Platform:** macOS (Apple Silicon M4)  
**Primary Engine Goal:** Native macOS `NSSpellChecker` (AppKit / `com.apple.applespell`)  
**Secondary/Fallback:** Local Ollama (inert, opt-in, lazy-started)

---

## 1. Repository Layout

The project consists of two separate directory roots located in `/Users/joerey/.gemini/antigravity/scratch/`:

1. **Tauri App Repository Root:**  
   `/Users/joerey/.gemini/antigravity/scratch/wordtune-personal`  
   Contains the Tauri v2 desktop application (`spelling-launcher`). It is currently structured as a standalone project with `package.json` at the root and `src-tauri/` for the Rust backend.
   
2. **Raycast Extension Root:**  
   `/Users/joerey/.gemini/antigravity/scratch/spelling-launcher-raycast`  
   Contains the companion Raycast extension (`spelling-launcher`), located as an adjacent standalone directory.

*(Note: Currently these are separate project directories rather than a Cargo workspace or npm monorepo).*

---

## 2. Versions, Toolchain, and Frameworks

| Component | Specification | File Source |
| :--- | :--- | :--- |
| **Tauri Version** | Major: `2`, Exact Lock: `2.11.5` | `src-tauri/Cargo.toml`, `Cargo.lock` |
| **Tauri CLI / API** | `@tauri-apps/api: ^2.0.0`, `@tauri-apps/cli: ^2.0.0` | `package.json` |
| **Tauri Dialog Plugin** | `@tauri-apps/plugin-dialog: ^2.7.3` | `package.json`, `Cargo.toml` |
| **Rust Toolchain** | `rustc 1.98.0 (88d9e12ae 2026-08-18)` | System toolchain |
| **Cargo Version** | `cargo 1.98.0 (797e8a9bc 2026-08-05)` | System toolchain |
| **Rust Edition** | `2021` | `src-tauri/Cargo.toml:6` |
| **Frontend Framework**| React 18 (`react: ^18.3.1`, `react-dom: ^18.3.1`) | `package.json` |
| **Bundler & Build** | Vite 6 (`vite: ^6.1.0`, `@vitejs/plugin-react: ^4.3.4`) | `package.json` |
| **Styling** | Tailwind CSS 3 (`tailwindcss: ^3.4.17`, `postcss: ^8.5.2`) | `package.json` |
| **Frontend Language** | TypeScript 5 (`typescript: ^5.7.3`) | `package.json` |
| **Raycast API** | `@raycast/api: ^1.83.0`, `@raycast/utils: ^1.17.0` | `spelling-launcher-raycast/package.json` |

---

## 3. Inventory of Ollama, Llama, and Model References

Below is the complete inventory of all files referencing Ollama, llama, localhost:11434, model names, prompt templates, or streaming response handling across both repositories (with line numbers).

### A. Tauri App Repository (`wordtune-personal`)

#### Rust Backend (`src-tauri/`)
1. **`src-tauri/src/ai_proxy.rs`**
   - **L10–15**: `<think>` reasoning block parsing and stripping (Qwen / DeepSeek / Ollama reasoning outputs).
   - **L18–23**: Markdown code fence stripping (```json ... ```).
   - **L25–54**: JSON array extraction and parsing logic from LLM responses.
   - **L56–67**: Bullet-line fallback parsing for unstructured LLM responses.
   - **L70**: Function doc: `/// Securely rewrites ONLY the provided selected passage via Local Ollama or OpenAI-compatible API.`
   - **L80–83**: Base URL fallback: `http://localhost:11434/v1`.
   - **L85**: `let is_ollama = base_url.contains("11434") || base_url.contains("ollama");`
   - **L87–96**: Default model fallback: `"qwen2.5vl:latest"` if Ollama, else `"gpt-4o-mini"`.
   - **L100–108**: Tone prompt instructions (`casual`, `professional`, `academic`, `confident`, `friendly`, `direct`).
   - **L110–114**: Length prompt instructions (`shorten`, `expand`).
   - **L116–130**: Prompt template: `Rewrite the following single sentence into 4 high-quality, diverse variations...`
   - **L137–143**: URL endpoint normalization for `/chat/completions` and `/v1/chat/completions`.
   - **L145–150**: Host candidate fallback switching between `localhost:11434` and `127.0.0.1:11434`.
   - **L152–166**: JSON request payload constructing `"model": model` and system/user messages.
   - **L183**: Error format string: `Connection to Ollama ({}) failed: {}. Make sure Ollama is running.`
   - **L188**: Wake-from-sleep / cold-model reload retry comment.
   - **L211**: Error format string: `Ollama/API returned error {}: {}`.
   - **L231**: Response provider metadata: `provider: format!("Ollama ({})", model)`.
2. **`src-tauri/src/models.rs`**
   - **L40–47**: `RewritePassageRequest` struct definition: `model: Option<String>`, `base_url: Option<String>`, `api_key: Option<String>`.
   - **L50–54**: `RewritePassageResponse` struct definition: `variations: Vec<String>`, `latency_ms: u64`, `provider: String`.
3. **`src-tauri/src/lib.rs`**
   - **L1**: `pub mod ai_proxy;`
   - **L9–10**: Imports `RewritePassageRequest`, `RewritePassageResponse`.
   - **L109–111**: `#[tauri::command] async fn rewrite_passage(req: RewritePassageRequest) -> Result<RewritePassageResponse, String>`.
   - **L138**: Command registered in `tauri::generate_handler![..., rewrite_passage]`.

#### Frontend (`src/`)
4. **`src/core/engine/aiRewriter.ts`**
   - **L6–11**: `ApiSettings` interface: `provider?: 'ollama' | 'local' | 'openai' | 'anthropic'`, `model?: string`, `baseUrl?: string`.
   - **L14–17**: JSDoc comments referencing Ollama passage proxy and fallback.
   - **L28**: Provider default: `const provider = settings.provider || 'ollama';`.
   - **L41–47**: Default URL `http://localhost:11434/v1` and model `'qwen2.5vl:latest'`.
   - **L49–51**: OpenAI fallback URL and model `'gpt-4o-mini'`.
   - **L71**: Identifier generation: `${sentenceId}-ollama-${idx}`.
   - **L99**: Error notice: `Ollama Notice: ${err?.message || err}. Used local heuristic rewrite.`.
5. **`src/components/modals/SettingsModal.tsx`**
   - **L15–16**: Default states: `ollamaUrl` (`'http://localhost:11434/v1'`), `ollamaModel` (`'qwen2.5vl:latest'`).
   - **L18–19**: Connection state: `ollamaStatus`, `ollamaMessage`.
   - **L29–54**: `fetchOllamaModels()` probes `http://localhost:11434/api/tags` via HTTP.
   - **L51**: Warning text: `'Cannot reach Ollama on port 11434. Make sure ollama serve or Ollama app is running.'`.
   - **L57**: Auto-fetch effect on modal mount.
   - **L66–67**: State persistence for `ollamaBaseUrl` and `ollamaModel`.
   - **L100**: UI badge: `Powered entirely on your machine via your local Ollama engine.`
   - **L112–121**: Provider toggle button for `ollama`.
   - **L157–234**: Dedicated Ollama configuration form (URL input, model selector/input, refresh status, test connection indicator).
   - **L236–277**: OpenAI configuration form.
6. **`src/core/state/settingsStore.ts`**
   - **L5–7**: Default state: `provider: 'ollama'`, `ollamaBaseUrl: 'http://localhost:11434/v1'`, `ollamaModel: 'qwen2.5vl:latest'`.
   - **L9–10**: `openaiBaseUrl: 'https://api.openai.com/v1'`, `openaiModel: 'gpt-4o-mini'`.
7. **`src/types/database.ts`**
   - **L27–32**: `UserSettings` fields: `provider`, `ollamaBaseUrl`, `ollamaModel`, `openaiBaseUrl`, `openaiModel`.
8. **`src/types/tauriBridgeTypes.ts`**
   - **L12–19**: `RewritePassageRequest` interface (`base_url?: string; model?: string;`).
   - **L22–26**: `RewritePassageResponse` interface (`variations: string[]; latency_ms: number; provider: string;`).
9. **`src/types/suggestions.ts`**
   - **L53**: `customPrompt?: string;`.
10. **`src/core/state/editorStore.ts`**
    - **L35**: Welcome document text: `"...powered by your local Ollama instance and LanguageTool rules."`.
    - **L200–232**: `generateRewritesForSelected()` invokes `rewriteSelectedPassage` passing `ollamaBaseUrl` and `ollamaModel`.
11. **`src/components/editor/SourceEditorPane.tsx`**
    - **L93**: Welcome template string referencing Ollama.
12. **`README.md`**
    - **L24, L41, L103**: Architecture documentation describing the Ollama passage proxy and `ollama run qwen2.5vl:latest`.
13. **`.env.example`**
    - **L3–5, L8**: Environment variables for OpenAI (`gpt-4o-mini`) and Ollama (`VITE_OLLAMA_BASE_URL=http://localhost:11434/v1`).

---

### B. Raycast Extension Repository (`spelling-launcher-raycast`)

14. **`src/engine/ollama.ts`**
    - **L6–9**: Interface `Preferences` (`ollamaHost?: string; ollamaModel?: string;`).
    - **L16–79**: `proofreadStrictText(originalText)`:
      - **L21–22**: Defaults `http://localhost:11434` and `qwen2.5vl:latest`.
      - **L24–31**: Strict literal proofreading prompt template.
      - **L34–49**: HTTP POST to `${host}/v1/chat/completions`.
      - **L59–70**: Strips `<think>`, markdown fences, quotes.
      - **L76**: Catch block falling back to `applyFastFixes(text)`.
    - **L84–271**: `fetchFourVersionRewrites(originalText)`:
      - **L86–87**: Defaults `http://localhost:11434` and `qwen2.5vl:latest`.
      - **L89–105**: 4-version prompt template (`formal`, `friendly`, `direct`, `detailed`).
      - **L108–120**: HTTP POST to `${host}/v1/chat/completions`.
      - **L129–147**: Response clean-up and JSON parsing.
      - **L222–270**: Fallback generating heuristic cleaned versions on Ollama failure.
    - **L273–275**: `fetchOllamaRewrites` export.
15. **`src/quick-fix.tsx`**
    - **L2**: `import { proofreadStrictText } from './engine/ollama';`
    - **L22**: `await showHUD('🔍 Proofreading (keeping your words)...');`
    - **L23**: Calls `proofreadStrictText(text)`.
16. **`src/rewrite-selection.tsx`**
    - **L14**: `import { fetchFourVersionRewrites } from './engine/ollama';`
    - **L52**: Status message: `'Rewriting into 4 versions with local Ollama...'`.
    - **L55**: Calls `fetchFourVersionRewrites(text)`.
17. **`src/engine/diff.ts`**
    - **L19**: Diff footer: `- **Engine**: Local Ollama (100% Private, Zero Cloud Sync)`.
18. **`package.json`**
    - **L5**: Description: `"Rewrite and check selected text in any app using your local Ollama instance with zero cloud telemetry."`
    - **L30–38**: Preference `ollamaHost` (default: `"http://localhost:11434"`).
    - **L39–47**: Preference `ollamaModel` (default: `"qwen2.5vl:latest"`).
19. **`README.md`**
    - **L3, L11, L28, L48**: Documentation referencing Ollama host, models (`qwen2.5vl:latest`), and local inference.
20. **`raycast-env.d.ts`**
    - **L11–14**: Typed preferences `ollamaHost: string`, `ollamaModel: string`.

---

## 4. Current Check Flow End to End

### Surface 1: Tauri Desktop App (`spelling-launcher`)

1. **Trigger:**
   - **Document check:** Triggered synchronously whenever content is loaded (`loadDocument`) or edited (`updateRawContentDirectly`).
   - **Rewrites:** Triggered when the user clicks or navigates to a sentence (`selectSentence`).
2. **Text Sent:**
   - Document check: The entire document is broken into paragraphs and sentences; each sentence is checked in-memory via regex-based rules (passive voice, wordiness, repetition, confusion sets, punctuation).
   - Sentence rewrite: Strictly the single highlighted sentence (`sentence.trimmedText`) is sent over IPC to Rust, which sends it in an HTTP payload to Ollama `localhost:11434`.
3. **Rendering:**
   - Issues are highlighted in the source editor using CSS classes (`border-b-2 border-dashed` in red, amber, sky-blue, purple).
   - Clicking a sentence populates the center pane with specific issues and the right pane with Ollama rewrite cards showing side-by-side word diffs.
4. **Correction:**
   - Clicking "Apply Fix" or selecting an Ollama rewrite variation calls `applySentenceRevision(sentenceId, text)`, which replaces the sentence text, rebuilds the markdown, creates an undo checkpoint in memory, and triggers re-analysis.

---

### Surface 2: Raycast Extension (`spelling-launcher-raycast`)

1. **Trigger:**
   - User highlights text in any macOS app (e.g. Mail, Slack, Chrome) and presses a Raycast hotkey for either `Rewrite Selected Text` (`rewrite-selection`) or `Proofread & Fix` (`quick-fix`).
2. **Text Sent:**
   - Selected text (or clipboard text if selection API is unavailable) is sent directly via `fetch()` to `http://localhost:11434/v1/chat/completions`.
3. **Rendering:**
   - `quick-fix`: Renders no list; displays HUD progress and completion status.
   - `rewrite-selection`: Renders a 4-item list view (Formal, Friendly, Direct, Detailed) with Markdown diff previews.
4. **Correction:**
   - `quick-fix`: Immediately overwrites the selected text in the active application via `Clipboard.paste()`.
   - `rewrite-selection`: Pastes on <kbd>Cmd</kbd>+<kbd>Enter</kbd> or copies on <kbd>Enter</kbd>.

---

## 5. Existing Test Setup, Benchmarking, and CI Configuration

- **Tauri App Frontend Tests:**
  - **Runner:** Vitest 3.0.5 (`vitest run`).
  - **Location:** `tests/` (6 test files, 27 tests).
  - **Coverage:** Deterministic rules, diff calculation, document extractor (PDF/DOCX/TXT line-by-line letterhead parser), E2E happy path, local rewriter heuristics, sentence/paragraph segmentation.
- **Tauri App Backend Tests:**
  - **Runner:** `cargo test` in `src-tauri/`.
  - **Location:** `src-tauri/src/` inline `#[cfg(test)]` modules (8 tests).
  - **Coverage:** File operations, SQLite migrations & queries, Ollama response JSON extraction & fallback line parsing.
- **Raycast Extension Tests:**
  - No automated tests currently exist; relies on `@raycast/eslint-config` linting and `ray build`.
- **Benchmark Tooling:**
  - **None.** No `benches/` directory exists.
- **CI Configuration:**
  - **None.** No `.github/` workflows or CI scripts exist.

---

## 6. Phase 0 Summary & Readiness for Phase 1

All references across both codebases have been cataloged. No source files or configurations have been modified. 

Awaiting approval to begin **Phase 1: Capability Spike** (building the throwaway Rust spike against `NSSpellChecker` on Apple Silicon with the 40-sentence corpus in `fixtures/gec/en.jsonl`).
