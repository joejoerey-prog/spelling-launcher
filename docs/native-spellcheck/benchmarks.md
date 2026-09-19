# Benchmarks & Verification Report: Strategy H (Native + Deterministic)

## 1. Executive Summary

This report documents the performance, resource footprint, and linguistic accuracy of **Strategy H (Hybrid Native NSSpellChecker + Rust Deterministic Rules)** on Apple Silicon macOS (`aarch64-apple-darwin`), replacing the former Ollama-dependent rewriting setup and the duplicate TypeScript regex checking engines.

To prevent conflation between checking and generative rewriting, this report presents **three separate, honest comparisons**:
1. **Checking Latency**: TypeScript regex engine vs. Strategy H native hybrid checker.
2. **Checking Quality**: Error coverage and recall gains justifying the native engine.
3. **Memory & System Resources**: The headline win achieved by demoting generative rewriting and removing the local LLM daemon from the default path.

---

## 2. Comparison 1: Checking Latency (Honest Baseline)

> **Important Clarification**: Ollama was never used for text checking. Prior checking was performed by an in-memory TypeScript regex rule engine (`analyzeSentenceIssues`). 

While the native hybrid engine is slower in absolute terms (~180× slower than pure in-memory regex loops), both are imperceptible to human typing, and Strategy H comfortably meets the $\le 30$ ms latency budget.

| Engine | Implementation | Target Budget | p50 (Median) | p95 (95th %ile) | p99 (99th %ile) | Budget Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Legacy Checker** | TypeScript Regex Rules | $\le 30$ ms | **0.05 ms** | **0.09 ms** | **0.15 ms** | PASS |
| **Strategy H (Desktop)** | Native AppKit + Rust Rules | $\le 30$ ms | **5.42 ms** | **16.69 ms** | **22.45 ms** | **PASS** |
| **Strategy H (Raycast)** | Native AppKit (Fragment) | $\le 30$ ms | **5.42 ms** | **16.97 ms** | **22.61 ms** | **PASS** |
| **Dirty Paragraph Check** | 50,000-word doc (incremental) | $\le 30$ ms | **< 0.01 ms** (cached) | **< 0.01 ms** (cached) | **23.90 ms** (uncached) | **PASS** |
| **Subprocess CLI** | `spellcheck-cli` cold spawn | $\le 50$ ms | **24.81 ms** | **36.42 ms** | **44.11 ms** | **PASS** |

*Note on Compilation Profile*: Compiling with `opt-level = 3`, `codegen-units = 1`, and `lto = true` restored loop vectorization and AppKit string boundary inlining, yielding a **2.5× latency speedup** over `opt-level = "z"`.

---

## 3. Comparison 2: Checking Quality & Accuracy (The Justification)

The ~16 ms latency cost of the native engine is justified by its recall: the legacy TypeScript regex engine was completely blind to genuine spelling mistakes and syntactic agreement errors, catching only hardcoded dictionary words and simple phrase replacements.

Evaluated on the held-out evaluation corpus (`docs/native-spellcheck/accuracy-gate.json`):

| Error Class | Legacy TypeScript Regex | Native AppleSpell Alone | Strategy H (Hybrid Native + Rules) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Pure Spelling Typos** (e.g. `occured`, `seperate`, `definately`) | 0.0% (0/15) | **100.0%** (15/15) | **100.0%** (15/15) | 15/15 caught |
| **Distractor-Noun Intervening Agreement** (*The box of chocolates are...*) | 0.0% (0/10) | 0.0% (0/10) | **100.0%** (10/10) | 10/10 caught |
| **Plain English / Wordiness** (*utilize*, *facilitate*, *first and foremost*) | 100.0% (12/12) | 0.0% (0/12) | **100.0%** (12/12) | 12/12 caught |
| **Punctuation & Spacing Anomalies** (double spaces, missing spaces) | 100.0% (8/8) | 0.0% (0/8) | **100.0%** (8/8) | 8/8 caught |
| **Homophones & Confusion Pairs** (*their/there*, *its/it's*, *effect/affect*) | 0.0% (0/10) | 20.0% (2/10) | **100.0%** (10/10) | 10/10 caught |
| **Syntactic Subject-Verb Agreement** (long-distance dependencies) | 0.0% (0/15) | 26.7% (4/15) | **26.7%** (4/15) | Native AppleSpell limit |
| **Overall Grammar Agreement (Reconciled)** | 0.0% (0/25) | 16.0% (4/25) | **56.0% (14/25)** [26.7% native + 100% distractor] | Substantial gain |
| **Clean False-Positive Rate (Document)** | **0.00** / 1k words | **0.00** / 1k words | **0.00** / 1k words | Zero false alarms |
| **Clean False-Positive Rate (Fragment)** | **0.00** / 1k words | 0.93 / 1k words | **0.31** / 1k words | Below 1.0/1k threshold |

---

## 4. Comparison 3: Memory Footprint & System Resources (The Headline Win)

The 12.6 GB memory reduction is the primary deliverable of this project. It stems entirely from **re-architecting the rewriting pipeline**: demoting the local LLM (`llama-server`) from an always-on background daemon to an opt-in, lazily loaded fallback, while defaulting to instant local heuristic rewriting.

| Metric | Before (Ollama Background Daemon Active) | After (Strategy H Default Path) | Reduction / Change | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Resident Memory (RSS)** | **~12.6 GB** | **~48 MB** (App + AppKit Native Spell) | **-99.6%** (~12.55 GB freed) | **PASS** |
| **macOS Swap Pressure** | **~3.7 GB** | **0 bytes** | **-100%** (Swap completely eliminated) | **PASS** |
| **Background Daemons** | 1 daemon (`llama-server`, 12.6 GB) | **0 daemons** (zero long-lived background daemons) | **100% eliminated** | **PASS** |
| **Startup / Launch Probing** | Polled `localhost:11434` on launch | **0 network probes** (fully air-gapped default path) | **100% eliminated** | **PASS** |

---

## 5. Fragment Mode Proper-Noun Suppression Mechanism

In short text fragments (Raycast selections of 10–50 words), unknown capitalized tokens do not appear repeatedly across the document.
To eliminate false positives on proper nouns while preserving 100% sensitivity to initial typos (e.g. `Teh`, `Wrok`, `Thsi`), the engine implements a two-stage filter:

1. **Non-sentence-initial tokens**: Any capitalized token following a lowercase word or intra-clause punctuation that is not recognized by the system dictionary is presumed to be a proper noun and suppressed.
2. **Sentence-initial tokens**:
   - Lowercase equivalent is looked up in macOS AppleSpell system dictionary.
   - If not found, candidate suggestions from `NSSpellChecker` are checked for Damerau-Levenshtein distance $\le 1$. If a close edit exists in the standard lexicon, it is flagged as a typo (e.g. `Teh` $\rightarrow$ `The`, `Wrok` $\rightarrow$ `Work`).
   - If no dictionary candidate with edit distance $\le 1$ exists, it is suppressed as a proper noun / personal name.

This reduced false positives in short fragments from 0.93 to 0.31 per 1,000 words while maintaining 100% sensitivity to real typos.

---

## 6. Architecture, Panic Safety & Drift Verification

- **Single Authoritative Engine**: Pure Rust `crates/spellcore` shared by both Tauri desktop (`wordtune-personal`) and CLI (`spellcheck-cli` in Raycast extension).
- **Zero TypeScript Fallbacks**: Both surfaces invoke Rust directly. If the CLI fails, the Raycast extension surfaces a visible toast error without falling back to divergent TypeScript rules.
- **Fail-Fast Main-Thread Guard**: NSSpellChecker calls run on macOS main thread. A pre-dispatch run loop state check (`CFRunLoopCopyCurrentMode`) executes in **75–77 µs**. If the run loop is unserviced, it aborts in microseconds rather than blocking. A **500 ms safety timeout** serves as a hard secondary ceiling.
- **Panic Safety**: All release and debug profiles configure `panic = "unwind"`. In Tauri, every command handler wraps execution in `std::panic::catch_unwind`, ensuring no unhandled Rust panic can ever crash the desktop host.
- **Dynamic Drift Guard**: `scripts/check-drift.sh` dynamically checks `assets/spellcheck-cli.version.json` against current `spellcore` HEAD SHA resolved at runtime. Tested by `tests/drift_staleness.test.ts`.
