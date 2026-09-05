# WordCraft (Wordtune Personal Desktop Replacement)

**WordCraft** is a private, personal sentence writing, checking, and rewriting desktop application. Built with **Tauri 2, React, TypeScript, Rust, and SQLite**, it runs 100% locally on your machine with zero telemetry, zero analytics, no cloud accounts, and no background document uploads.

---

## Key Features

- **Three-Pane Editor**:
  - **Source Editor (Left)**: Interactive sentence inspector. Click any sentence to focus and inspect linguistic checks.
  - **Suggestions & Rewrites (Center)**: Deterministic linguistic checks (repeated words, passive voice, length warnings, typography) and side-by-side rewrite options with visual word-level diffs (green additions, red deletions).
  - **Accepted Result Preview (Right)**: Real-time Markdown / plain-text preview with session diff highlighting, reading statistics, and one-click copy / export.
- **Tone, Length, & Fluency Controls**:
  - **Tones**: Natural, Casual, Professional, Academic, Confident, Direct.
  - **Lengths**: Standard, Shorten (Concise), Expand (Elaborate).
- **Deterministic Linguistic Checks**:
  - **Repeated Words**: Identifies accidental consecutive duplicate words (e.g., `"the the"`) with custom ignore dictionary support.
  - **Passive Voice**: Detects passive constructions (e.g., `"was created by"`) and provides direct active-voice alternatives.
  - **Typography Enhancements**: Converts straight quotes (`" "`, `' '`) to directional curly quotes (`“ ”`, `‘ ’`), `--` to em-dashes (`—`), `...` to ellipses (`…`), and strips redundant spaces.
  - **Sentence Length Warnings**: Highlights sentences over the configured threshold (default 25 words).
  - **Custom User Rules**: Define regex patterns and custom replacements stored in local SQLite.
- **Privacy-Guaranteed Selective Rewrites**:
  - **100% Local-First by Default**: Works offline with built-in heuristic rewrite algorithms.
  - **Selective Passage Proxy**: When an API provider (OpenAI / Ollama / Anthropic) is configured in Settings or `.env`, **only the specifically highlighted sentence is sent**; the rest of the document is never transmitted.
- **Local Persistence & Safe File Operations**:
  - Headings (`#`), lists (`-`, `1.`), blockquotes, and code blocks (which are skipped from grammar checking to avoid breakage) are fully preserved.
  - Automatic atomic saving with `.bak` safety backups.
  - Safe filename sanitization preventing path traversal.
  - Full Undo (`Cmd+Z` / `Ctrl+Z`) and Redo (`Cmd+Shift+Z` / `Ctrl+Y`) history stack.

---

## Architecture

```
wordtune-personal/
├── src-tauri/                 # Rust Native Backend
│   ├── src/
│   │   ├── main.rs            # Desktop App Lifecycle & Entrypoint
│   │   ├── lib.rs             # Tauri Command Handlers
│   │   ├── fs_layer.rs        # Safe Local Filesystem & Backup Layer
│   │   ├── db.rs              # Local SQLite Database (rusqlite)
│   │   ├── ai_proxy.rs        # Selective Passage-Only Rewrite Client
│   │   └── models.rs          # Shared Typed Structs
│   ├── tauri.conf.json        # Tauri 2 Desktop Configuration
│   └── capabilities/          # Desktop Permissions Configuration
├── src/                       # React 18 + TypeScript Frontend
│   ├── components/
│   │   ├── layout/            # AppHeader, ThreePaneLayout, StatusBar
│   │   ├── editor/            # SourceEditorPane, SentenceHighlight, Toolbar
│   │   ├── suggestions/       # SuggestionPane, RewriteCard, IssueCard, ToneLengthSelector
│   │   ├── preview/           # ResultPreviewPane, DiffViewer, DocumentStats
│   │   ├── modals/            # SettingsModal, RuleManagerModal, ExportModal
│   │   └── ui/                # Button, Badge, Card, Toast
│   ├── core/
│   │   ├── engine/            # segmenter.ts, diff.ts, deterministicRules.ts, localRewriter.ts, aiRewriter.ts
│   │   ├── state/             # editorStore.ts, rulesStore.ts, settingsStore.ts
│   │   └── bridge/            # tauriBridge.ts (Tauri invoke + browser dev mock fallback)
│   └── types/                 # TypeScript interfaces
├── tests/                     # Automated Vitest Test Suite
│   ├── segmenter.test.ts      # Sentence parsing & markdown AST preservation
│   ├── deterministicRules.test.ts # Lint rules (repetition, passive, length, typography, custom)
│   ├── diff.test.ts           # Word-level LCS diff algorithm
│   ├── localRewriter.test.ts  # Heuristic offline rewrite transformations
│   └── e2e_happy_path.test.tsx # Full E2E interactive rewrite & undo/redo workflow
└── package.json
```

---

## Quick Start (One Command)

### Prerequisites
- Node.js (v18+) and npm
- Rust toolchain (`cargo` and `rustc`)

### 1. Install dependencies
```bash
npm install
```

### 2. Run the application
Run the browser preview and test environment:
```bash
npm run dev
```
*(Runs on `http://localhost:1420` with instant hot-reload)*

Or run as a native desktop application with Tauri:
```bash
npm run tauri:dev
```

### 3. Run all tests
```bash
# Run TypeScript & React unit and E2E tests
npm test

# Run Rust filesystem and SQLite backend tests
cd src-tauri && cargo test
```

---

## Local Data Location & Backup Steps

All application data is stored purely on your local filesystem:

| Platform | Database & Local Settings Location |
| :--- | :--- |
| **macOS** | `~/Library/Application Support/WordCraft/wordcraft.sqlite` |
| **Linux** | `~/.local/share/WordCraft/wordcraft.sqlite` |
| **Windows** | `%APPDATA%\WordCraft\wordcraft.sqlite` |

### How to Backup Your Data:
1. To back up your custom rules, ignored terms dictionary, and recent document index:
   ```bash
   cp "$HOME/Library/Application Support/WordCraft/wordcraft.sqlite" ~/Desktop/wordcraft_backup.sqlite
   ```
2. To restore data, simply copy the file back to the `WordCraft` directory.

---

## Security & Secrets

- Secrets (optional API keys) are configured either in `.env` (using `.env.example` as a template) or in the desktop **Settings** modal.
- `.env` and `*.sqlite` are listed in `.gitignore` and are never committed.
- Offline by default: Zero external network calls are made unless you enter an API key and explicitly trigger a rewrite.

---

## Explicit Design Exclusions

By design, WordCraft deliberately omits:
- ❌ No user accounts, logins, or cloud subscriptions
- ❌ No telemetry, tracking, or usage analytics
- ❌ No hosted backend servers or cloud document synchronization
- ❌ No browser extensions or external web monitors
- ❌ No Office 365 or Google Docs plugin integrations
