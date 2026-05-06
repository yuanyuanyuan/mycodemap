# Stack Research

**Domain:** AI-native code analysis CLI architecture foundation
**Researched:** 2026-05-06
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | `5.3.3` | 主实现语言与类型边界 | 当前代码库、CLI、contract schema、parser/storage/MCP 全部已建立在 TS 上，v2.2 不需要换栈，只需要收敛入口和职责。 |
| `tree-sitter` + `tree-sitter-typescript` | `0.21.1` + `0.23.2` | 统一 AST 解析主路径 | 仓库已经有 `TreeSitterParser` 和 WASM loader；`v2.2` 的 parser 统一更像是“切主路径”而不是“引新依赖”。 |
| SQLite runtime path | `better-sqlite3@12.9.0` + `sql.js@1.12.0` + built-in `node:sqlite` | 唯一持久化后端与降级链 | 仓库已经实现 native/WASM/built-in 三层路径，适合把 `auto` 收敛到 SQLite，而不是继续维护 Kùzu/FileSystem 双轨。 |
| `@modelcontextprotocol/sdk` | `1.29.0` | MCP server/tool surface | 当前 MCP server 已具备 native tools + contract tools 双表面，v2.2 的核心是把 contract tools 从 `cli_redirect` 变成真实执行。 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `4.3.6` | MCP input/output schema 与 contract schema 适配 | 保留为 MCP/tool schema 的统一验证层；v2.2 直接复用即可。 |
| built-in `node:sqlite` | Node `22.5.0+` official runtime feature | native dependency 缺失时的无安装 fallback | 仅在 Node 22+ 环境可直接使用；由于仓库 engine 仍是 `>=20`，不能把它当成唯一 fallback。 |
| `web-tree-sitter` | `0.24.0` | `tree-sitter` 原生依赖失败时的 WASM fallback | 保持为 parser cutover 的安全网，避免 v2.2 因 native build 环境失败而回退到旧 parser。 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` | 回归与真实路径验证 | parser/storage/MCP 收敛都需要失败场景验证，尤其是 breaking config 和 fallback 行为。 |
| `docs:check` | 文档与 authority drift 护栏 | v2.2 会改 config/runtime truth，必须同步 docs guardrail。 |
| CodeMap CLI (`query` / `analyze`) | 影响面与符号入口检索 | `src/parser/index.ts` 和 `src/core/analyzer.ts` 都是高影响入口，roadmap 需要围绕这些 seam 拆 phase。 |

## Installation

```bash
# Existing core runtime already present in repo
npm install

# Optional fallback/runtime helpers already declared
npm install sql.js web-tree-sitter
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `TreeSitterParser` 主路径 | 保留 `FastParser` / `SmartParser` 双轨 | 仅在过渡期做 compatibility shim；不应继续作为 milestone 终态。 |
| SQLite-only storage convergence | 继续维护 `filesystem` / `kuzudb` / `auto` 多轨 | 只有当 v2.2 被降级成“非 breaking cleanup”时才保留；当前 backlog 已明确不是这个方向。 |
| MCP real execution | 继续返回 `cli_redirect` | 仅适合作为短期 discovery tool；不适合作为 v2.2 后的 agent-facing contract。 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `mode: "fast"` / `mode: "hybrid"` 继续作为长期 public truth | 当前 analyzer 仍在按 50 文件阈值切换路径，导致行为、输出和验证面不稳定 | 单一 parser 主路径 + 显式增强层 |
| `storage.type: "filesystem"` / `"kuzudb"` 继续作为推荐配置 | 与 v2.2 的“单一存储真相”目标冲突，也会继续制造 docs/runtime drift | SQLite-only + actionable remediation |
| contract tool 返回 CLI 命令字符串 | agent 仍需二次执行，破坏“一次调用拿结果”的 MCP 语义 | pure function/service + MCP adapter |

## Stack Patterns by Variant

**If running on Node 20/21:**
- Keep `better-sqlite3` first, `sql.js` as required fallback
- Because `node:sqlite` cannot be assumed from the engine baseline

**If running on Node 22+:**
- Prefer preserving current fallback order rather than hard-switching to `node:sqlite`
- Because repo still ships native `better-sqlite3`, and built-in sqlite should stay compatibility fallback, not force a behavior flip inside v2.2

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `better-sqlite3@12.9.0` | Node `>=20` repo baseline | Native path remains preferred in current loader. |
| built-in `node:sqlite` | Node `22.5.0+` | Good fallback path, but incompatible with the repo's wider `>=20` engine promise if used as sole plan. |
| `tree-sitter@0.21.1` | `tree-sitter-typescript@0.23.2` | Already wired in current parser implementation and loader. |

## Sources

- [package.json:62](/data/codemap/package.json:62) — current runtime dependencies and versions
- [package.json:89](/data/codemap/package.json:89) — optional fallback dependencies
- [package.json:93](/data/codemap/package.json:93) — engine baseline (`node >=20`)
- [sqlite-loader.ts:24](/data/codemap/src/infrastructure/storage/adapters/sqlite-loader.ts:24) — SQLite fallback order in current implementation
- [server.ts:36](/data/codemap/src/server/mcp/server.ts:36) — current MCP native-tool registration pattern
- https://nodejs.org/api/sqlite.html — official built-in `node:sqlite` runtime documentation

---
*Stack research for: v2.2 architecture-foundation*
*Researched: 2026-05-06*
