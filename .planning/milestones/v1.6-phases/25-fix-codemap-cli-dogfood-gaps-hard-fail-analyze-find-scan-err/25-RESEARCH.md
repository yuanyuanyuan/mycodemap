# Phase 25: CodeMap CLI dogfood reliability hardening - Research

**Researched:** 2026-04-17
**Domain:** `analyze -i find` reliability, discovery-boundary alignment, and stdout diagnostics
**Confidence:** HIGH

<user_constraints>
## User Constraints (from ROADMAP / dogfood note)

### Locked Decisions
- `analyze -i find` 不能再把底层扫描失败包装成可信的空结果。
- `find` 必须与 `generate/query` 共用配置感知扫描边界。
- JSON/stdout-only 消费方必须能区分真实 0 命中与扫描链路失败。
- 若输出契约变化，必须同步 AI 文档。
- `rtk` 只作为执行时的 token wrapper，不进入产品能力说明。

### the agent's Discretion
- 主扫描退化时回退策略的具体实现
- 诊断字段的命名与状态枚举
- 单测与验证命令的最小集合

</user_constraints>

<research_summary>
## Summary

dogfood 复现表明，当前 `find` 的核心问题不是“没找到”，而是**失败信息只出现在 stderr，stdout 仍返回一个看起来合法的 `results=[]` JSON**。这会让只读 stdout 的 AI/Agent 把失败误判成“没有相关代码”。

第二个问题是**扫描边界漂移**。`generate` 已经通过 `loadCodemapConfig + discoverProjectFiles` 共享配置边界，但 `AstGrepAdapter` 仍然手写 `src/**/*.ts` 等 glob；这意味着 `find` 会绕开 `mycodemap.config.json` 与 `.gitignore`，与 `generate/query` 看到的世界不一致。

第三个问题是**错误被吞掉**。`AstGrepAdapter` 在 `ast-grep scan` 失败时只 `warn` 并返回空数组，`AnalyzeCommand` 的 `find` 路径又把置信度绑定到“结果数量”。结果就是：scanner 明明坏了，CLI 还会输出一个低置信度但结构合法的成功 JSON。

因此最稳的收口方式不是继续相信裸 `ast-grep`，而是把 `find` 改成：
1. 先走现有 AST scanner；
2. 同时让回退路径复用 `generate/query` 的 discovery boundary；
3. 把 `partialFailure` / `failure` 诊断塞进 stdout JSON；
4. 仅在 `failure` 时用非零退出码补充 shell 语义，但不牺牲 machine-readable stdout。

**Primary recommendation:**
- 在 `AnalyzeCommand` 里为 `find` 建立配置感知 fallback；
- 让 `AstGrepAdapter` 复用 `discoverProjectFiles`；
- 在 `CodemapOutput` 新增可选 `diagnostics`；
- 用 CLI 测试锁定 `partialFailure` 与 `failure` 两条 dogfood 回归路径。

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Module | Purpose | Why |
|--------|---------|-----|
| `src/cli/commands/analyze.ts` | `find` 输出与 CLI 契约入口 | scanner 失败必须在这里上浮到 stdout |
| `src/orchestrator/adapters/ast-grep-adapter.ts` | 主扫描器与文件发现 | 当前边界漂移和错误吞掉都发生在这里 |
| `src/core/file-discovery.ts` | 配置感知 discovery truth | `generate/query` 已依赖它，`find` 也必须对齐 |
| `src/cli/config-loader.ts` | 读取 `include` / `exclude` | 防止 `find` 硬编码扫描范围 |
| `src/orchestrator/types.ts` | `CodemapOutput` 契约 | 需要新增 `diagnostics` |

### Supporting
| Artifact | Purpose |
|---------|---------|
| `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md` | dogfood 触发事实 |
| `AI_GUIDE.md` / `docs/ai-guide/COMMANDS.md` / `docs/ai-guide/OUTPUT.md` | AI 可消费契约说明 |
| `scripts/validate-docs.js` | 文档护栏 |

</standard_stack>
