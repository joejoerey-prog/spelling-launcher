# Contributing to Spelling Launcher

Thank you for your interest in contributing to **Spelling Launcher**. We welcome contributions that improve linguistic accuracy, runtime performance, and user experience whilst upholding our core principles: **100% local execution, zero telemetry, and strict single-engine authority**.

Please review the following guidelines before submitting issues or pull requests.

---

## 1. Core Architectural Tenets

Before proposing changes, please be mindful of our non-negotiable architectural principles:
1. **Single Engine Authority (Strategy H)**: All spelling checks and deterministic linguistic rules live exclusively within the pure-Rust `crates/spellcore` library and `crates/spellcheck-cli`. The TypeScript/React layers and Raycast extension are presentation and IPC layers only; they must never implement competing or fallback regex rules.
2. **Zero Cloud Telemetry**: Spelling Launcher operates completely offline. No tracking, telemetry, or external API calls are permitted for spellchecking. Optional tone rewrites communicate solely with a locally hosted Ollama server.
3. **Deterministic Mechanics**: Grammatical and mechanical corrections (pronoun capitalisation, time formatting, cardinal numbers, commercial genitives) must be deterministic, auditable, and verified by unit tests.
4. **Target Architecture**: The native AppKit `NSSpellChecker` integration specifically targets **macOS on Apple Silicon (`aarch64-apple-darwin`)**.

---

## 2. Setting Up Your Development Environment

### Prerequisites
- **Operating System**: macOS (Apple Silicon: M1/M2/M3/M4)
- **Rust**: Stable toolchain (`rustc`, `cargo` 1.78+)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup target add aarch64-apple-darwin
  ```
- **Node.js**: v20+ and `npm` v10+
- **Tauri Prerequisites**: Standard Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```
- **Local Ollama (Optional)**: If testing tone rewriting
  ```bash
  ollama run llama3.2:3b
  ```

### Initial Repository Setup
```bash
git clone https://github.com/<owner>/spelling-launcher.git
cd spelling-launcher
npm install
```

---

## 3. Running Tests and Verification

All changes must pass our full automated test suite and binary drift verification:

### Rust Workspace Tests
```bash
# Run all crate unit and integration tests
cargo test --workspace

# Run spellcore tests specifically
cargo test -p spellcore

# Run dirty-paragraph and 50k-word stress benchmarks
cargo test --test dirty_paragraph_tests
```

### Frontend and Integration Tests
```bash
# Run Vitest test suite (React components, state stores, LCS diffs)
npm test

# Run tests in watch mode
npm run test:watch
```

### Raycast Binary Drift Verification
If you modify `crates/spellcore` or `crates/spellcheck-cli`, you must re-sync the CLI binary to the companion Raycast extension and confirm zero drift:
```bash
# Synchronise binary and version manifest
./scripts/sync-raycast-cli.sh

# Confirm zero drift
./scripts/check-drift.sh
```

---

## 4. Building Releases

### Development Mode
```bash
# Run frontend in browser preview
npm run dev

# Run desktop application in development mode with Tauri
npm run tauri:dev
```

### Production Application Build
```bash
# Compile release DMG and application bundle
npm run tauri:build
```
The compiled macOS `.dmg` and `.app` bundle will be produced in `src-tauri/target/release/bundle/dmg/`.

---

## 5. Code Style and Conventions

- **Rust**:
  - Format with `cargo fmt`.
  - Ensure zero warnings with `cargo clippy --workspace --all-targets`.
  - Maintain documentation comments (`///`) on all public functions, structs, and rule definitions.
- **TypeScript / React**:
  - Strict TypeScript types; avoid `any`.
  - Tailwind CSS for component styling.
- **Language and Spelling**:
  - Use **UK English** spelling for documentation, comments, and commit messages (e.g. *behaviour*, *capitalisation*, *initialise*, *licence* as a noun).
- **Commit Messages**:
  - Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
    - `feat(core): add compound cardinal hyphenation`
    - `fix(punctuation): correct nominative pronoun casing inside quotes`
    - `docs: update setup instructions in README`
    - `test: add regression test for British time notation`

---

## 6. Reporting Bugs & Requesting Features

- **Bug Reports**:
  - Check existing GitHub Issues to avoid duplicates.
  - Include the macOS version, CPU architecture (`uname -m`), exact input text, expected output, and actual output.
  - Where possible, provide a minimal test case that reproduces the issue in `test_restoration.py` or `crates/spellcore/src/rules/`.
- **Feature Requests**:
  - Open a discussion or issue describing the use case.
  - Note that features requiring remote cloud backends or introducing non-deterministic spellchecking fall outside the project scope.

---

## 7. Licence

By contributing to Spelling Launcher, you agree that your contributions will be licenced under the project's [MIT Licence](LICENSE).
