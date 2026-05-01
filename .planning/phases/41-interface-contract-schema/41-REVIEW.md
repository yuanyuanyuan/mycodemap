# Phase 41 Review Report

**Date:** 2026-04-30
**Branch:** main (uncommitted changes)
**Commit:** f474d40
**Scope:** Phase 41 (Interface Contract Schema) + Phase 42 partial (CLI-as-MCP Gateway)
**Quality Score:** 3.5/10

## Scope Check: CLEAN

Intent: Phase 41 (Interface Contract Schema) + Phase 42 partial (CLI-as-MCP gateway)
Delivered: Interface contract types/schema/commands for 3 commands, `--schema` flag, MCP schema-adapter with contract-to-tool conversion, dynamic server registration

## Plan Completion Audit

| Item | Status | Notes |
|------|--------|-------|
| AGENT-01: Define CLI Interface Contract Schema | DONE | types.ts + schema.ts + commands/ |
| AGENT-05: Runtime expose contract metadata | DONE | `--schema` flag in index.ts |
| AGENT-03: Schema-driven MCP tool generation | DONE | schema-adapter.ts + server.ts |
| AGENT-02: Schema-driven CLI parser | PARTIAL | Schema validates commander config but doesn't generate parser |
| AGENT-04: --help-json and shell completion | PARTIAL | `--schema` outputs JSON but no --help-json or completion |
| AGENT-06: Progressive migration of commands | PARTIAL | 3 of 15+ commands migrated |

**Completion:** 3/6 DONE, 3 PARTIAL (by design per Phase 41/42 boundary)

## Critical Findings (5)

### [P0] Shell injection in buildCliCommandLine (confidence: 9/10)
**File:** `src/server/mcp/schema-adapter.ts:253`
**Sources:** security specialist + adversarial subagent (MULTI-SPECIALIST CONFIRMED)

`buildCliCommandLine` 直接插值用户输入到命令字符串 (`--${k} ${String(v)}`)，MCP 客户端/AI agent 执行 `cliCommand` 字段时可被注入。值如 `; rm -rf /` 会原样写入命令字符串。

**Fix:** Shell-escape 所有参数值（用 shellescape 或单引号包裹+内部转义），或去掉预构建的 `cliCommand`，让 consumer 从 `structuredContent.args` 自行构建命令。

---

### [P0] outputSchema computed but never passed to registerTool (confidence: 9.5/10)
**File:** `src/server/mcp/server.ts:91`
**Sources:** api-contract specialist + maintainability specialist + adversarial subagent (MULTI-SPECIALIST CONFIRMED)

`convertContractToMcpTools` 计算 `outputSchema` 并存入 `def.config.outputSchema`，但 `registerContractTools` 未传给 `server.registerTool()`。MCP 客户端无法得知输出形状，整条 output schema 管线是运行时死代码。

**Fix:** 在 `server.registerTool()` 的 config 对象中添加 `outputSchema: def.config.outputSchema`。

---

### [P0] outputSchema describes CLI output but handler returns cli_redirect (confidence: 9.5/10)
**File:** `src/server/mcp/schema-adapter.ts:274`
**Sources:** api-contract specialist

handler 声明 `outputSchema` 描述真实 CLI 输出形状（如 analyze 返回 intent/results/metrics），但实际返回的是 `cli_redirect` 形状（status/command/args/cliCommand/description/examples/errorCodes）。任何依赖 outputSchema 的 MCP 客户端会收到不匹配数据。

**Fix:** 改 outputSchema 为描述 `cli_redirect` 形状，或去掉 outputSchema 直到有真实 handler，或在 handler 中返回匹配 outputSchema 的数据。

---

### [P1] --schema includes() hijacks subcommands (confidence: 8/10)
**File:** `src/cli/index.ts:212`
**Sources:** adversarial subagent

`--schema` 全局拦截用 `includes()` 匹配，会劫持任何子命令中出现的 `--schema` 参数。如果未来子命令定义同名 flag，全局拦截先执行，子命令永远不会运行。

**Fix:** 仅在无子命令 token 时拦截（检查 `process.argv.slice(2)` 是否只有 `--schema` 或不含已知子命令名），或注册为 Commander 全局 option。

---

### [P1] Tool name collision silently skipped with no warning (confidence: 8/10)
**File:** `src/server/mcp/server.ts:84`
**Sources:** adversarial subagent + security specialist

合约工具名与 native 工具冲突时静默跳过，无日志/警告/metric。操作者无法发现工具被吞。query 合约工具被 native `codemap_query` 遮蔽即为实例。

**Fix:** 添加 `console.warn` 或结构化日志：`Contract tool "${def.name}" skipped — name reserved by native tool`。

---

## Informational Findings (9)

### [P2] Contract description drift --structured (confidence: 9/10)
**File:** `src/cli/interface-contract/commands/analyze.ts:73`

Contract 说 `--structured` "需要配合 --json 使用"，但 `analyze-options.ts` 说 "需要配合 --json 或 --output-mode=machine 使用"。

**Fix:** 同步 contract 描述与 analyze-options.ts。

---

### [P2] Type mismatch: number in contract, string in Commander (confidence: 8.5/10)
**File:** `src/cli/interface-contract/commands/analyze.ts:48`

Contract 声明 `topK` 类型为 number（defaultValue: 8），但 Commander option 类型是 string（defaultValue: '8'）。`query` 的 `limit`（'50'）和 `context`（'0'）同理。

**Fix:** 在 Commander 中使用 `.parseInt()` 使类型真正为 number，或在 contract 中反映 string + implicit coercion 的现实。

---

### [P2] Contract version hardcoded independently from CLI (confidence: 8.5/10)
**File:** `src/cli/interface-contract/index.ts:41`

Contract `version: '0.1.0'` 与 `program.version('0.1.0')` 独立硬编码，无同步机制。一旦一方更新另一方不会跟随。

**Fix:** 从单一常量或 `package.json` 派生版本，或在 `validateCurrentContract()` 中添加运行时断言。

---

### [P2] Handler trusts MCP SDK validation without defense-in-depth (confidence: 7/10)
**File:** `src/server/mcp/schema-adapter.ts:270`

handler 不独立校验参数，完全依赖 MCP SDK 的 inputSchema 验证。SDK 验证旁路时无防御纵深。

**Fix:** 在 handler 内部用 contract 的 Zod schema 做显式 `parse(args)` 验证。

---

### [P2] --schema flag has zero test coverage (confidence: 7/10)
**File:** `src/cli/index.ts:212`

`--schema` 全局 flag 无测试：未验证 flag 被识别、输出是有效 JSON、输出匹配 contract schema。

**Fix:** 添加测试：调用 CLI 传入 `--schema`，捕获 stdout，解析 JSON，断言通过 `interfaceContractSchema` 验证。

---

### [P2] validateCurrentContract error path untested (confidence: 7/10)
**File:** `src/cli/interface-contract/__tests__/interface-contract.test.ts:59`

`validateCurrentContract` 只测 happy path（`valid: true`），`safeValidateInterfaceContract` 的 failure 分支完全未覆盖。

**Fix:** 添加测试：临时破坏 contract，断言返回 `{ valid: false, errors: [...] }`。

---

### [P2] Weak .not.toThrow() assertions in schema-adapter tests (confidence: 7/10)
**File:** `src/server/mcp/__tests__/schema-adapter.test.ts:185`

`.not.toThrow()` 只验证无异常，不检查解析值。静默类型强制或属性丢失的 bug 会通过。

**Fix:** 捕获返回值并断言 `result.toEqual(expected)`。

---

### [P2] buildCliCommandLine hardcodes 'codemap' instead of programName (confidence: 6.5/10)
**File:** `src/server/mcp/schema-adapter.ts:267`

硬编码 `codemap` 而非使用 contract 的 `programName`（`mycodemap`，`codemap` 只是 alias）。

**Fix:** 从 contract 的 `programName` 或 alias 列表派生，或参数化。

---

### [P2] schema-adapter.ts trending toward god module (confidence: 6/10)
**File:** `src/server/mcp/schema-adapter.ts` (327 lines)

承担 6+ 职责：flag-to-Zod 转换、output-to-JSON-Schema 转换、output-to-Zod 转换、CLI 命令行构建、handler 创建、contract-to-MCP-tool 编排。

**Fix:** 拆分为 focused modules：flag-to-zod.ts、output-to-schema.ts、contract-to-mcp.ts。

---

## Documentation Staleness

- `AI_GUIDE.md` 描述 MCP server 有 2 个 tool（codemap_query, codemap_impact），未提及动态注册的 contract tools（codemap_analyze, codemap_deps）
- `--schema` 全局 flag 未在任何文档中记录

## Specialist Dispatch Summary

| Specialist | Dispatched | Findings | Critical | Informational |
|------------|-----------|----------|----------|---------------|
| Testing | Yes | 4 | 2 | 2 |
| Maintainability | Yes | 3 | 2 | 7 |
| Security | Yes | 3 | 1 | 2 |
| API Contract | Yes | 7 | 2 | 5 |
| Performance | No (scope) | - | - | - |
| Data Migration | No (scope) | - | - | - |
| Design | No (scope) | - | - | - |

**Adversarial review:** Claude subagent dispatched (17 findings). Codex unavailable.

## Architectural Notes for Future Phases

1. **flag.name vs flag.long 隐患:** 当前所有 `name === long`，`buildCliCommandLine` 用 `args` 的 key 直接拼接恰好正确。但 `FlagDef` 类型允许 `name !== long`，一旦引入差异，所有生成的 CLI 命令会失败。建议 Phase 42 增加 `name → long` 查找映射。

2. **Zod default() vs optional() 顺序:** `schema.default(value)` 不加 `.optional()` 在 JSON Schema 输出中产生 required property，MCP 客户端会误将有默认值的 flag 视为必填。建议改为 `.optional().default(value)`。

3. **outputSchema 契约不匹配是基础性问题:** contract 作为"单一真相源"的设计目标要求描述与实现一致。当前 outputSchema 描述理想输出，handler 返回代理形状，这使整条 schema-driven 体系在 output 侧不可信。

---

*Report generated by /review on 2026-04-30*
