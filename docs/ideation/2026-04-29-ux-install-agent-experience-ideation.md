# Ideation: CodeMap User Experience, Installation/Configuration, and Human vs AI Agent Experience

**Date:** 2026-04-29  
**Focus:** User experience, installation and configuration experience, human vs AI agent experience  
**Run ID:** 9e3b69d4496d7cc8  
**Agents dispatched:** 9 (codebase scan + learnings + web research + 6 ideation frames)

---

## Grounding Summary

### Codebase Context
CodeMap is a TypeScript/Node.js ESM CLI tool generating structured code maps (`AI_MAP.md`, `codemap.json`) for AI/Agent consumption. Uses `commander`, `tree-sitter`, `better-sqlite3`, `hono`. Layered architecture with `src/cli-new/` coexisting alongside `src/cli/`, signaling migration in progress. Heavy AI-agent governance docs (`AGENTS.md`, `CLAUDE.md`, `.claude/`, `.kimi/`, `.agents/`).

### Key Pain Points
- **Native dependency install friction** (`better-sqlite3`, `tree-sitter` often fail without build tools) — #1 drop-off point
- **Broken promises in `package.json`** (`check:architecture`, `check:unused` are no-ops)
- **Dual CLI confusion** (`cli/` + `cli-new/`)
- **MCP underpowered** (only 2 tools: `codemap_query`, `codemap_impact`)
- **Agent interface inconsistency** (`--json` not uniform, silent failures, low confidence on explicit paths)
- **Onboarding overload** — manual skill copying from `examples/`
- **Agent dogfood rated 6/10** agent-friendly (2026-04-17)

### Past Learnings
- `init` redesigned as "project state reconciler" with `.mycodemap/` workspace (v1.7 shipped)
- v0.5.1 install bug: `devDependencies` used at runtime caused global install crashes
- CLI surface cleanup (v1.0): removed commands with explicit failure + migration messages
- Three-layer readiness gate (`hard`/`warn-only`/`fallback`) from v1.11

### External Context
- CLI is beating MCP for coding agents in 2025-2026 due to token efficiency
- Agent-native patterns: JSON-first, structured errors, predictable exit codes, field filtering, `--help-json`, progress on stderr
- Prior art: `hubspot-cli` (dual entry point), `gdelt-cli` (machine-readable help), `discord-cli` (YAML structured output)
- Snyk praised for smoothest onboarding (`snyk test` = seconds)
- Research pain points: false positives up to 60%, lack of meaningful messages, configuration effort

---

## Raw Candidate Pool

52 candidates generated across 6 ideation frames + 4 cross-cutting combinations. Full list preserved in checkpoint:
`/tmp/compound-engineering/ce-ideate/9e3b69d4496d7cc8/raw-candidates.md`

### Frame Summary
| Frame | Count | Key Themes |
|-------|-------|------------|
| Pain and friction | 8 | Graceful degradation, presumptive onboarding, unified CLI, agent handshake, streaming MCP, confidence metadata, pre-install check, doctor |
| Inversion/removal/automation | 8 | Zero-command install, config-as-cache, honest CLI, intent router, JSON-RPC daemon, auto-provisioned skills, failure-to-action, CLI-as-MCP gateway |
| Assumption-breaking | 8 | Zero-install runtime, split human/agent interface, self-healing init, SDK mode, confidence-first output, progressive disclosure, git-native maps, declarative contract |
| Leverage/compounding | 8 | WASM-first build, auto-reconciling state, interface contract architecture, zero-config preview, structured errors, skill ecosystem, agent-native mode, uncertainty budget |
| Cross-domain analogy | 8 | Auto-mode installer, RPG onboarding, Netflix recommendations, language server daemon, tasting menu presets, accessibility profiles, pairing mode, confidence routing |
| Constraint-flipping | 8 | 100ms install, self-teaching CLI, AI-first default, fingerprint config, unconfigurable tool, MCP-primary, concierge daemon, self-healing promise |

---

## Explicit Rejections (Why These Did Not Survive)

### Rejected: Incremental / Already In Progress
- **Unified CLI Surface with Subcommand Shadows** — Addresses real pain but is essentially "finish the cli-new migration," already in progress. Not an ideation breakthrough.
- **Presumptive Onboarding / Config Proposed Not Asked** — Overlaps with existing v1.7 init reconciler design; less precise than Zero-Config Preview.
- **Streaming MCP with Progress Tokens** — Good but naturally follows from CLI-as-MCP Gateway; not a standalone priority.

### Rejected: Over-Engineered / Heavy Solutions to Simple Problems
- **Agent Handshake Protocol** — Over-engineered for the actual problem: inconsistent `--json` and silent failures. A formal pre-command negotiation adds complexity; explicit flags/env vars are simpler.
- **Smart Home "Pairing Mode" Auto-Negotiation** — Auto-detecting agent vs human is fragile (env vars, parent process names). Explicit `--agent` or `CODEMAP_MACHINE=1` is more reliable.
- **Intent-Based Unified Router / Natural Language** — "Map my backend API surface" is cool but adds NLP complexity for marginal gain over good subcommand naming.

### Rejected: Too Speculative / Missing Prerequisites
- **100ms Install Mandate: Pure-JS Mode** — More extreme than WASM-first. Node 22+ `node:sqlite` is not universally available. Pure-JS tree-sitter grammar pack doesn't exist yet.
- **The Embedded CodeMap / SDK Mode** — Powerful but scope explosion. If WASM-first happens, SDK mode becomes natural. Doing both simultaneously is too much.
- **10x Budget: Agent Concierge Mode / Daemon + IDE Extension** — Visionary but the project already deferred viz/TUI/API (MVP3 PRD). A daemon is an architectural commitment for a future milestone.
- **No Users, Only Agents: MCP as Primary Interface** — Inverts reality: the CLI exists and works. Making MCP primary would discard human UX investment.

### Rejected: Provocative but Not Actionable
- **Team of One: The Unconfigurable Tool** — Radical convention-over-configuration that would alienate power users and non-standard projects.
- **Self-Correcting CLI Surface / Honest CLI** — "CLI audits itself on startup" is harder to implement and explain than a `doctor` command. Overlaps with #7 survivor.
- **The Declarative Project Contract / codemap.yaml** — Overlaps with existing `.mycodemap/config.json` approach. YAML doesn't add enough value to justify migration.

### Rejected: Framing Devices, Not Technical Directions
- **Video Game Accessibility Profiles** — Good analogy but essentially combines "split interface" + "AI-first default" into a framing device.
- **RPG "First Quest" Tutorial Onboarding** — UX polish framing of Zero-Config Preview. The tutorial aspect is surface, not architecture.
- **Fine Dining "Tasting Menu" Presets** — Same as accessibility profiles; a UX framing of modes that already exist in other forms.
- **Airport Customs "Green Lane / Red Lane"** — Clever analogy but confidence routing is already captured by Confidence-First Output.

### Rejected: Overlap with Stronger Survivors
- **Pre-Install Environment Contract Check** — Narrower than WASM-first; solves same problem less completely.
- **The Self-Healing Init** — Covered by existing init reconciler + doctor command.
- **Auto-Reconciling Project State** — Extension of existing v1.7 init reconciler; incremental, not breakthrough.
- **Netflix "Because You Watched" Config Recommendations** — Incremental enhancement to init; not a distinct direction.
- **Structured Error Recovery Protocol** — Overlaps heavily with Failure-to-Action Protocol.
- **Configuration as a Cache, Not a Contract** — Interesting reframing but risks making configuration opaque and hard to debug.
- **Agent-Native Streaming Protocol / JSON-RPC Daemon** — High complexity; daemon mode deferred per project scope.
- **No Docs Allowed: The Self-Teaching CLI** — Framing device; interactive help is a feature, not a strategic direction.
- **1M Users, Zero Support: Auto-Configured by Fingerprint** — Overlaps with Zero-Config Preview + existing init reconciler.

---

## Top Survivors (Ranked)

### 1. Machine-Readable Interface Contract as Core Architecture
**Source:** Leverage frame  
**Idea:** Define the entire CLI surface as a formal schema (commands, args, flags, output shapes, error codes) in a single source-of-truth file. Generate the human CLI parser, the MCP server, `--help-json`, shell completions, and documentation from this schema. Never hand-write argument parsing or output formatting again.

**Why it survived:**
- **Highest leverage:** Every new command automatically gets full agent support, MCP exposure, and perfect consistency.
- **Addresses root cause:** `--json` inconsistency, MCP underpoweredness, and agent-friendly 6/10 rating all stem from hand-maintained dual surfaces.
- **Compounding:** As the CLI grows, the benefit multiplies. Adding one schema entry creates CLI flag, MCP tool, help text, and completion in one shot.
- **Grounded:** Agent-native patterns from external research explicitly demand JSON-first, structured errors, and `--help-json`. This makes them free.

**Risks:** Upfront schema design effort; migration of existing commands. Mitigation: incremental adoption, one command at a time.

---

### 2. WASM-First Build, Native-Opt-In Runtime
**Source:** Leverage frame / Constraint-flip frame  
**Idea:** Ship `tree-sitter` and `better-sqlite3` as WASM modules by default; detect and opportunistically upgrade to native binaries only when the environment supports it and the user opts in. `npm install codemap` works on every platform, every CI image, every fresh laptop with zero build tools.

**Why it survived:**
- **#1 pain point killer:** Native dependency install friction is the top drop-off point. This eliminates it entirely.
- **Proven pattern:** esbuild's WASM fallback mode works in the same ecosystem. `web-tree-sitter` exists. Node 22 ships `node:sqlite` built-in.
- **Platform coverage:** Reaches 100% of users instead of 70% who have build tools installed.
- **Agent value:** Eliminates environment-dependent failures that break automated workflows.

**Risks:** Performance regression for very large repos. Mitigation: native opt-in for performance-sensitive users; benchmark WASM vs native.

---

### 3. CLI-as-MCP Automatic Gateway
**Source:** Inversion frame  
**Idea:** Implement a generic `--mcp-stdio` adapter that dynamically exposes every CodeMap CLI subcommand as an MCP tool with auto-generated JSON schemas derived from TypeScript types (or the Interface Contract schema). Adding a new CLI command instantly creates a new MCP tool with zero extra work. The entire CLI surface becomes the MCP surface.

**Why it survived:**
- **Closes the integration gap:** MCP is currently underpowered (2 tools) while CLI has 20+ commands. Agents route around MCP to CLI because of this.
- **Eliminates drift:** No more hand-maintained MCP server that lags behind CLI features.
- **Depends on #1:** Best paired with Interface Contract architecture, but can start with TypeScript type reflection.
- **High agent impact:** Transforms MCP from a second-class citizen into a first-class, complete interface.

**Risks:** MCP schema generation must handle complex nested types. Mitigation: start with simple commands, iterate.

---

### 4. AI-First Default, Human-Pretty Optional
**Source:** Constraint-flip frame / Assumption-breaking frame  
**Idea:** Flip the output paradigm. All commands emit structured JSON/NDJSON on stdout by default. A `--human` flag (or auto-detected TTY) pipes through a built-in renderer for tables, spinners, and color. Progress goes to stderr as structured events. This makes the CLI natively composable for agents without special flags.

**Why it survived:**
- **Directly fixes agent inconsistency:** The current `--json` bolt-on is inconsistent across commands. Making structured output the default forces consistency.
- **External evidence:** Research confirms CLI beats MCP for token efficiency when structured. This maximizes that advantage.
- **Low implementation risk:** TTY detection is standard; renderers can be built incrementally.
- **Composable:** `codemap analyze | jq '.findings[] | select(.severity=="high")'` works out of the box.

**Risks:** Breaking change for existing human users who expect pretty output. Mitigation: major version bump; TTY auto-detection preserves current behavior for interactive use.

---

### 5. Zero-Config Preview / Progressive Commitment Model
**Source:** Leverage frame / Cross-domain analogy  
**Idea:** `npx codemap` with no config, no init, no flags performs a full analysis and emits a rich preview (top-level summary, detected project type, sample map). It then offers: "Looks good? Run `codemap --persist` to save configuration and generate full artifacts." No setup, no decisions, no config files until the user sees value.

**Why it survived:**
- **Snyk-inspired:** Snyk is praised for smoothest onboarding because `snyk test` demonstrates value in seconds.
- **Low implementation cost:** Can be built on top of existing init reconciler and analysis pipeline.
- **High conversion impact:** Removes the fear of side effects from trying the tool.
- **Dual audience:** Humans see a preview and decide; agents can run `--persist` non-interactively.

**Risks:** Preview must be fast (<5 seconds) or it backfires. Mitigation: default to shallow/symbolic scan for preview; deep analysis on demand.

---

### 6. Failure-to-Action Protocol
**Source:** Inversion frame / Leverage frame  
**Idea:** Every error returns a structured document containing: what was attempted, the root cause, a machine-readable remediation plan, and a confidence score. For native dep failures: auto-suggest `--wasm-fallback` or a prebuilt binary URL. For agents, errors include the exact next command to try. Errors become state transitions, not dead ends.

**Why it survived:**
- **Addresses silent failures:** The dogfood report explicitly found `analyze -i find` failing silently with near-empty JSON. This makes every failure explicit and actionable.
- **Research-backed:** Studies cite "lack of meaningful messages" as a top pain point for code analysis tools.
- **Agent self-healing:** Agents can attempt remediation without human intervention.
- **Incremental:** Can be adopted command by command; doesn't require a big-bang rewrite.

**Risks:** Remediation suggestions can be wrong, creating cascading failures. Mitigation: confidence scoring on suggestions; never auto-execute without `--apply-suggestion`.

---

### 7. codemap doctor as Continuous Health Monitor
**Source:** Pain frame / Constraint-flip frame  
**Idea:** A living diagnostics command that audits the entire CodeMap ecosystem: detects no-op scripts in `package.json` (`check:architecture`, `check:unused`), verifies native dep health, checks `.mycodemap/` workspace drift, validates CLI vs MCP version skew, and runs agent interface regression checks. Emits both human-readable reports and machine-readable diagnostics. Can run in CI as a health gate.

**Why it survived:**
- **Familiar pattern:** `npm doctor`, `brew doctor`, `flutter doctor` — users know what to expect.
- **Addresses broken promises directly:** Surfaces the no-op scripts and other latent brokenness that erodes trust.
- **CI-friendly:** Machine-readable output enables automated health checks in CI pipelines.
- **Incremental:** Each diagnostic is a small addition; the command grows over time.

**Risks:** Can become a dumping ground for random checks. Mitigation: categorize diagnostics (install, config, runtime, agent); require evidence tags for each check.

---

### 8. Auto-Provisioned Agent Skills / Self-Distributing Integration
**Source:** Inversion frame  
**Idea:** When CodeMap detects it is being invoked by an AI agent (via `KIMI_`, `CLAUDE_`, or `CODEX_` env vars), it automatically writes or updates the appropriate skill files into the agent's skill directory (`.claude/skills/codemap/`, `.kimi/skills/codemap/`). The tool maintains its own bindings, ensuring agents always use the latest integration layer.

**Why it survived:**
- **Directly solves onboarding overload:** "Manual skill copying from `examples/`" is explicitly cited as a pain point.
- **Self-describing:** CodeMap knows its own CLI schema better than any human; it should generate its own agent integration.
- **Version safety:** Skills stay in sync with the installed CodeMap version.
- **Low cost if paired with #1 and #3:** If we have an interface contract and auto-generated MCP, skill generation is a thin layer on top.

**Risks:** Overwriting user-customized skill files. Mitigation: write to `.mycodemap/skills/` and symlink/copy to agent dirs; never modify existing files without `--force`.

---

## Cross-Cutting Synthesis

Three meta-patterns emerge from the survivors:

### A. Self-Describing Universal API (#1 + #3 + #8)
If the CLI surface is defined as a machine-readable contract, then:
- The MCP server generates automatically (#3)
- Agent skills generate automatically (#8)
- `--help-json`, shell completions, and docs generate automatically (#1)
- Every new CLI command is instantly agent-ready

This is the **highest-compounding architectural bet** in the entire ideation set.

### B. Zero-Friction Installation & Onboarding (#2 + #5)
WASM-first eliminates install failures (#2). Zero-config preview eliminates configuration anxiety (#5). Together they create a "Snyk-class" onboarding where a new user goes from "heard about it" to "seeing value" in under 10 seconds with zero prerequisites.

### C. Trust Architecture (#6 + #7 + confidence implications of #1)
Failure-to-action protocol makes errors recoverable (#6). Doctor command continuously audits health (#7). Interface contract ensures output schemas are predictable (#1). Together they address the agent-friendly 6/10 rating by making the tool transparent, honest, and self-healing.

---

## Ideas by Dimension

| Dimension | Top Idea |
|-----------|----------|
| **Workflow / DX** | Zero-Config Preview (#5) — demonstrates value before asking commitment |
| **Reliability** | WASM-First Build (#2) — eliminates #1 source of install failures |
| **Extensibility** | Interface Contract Architecture (#1) — every new feature is agent-ready by construction |
| **Missing capabilities** | CLI-as-MCP Gateway (#3) — closes the 2-tool gap |
| **Docs / Knowledge compounding** | Auto-Provisioned Skills (#8) — self-generating agent integration |
| **Quality / Maintenance** | codemap doctor (#7) — continuous health monitoring |
| **Agent experience** | AI-First Default (#4) — JSON-first, consistent, composable |
| **Error handling** | Failure-to-Action Protocol (#6) — structured, recoverable errors |

---

## Next Steps Menu

This ideation artifact identifies promising directions. The next step depends on what you want to do with these ideas:

1. **Refine** — Deep-dive into one or more survivors, exploring edge cases, implementation approaches, and interdependencies.
2. **Brainstorm** — Select one survivor and define it precisely enough for planning (requirements, boundaries, acceptance criteria). This hands off to `ce:brainstorm`.
3. **Save and end** — Archive this ideation and return to it later when priorities shift.

> **Routing note:** `ce:ideate` answers "What are the strongest ideas worth exploring?" `ce:brainstorm` answers "What exactly should one chosen idea mean?" `ce:plan` answers "How should it be built?" Do not skip to planning from ideation output.
