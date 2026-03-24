# Phase 6: Docs Exclusions Sync（共享排除规则与最终文档护栏收口） - Research

**Researched:** 2026-03-24
**Domain:** shared file discovery + docs guardrail closure
**Confidence:** HIGH

<research_summary>
## Summary

第一，`analyze` 与 `check-headers -d` 的扫描逻辑在 Phase 6 前并不共享事实源：`src/core/analyzer.ts` 持有一套默认 `exclude`，`src/orchestrator/file-header-scanner.ts` 则手写目录递归与跳过规则。更糟的是，`*.test.ts` 这类非递归 pattern 对 `src/foo.test.ts` 实际不生效，因此“默认排除测试文件”只是表面契约。

第二，文档已经写入了 Phase 4 / Phase 5 的新边界，但 guardrail 脚本还没有把它们固定下来。`workflow` 四阶段、`ship` 复用 `ci` gate checks、以及共享 `.gitignore` 感知排除模块，都可能因为后续修改再次漂移而无人察觉。

第三，`check-branch --allow main,release/*` 已经是公开文档示例，因此实现如果继续做精确匹配，最终会在 release 分支和 CI detached HEAD 场景里违背公开契约。这个偏差必须在本阶段一起收口。

**Primary recommendation:**  
1. 抽共享发现模块，统一 `.gitignore` / 默认排除 / 子目录扫描 root 解析；  
2. 修正文档，把共享发现契约与当前 ci-gateway 真相写清楚；  
3. 用 `validate-docs`、docs tests、scanner tests 与 CLI spot-check 锁死这些事实。
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Shared discovery root + scoped include
文件发现需要把“仓库根目录”和“当前扫描作用域目录”拆开：根目录负责 `.gitignore`，作用域目录负责 include pattern。

### Pattern 2: Guardrails encode contract drift
README/AI 文档写过的高信号事实，必须回落为脚本级检查；否则 Phase 4/5/6 都会再次退化成“文档说明”而不是“仓库约束”。

### Pattern 3: Public examples are executable contracts
一旦 README/AI guide 给出 `release/*` 或 `.gitignore` 共享扫描的示例，就必须让 CLI 与测试真实支持它们。

</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

- 只抽公共 helper，不修正 `*.test.ts` → 共享了错误规则。
- 只改 README，不改 `validate-docs.js` → 新边界无法长期稳定。
- 为了让文档说得通去硬改 `ci-gateway.yml`，却不考虑 build 后 working tree 变脏或 PR 分支命名差异。

</common_pitfalls>

---

*Phase: 06-docs-exclusions-sync-docs-exclusions*
*Research completed: 2026-03-24*
