# 🚀 Spelling Launcher Desktop

[![CI](https://github.com/joerey/spelling-launcher/actions/workflows/ci.yml/badge.svg)](https://github.com/joerey/spelling-launcher/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![Platform: macOS Apple Silicon](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)-black.svg)](https://apple.com)

**Spelling Launcher Desktop** is a private, local-first sentence writing, proofreading, and rewriting workbench for macOS. Built with **Tauri 2, React 18, TypeScript, Rust, and SQLite**, it operates 100% locally on your machine with **zero telemetry, zero analytics, no cloud accounts, and no background document uploads**.

---

## 🌟 Overview & Philosophy

Traditional writing assistants require sending your private documents and keystrokes to third-party cloud servers. Spelling Launcher provides a robust alternative by combining:
1. **Apple's Native Proofreading Engine (`NSSpellChecker`)**: Low-latency, native macOS spelling dictionaries (`en_GB` default with Oxford *-ize* acceptance).
2. **Deterministic British English Mechanics (`spellcore`)**: Pure-Rust rules for nominative pronoun capitalisation (`I`), Roman numeral protection, British dot time notation (`9.30 am`), compound cardinals (21–99), commercial genitives, and honorifics.
3. **Local AI Rewriting (Opt-In)**: Privacy-preserving generative tone rewrites powered by a locally hosted Ollama instance (`llama3.2:3b`).

---

## 🏗️ Architecture (Strategy H: Single Shared Core)

Spelling Launcher enforces **Strategy H**: a single, authoritative Rust core (`crates/spellcore`) shared seamlessly between the Desktop application and the companion Raycast extension.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Spelling Launcher Ecosystem                       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│   Spelling Launcher Desktop   │               │   Spelling Launcher Raycast   │
│      (wordtune-personal)      │               │  (spelling-launcher-raycast)  │
├───────────────────────────────┤               ├───────────────────────────────┤
│ • Three-Pane Editor & Diffs   │               │ • Global System-Wide Hotkey   │
│ • Full Document Statistics    │               │ • 1-Click Quick Polish HUD    │
│ • Local SQLite Persistence    │               │ • Paste-Back into Any App     │
│ • React 18 + Tauri 2 Runtime  │               │ • Sub-30ms Proofreading       │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │ (IPC / Rust FFI)                              │ (Subprocess CLI)
                ▼                                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                      Authoritative Rust Core Workspace                        │
│                                                                               │
│  ┌─────────────────────────┐               ┌───────────────────────────────┐  │
│  │   crates/spellcheck-cli │               │       crates/spellcore        │  │
│  │   • Headless CLI tool   │◄──────────────┤   • Pure-Rust rule engine     │  │
│  │   • Zero-drift version  │  statically   │   • AST Masker (Code/URLs)    │  │
│  │     manifest handshake  │    links      │   • LRU Cache (50k words)     │  │
│  └─────────────────────────┘               └───────────────┬───────────────┘  │
│                                                            │                  │
│                                                            ▼                  │
│                                            ┌───────────────────────────────┐  │
│                                            │  Native macOS AppKit Bridge   │  │
│                                            │  • objc2 NSSpellChecker       │  │
│                                            │  • Dual-dict en_GB & en_US    │  │
│                                            │  • Oxford -ize auto-fallback  │  │
│                                            └───────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **Three-Pane Writing Studio**:
  - **Source Editor (Left)**: Interactive sentence inspector. Click any sentence to focus and inspect linguistic checks.
  - **Suggestions & Rewrites (Centre)**: Deterministic linguistic checks (repeated words, passive voice, length warnings, typography) and side-by-side rewrite options with visual word-level LCS diffs (green additions, red deletions).
  - **Accepted Result Preview (Right)**: Real-time Markdown and plain-text preview with session diff highlighting, reading statistics, and one-click copy or export.
- **Tone, Length, & Fluency Controls**:
  - **Tones**: Natural, Casual, Professional, Academic, Confident, Direct.
  - **Lengths**: Standard, Shorten (Concise), Expand (Elaborate).
- **Deterministic Linguistic Checks**:
  - **Pronoun Capitalisation**: Automatically capitalises `I`, `I’m`, `I'll`, `I've`, `I'd` across all syntactic positions whilst safeguarding lowercase Roman numerals (e.g. `section i`).
  - **British Dot Time Notation**: Normalises 12-hour timestamps (`930 am` $\rightarrow$ `9.30 am`, `530 pm` $\rightarrow$ `5.30 pm`).
  - **Compound Cardinals (21–99)**: Automatically hyphenates compound numbers (`twenty-one`, `thirty-five`, `ninety-nine`).
  - **Commercial Genitives & Honorifics**: Formats British retail apostrophes (`chemist's`, `baker's`) and academic/chivalric titles (`Sir`, `Prof`, `Dr`, `Inspector`) without trailing full stops.
  - **AST Masking**: Fully masks code blocks, inline backticks, URLs, and email addresses from spellchecking.
- **Local Persistence & Data Safety**:
  - Atomic saving with `.bak` safety backups.
  - Local SQLite database storing custom rules and user dictionaries.
  - Full Undo (`Cmd+Z`) and Redo (`Cmd+Shift+Z`) history stack.

---

## 💻 System Requirements

- **Operating System**: macOS 13 (Ventura) or later.
- **Hardware**: **macOS on Apple Silicon (`aarch64-apple-darwin`)**.
  > [!IMPORTANT]
  > Intel (`x86_64`) architecture and Windows/Linux systems are currently unsupported due to the native macOS AppKit (`NSSpellChecker`) integration.

---

## 📦 Installation

### Option 1: Download Release (Recommended for Users)
1. Navigate to the [GitHub Releases](https://github.com/joerey/spelling-launcher/releases) page.
2. Download the latest `Spelling-Launcher_<version>_aarch64.dmg`.
3. Open the `.dmg` and drag **Spelling Launcher.app** into your `/Applications` folder.

### Option 2: Build from Source (Developers)

#### Prerequisites
- Node.js (v20+) and `npm`
- Rust toolchain (`cargo` and `rustc` 1.78+)
- Xcode Command Line Tools (`xcode-select --install`)

#### Build Steps
```bash
# 1. Clone repository
git clone https://github.com/joerey/spelling-launcher.git
cd spelling-launcher

# 2. Install dependencies
npm install

# 3. Run in development mode (browser preview)
npm run dev

# 4. Run desktop application with Tauri
npm run tauri:dev

# 5. Compile production DMG and application bundle
npm run tauri:build
```

The production `.dmg` installer will be located in `src-tauri/target/release/bundle/dmg/`.

---

## ⚙️ Configuration

### 1. Proofreading Language
Spelling Launcher defaults to **British English (`en_GB`)** with automatic Oxford *-ize* acceptance. You can toggle between `en_GB` and `en_US` via the **Settings** modal (`Cmd+,`).

### 2. Local AI Rewriter Setup (Optional)
To enable multi-version generative tone rewrites:
1. Install [Ollama](https://ollama.ai).
2. Pull the recommended lightweight model:
   ```bash
   ollama run llama3.2:3b
   ```
3. In Spelling Launcher **Settings**, ensure the host is set to `http://localhost:11434` and the model is set to `llama3.2:3b`.
4. *Zero Network Calls*: Spelling Launcher never probes or loads Ollama for instant spellchecking; it is contacted strictly when you explicitly request a tone rewrite.

---

## ⚠️ Known Limitations

1. **Syntactic Recall**: Syntactic and contextual grammar recall is measured at 56% on held-out benchmark corpora. Common grammatical confusions are handled deterministically, but long-range syntactic re-orderings require human review.
2. **Local AI Rewriter Dependency**: Generative tone rewrites require a local Ollama instance running `llama3.2:3b`. Vision models (e.g. `*vl*` or `*vision*`) are strictly blocked by runtime guardrails.
3. **Platform Availability**: Native spellchecking requires macOS AppKit. Windows and Linux builds are not currently supported.

---

## 🧪 Testing & Verification

Run the full automated verification suite:

```bash
# 1. Run Rust unit, stress, and AppKit tests
cargo test --workspace

# 2. Run React & Vitest component test suite
npm test

# 3. Verify CLI and Raycast binary drift
./scripts/check-drift.sh
```

---

## 🤝 Contributing

We welcome community contributions, bug reports, and suggestions. Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code style, test expectations, and pull request workflow.

---

## 📄 Licence

This project is licenced under the terms of the [MIT Licence](LICENSE).
