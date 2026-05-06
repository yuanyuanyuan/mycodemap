# Architecture Research

**Domain:** AI-native code analysis CLI architecture foundation
**Researched:** 2026-05-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Entry Surfaces                           │
├─────────────────────────────────────────────────────────────┤
│ CLI commands        MCP native tools     MCP contract tools │
│ (`src/cli/...`)     (`codemap_query`)    (`codemap_*`)      │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
               ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Execution / Service Seams                    │
├─────────────────────────────────────────────────────────────┤
│ parser orchestration │ storage runtime │ query/impact svc   │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
               ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Truth Layer                  │
├─────────────────────────────────────────────────────────────┤
│ parser factory/registry │ SQLite runtime │ graph storage    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| parser entrypoint | 决定主流程解析器与 mode contract | `src/parser/index.ts` + `src/core/analyzer.ts` |
| parser registry | 抽象多语言解析器注册与 extension lookup | `src/infrastructure/parser/*` |
| storage runtime/factory | 决定 backend、fallback、错误语义 | `src/cli/storage-runtime.ts` + `src/infrastructure/storage/StorageFactory.ts` |
| MCP native tools | 返回真实 structured result | `src/server/mcp/server.ts` + `service.ts` |
| MCP contract tools | 当前只做 CLI contract 暴露，需在 v2.2 收敛到真实执行 | `src/server/mcp/schema-adapter.ts` |

## Recommended Project Structure

```text
src/
├── cli/commands/                 # CLI wrappers; long-term should be thin
├── server/mcp/                   # MCP transport, native tools, contract adapters
├── parser/                       # legacy parser entrypoint and parser implementations
├── infrastructure/parser/        # language parser registry and multi-language infra
├── infrastructure/storage/       # storage factory, adapters, sqlite runtime
└── core/                         # orchestration and graph construction
```

### Structure Rationale

- **`parser/` vs `infrastructure/parser/`:** 当前存在 legacy entrypoint 与新 registry 基础设施双轨，v2.2 的关键不是再加第三层，而是决定谁成为唯一 truth。
- **`server/mcp/`:** 已经有 native vs contract 双路径，是 direct execution 切换的天然边界。
- **`infrastructure/storage/`:** 现有 storage factory 与 adapter 已分层，适合把 breaking change 限制在 factory/config/runtime seam，而不是散改命令层。

## Architectural Patterns

### Pattern 1: Single Truth Entry for Parser Selection

**What:** 让 parser 选择逻辑只存在一个入口，而不是 `createParser()`、`analyze()`、registry 各自维护一份 truth。  
**When to use:** parser 主路径切换、废弃旧 mode、扩语言支持。  
**Trade-offs:** upfront refactor 成本高，但能明显降低 docs/config/test drift。

### Pattern 2: Actionable Failure Boundaries

**What:** backend 不可用时返回结构化错误和修复建议，而不是 silent fallback。  
**When to use:** storage convergence、native dependency 缺失、config breaking change。  
**Trade-offs:** 需要同步 CLI/MCP/error-code/docs，但能避免“看似成功、实际降级”的假象。

### Pattern 3: Shared Command Service for CLI + MCP

**What:** 先抽 pure function/service，再让 CLI 和 MCP 只是不同 adapter。  
**When to use:** 当前任何仍由 MCP 返回 `cli_redirect` 的 contract tool。  
**Trade-offs:** 需要先拆命令文件，但这是缩短 `src/cli/commands/*.ts` 的唯一可持续路径。

## Data Flow

### Request Flow

```text
CLI/MCP request
    ↓
command wrapper / MCP adapter
    ↓
shared service seam
    ↓
parser or storage runtime
    ↓
structured result / actionable error
```

### Key Data Flows

1. **Parser flow:** config mode → parser selection → parse results → graph build  
2. **Storage flow:** storage config → runtime selection → graph persistence/query → metadata/error envelope  
3. **MCP flow:** tool input schema → service execution → structuredContent → agent consumption

## Anti-Patterns

### Anti-Pattern 1: Dual Entry Truth

**What people do:** 一边保留 legacy parser entrypoint，一边新增 registry，却不明确谁是主流程。  
**Why it's wrong:** 每个调用点都可能单独判断 mode/backend，最后出现“代码支持 A，文档说 B，测试验证 C”。  
**Do this instead:** 先选唯一 orchestrator seam，再让其他层变成 compatibility wrapper 或删除。

### Anti-Pattern 2: Discovery-Only MCP

**What people do:** 把 MCP tool 当成 CLI 帮助系统，只返回命令字符串。  
**Why it's wrong:** agent 仍需二次解释和执行，失去 machine-actionable contract 的意义。  
**Do this instead:** 原生命令结果走 structured output，CLI 只是其中一个 adapter。

### Anti-Pattern 3: Silent Storage Fallback

**What people do:** backend 不可用时静默回退到另一个 backend。  
**Why it's wrong:** 用户以为 graph truth 保持一致，实际 runtime/性能/可见性都变了。  
**Do this instead:** fallback 只能在同一 truth family 内发生（SQLite native/WASM/built-in），跨 backend 切换必须显式失败。

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `core/analyzer` ↔ `parser/index` | direct API | 当前是 parser 主路径最脆弱的 coupling 点。 |
| `cli/config-loader` ↔ `StorageFactory` | typed config | v2.2 breaking change 会先经过这里暴露。 |
| `server/mcp/server` ↔ `schema-adapter` | tool registration | 当前 native tools 返回真结果，contract tools 返回 `cli_redirect`。 |
| `server/mcp/server` ↔ `service` | direct service call | 这是 direct execution 的可复用模式，应扩展到更多 tools。 |

## Sources

- [parser/index.ts:25](/data/codemap/src/parser/index.ts:25)
- [analyzer.ts:15](/data/codemap/src/core/analyzer.ts:15)
- [infrastructure/parser/index.ts:39](/data/codemap/src/infrastructure/parser/index.ts:39)
- [StorageFactory.ts:48](/data/codemap/src/infrastructure/storage/StorageFactory.ts:48)
- [server.ts:36](/data/codemap/src/server/mcp/server.ts:36)
- [schema-adapter.ts:286](/data/codemap/src/server/mcp/schema-adapter.ts:286)

---
*Architecture research for: v2.2 architecture-foundation*
*Researched: 2026-05-06*
