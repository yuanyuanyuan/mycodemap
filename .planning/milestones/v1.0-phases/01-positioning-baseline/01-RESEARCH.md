# Phase 1: Positioning Baseline（产品定位与范围基线） - Research

**Researched:** 2026-03-24
**Domain:** Brownfield CLI 产品边界收敛与 AI-first 文档/契约基线
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- CodeMap 的根入口必须统一描述为“AI-first 代码地图工具”，而不是泛化的实现/发布/HTTP 工具箱。
- `AI/Agent` 是主要消费者；人类开发者负责配置、维护与按需阅读输出。
- Phase 1 要把“机器可读优先 + 人类可读显式入口”写成统一契约，但必须明确当前 CLI 仍有 legacy flag 现实，不能把目标态伪装成现状。
- `Server Layer` 作为 MVP3 架构层必须保留；公共 `server` CLI 命令不能因为同名而被包装成核心定位。
- `watch`、`report`、`logs`、命令移除、`analyze` 四意图化、workflow 简化、`ship/ci` 关系重构都属于后续 phase，不得提前混改。

### the agent's Discretion
- 产品文案与导航表格的具体措辞
- “机器可读优先”契约在不同文档中的重复方式
- 对 legacy surface 的标注强度与位置

### Deferred Ideas (OUT OF SCOPE)
- Phase 2：公共 CLI 命令面收缩
- Phase 3：`analyze` 四意图与迁移矩阵
- Phase 4：workflow 四阶段模型
- Phase 5：`ship` / `ci` 边界对齐
- Phase 6：共享排除规则与最终文档护栏收口

</user_constraints>

<research_summary>
## Summary

这个 phase 研究的不是“引入哪一个新库”，而是 brownfield 仓库里怎样用**最小 blast radius** 固化新的产品边界。仓库事实显示：`README.md`、`AI_GUIDE.md`、`docs/ai-guide/*` 仍把 HTTP API、发布流和 6 阶段 workflow 与代码地图能力并列呈现；`src/cli/index.ts` 仍公开暴露 `watch`、`report`、`logs`、`server`、`ship`；`scripts/validate-docs.js` 又把部分 CLI 示例和 guardrail 命令写死在检查脚本里。这意味着如果 Phase 1 一边改定位、一边删命令/改意图，风险会直接蔓延到后续所有 phase。

对这种场景，最稳的标准做法是 **docs-first + guardrail-backed repositioning**：先统一根入口文档与 AI 入口文档，再把输出契约和 `Server Layer` / `server` 命令的区分写入详细 AI 文档与 `ARCHITECTURE.md`，最后把新基线编进 `scripts/validate-docs.js` 与验证规则。这样既能让 Phase 1 交付“可信的目标边界”，又不会提前侵入 Phase 2~5 的代码变更面。

另一条必须明确的研究结论是：当前 CLI 现实与设计稿目标态之间存在公开差距。设计稿要求“默认 JSON + `--human`”，但仓库里大多数命令仍以 `--json` 为显式开关，而 `analyze` 则单独提供 `--output-mode <mode>`。因此 Phase 1 规划必须显式采用“目标态 + 过渡说明”的写法，否则 README 和 AI 文档会变成假事实。

**Primary recommendation:** 把 Phase 1 设计成“入口文档 + 详细 AI 文档 + 架构边界 + docs guardrail”的基线 phase，并把命令删除/行为重构明确留给后续 roadmap phase。
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commander` | repo current | 公共 CLI 命令与 flag 事实源 | `src/cli/index.ts` 已是所有公开命令面的注册中心 |
| Markdown entry docs | repo current | 产品定位与 AI 入口契约 | `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*` 已承载公开产品叙事 |
| `scripts/validate-docs.js` | repo current | 文档契约护栏 | 已接入 `npm run docs:check` 与 CI，无需新建文档校验器 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CodeMap CLI `impact/query` | repo current | 变更前 blast radius / surface reality 分析 | 修改公共命令相关文档前先确认影响面 |
| `.planning/codebase/*.md` | repo current | 架构漂移与风险证据底座 | phase 同时跨 docs / CLI / 架构边界时 |
| `.github/workflows/ci-gateway.yml` | repo current | 验证 docs/type/build guardrail | 当文档契约需要 CI 证据时 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 扩展现有 docs guardrail | 新增独立 docs linter / generator | 成本更高，且会与现有 CI/脚本脱节 |
| 只改 README / AI_GUIDE | 全仓文档一次性大翻新 | 更容易越界到后续 phase，并放大 review 面 |
| 直接宣称目标态已完成 | “目标态 + 过渡说明” 双层写法 | 前者会把未实现行为写成事实，风险更高 |

**Installation:**
```bash
# Phase 1 不建议新增依赖；复用现有文档与 guardrail 栈
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
README.md                    # 公开产品定位
AI_GUIDE.md                  # AI 主入口
docs/ai-guide/               # 详细 AI 契约、命令与模式
ARCHITECTURE.md              # 架构边界与层次说明
scripts/validate-docs.js     # 文档 guardrail
src/cli/index.ts             # 当前命令/flag 事实源
```

### Pattern 1: Entry-first repositioning
**What:** 先统一 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/README.md` 的一句话定位、受众划分与首屏示例。  
**When to use:** 产品叙事漂移比实现漂移更明显时。  
**Example:**
```typescript
// Source: src/cli/index.ts
.description('TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文')
```

### Pattern 2: Guardrail-backed contract
**What:** 把新的输出契约与关键示例集中写入 `docs/ai-guide/*`，再由 `scripts/validate-docs.js` 验证关键片段。  
**When to use:** 文档改动容易与 CLI 示例或 CI 要求脱节时。  
**Example:**
```javascript
// Source: scripts/validate-docs.js
const requiredReadmeExamples = [
  'mycodemap analyze -i overview -t src/orchestrator',
  'mycodemap analyze -i impact -t src/cli/index.ts --include-tests',
  'mycodemap analyze -i dependency -t src/cli/index.ts',
  'mycodemap analyze -i search -k UnifiedResult'
];
```

### Pattern 3: Architecture / command disambiguation
**What:** 用显式语句区分“架构层概念”和“公共 CLI surface”。  
**When to use:** 同一个术语同时出现在架构图和命令面时。  
**Example:**
```text
Server Layer（架构层） ≠ `mycodemap server`（公共 CLI 命令）
```

### Anti-Patterns to Avoid
- **边界与执行混改：** 一边改定位，一边删命令、改 analyze、改 workflow，极易把产品收敛做成大规模重构。
- **目标态冒充现状：** 在 CLI 行为未统一前直接写“默认 JSON + `--human` 已完成”，会制造假事实。
- **用架构层为公共命令背书：** “Server Layer 还在” 不能推出 “`server` 命令仍是核心产品能力”。
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 产品定位同步 | 新的文档生成管线 | 现有 `README.md` / `AI_GUIDE.md` / `docs/ai-guide/*` 层级结构 | 入口层级已存在，新增生成链只会扩大维护成本 |
| 文档一致性检查 | 新建通用校验框架 | 扩展 `scripts/validate-docs.js` + CI | 当前项目已通过 `npm run docs:check` 和 CI 运行 |
| 高影响入口识别 | 手工全仓搜索为主 | 先用 `node dist/cli/index.js impact/query`，再补 `rg` | 现成工具更快暴露公共 surface 的 blast radius |

**Key insight:** 这个 phase 的主要难点不是“缺工具”，而是“已有文档、入口和护栏之间强耦合”，所以应复用现有链路而不是再造一层。
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Docs guardrail drift
**What goes wrong:** README 或 AI 文档改了，但 `scripts/validate-docs.js` 仍要求旧字符串，导致 `npm run docs:check` / CI 失败。  
**Why it happens:** 当前文档护栏基于精确字符串，不是语义比对。  
**How to avoid:** 任何入口文档或契约文档调整，都在同一 plan 内同步更新 guardrail 并执行 docs check。  
**Warning signs:** pre-commit 或 CI 报 `missing expected snippet`。

### Pitfall 2: Phase leakage into command removal
**What goes wrong:** 看到 `server/watch/report/logs` 冲突明显，就在 Phase 1 顺手删命令或改实现。  
**Why it happens:** 现有 CLI 表面冲突太强，容易让人以为“顺便一起改更省事”。  
**How to avoid:** 将 Phase 1 限定为文档/契约/guardrail 基线，只允许标记为过渡能力，不做行为删除。  
**Warning signs:** 计划开始触碰 `src/cli/commands/server.ts`、`src/cli/commands/watch.ts` 或 `src/orchestrator/intent-router.ts`。

### Pitfall 3: Output contract ambiguity
**What goes wrong:** 一份文档说默认机器输出，另一份还在教用户手动加 `--json`，导致 AI 与人类都不知该信哪份。  
**Why it happens:** 当前命令间 flag 形态并不统一。  
**How to avoid:** 把“目标态 + 当前过渡现实”集中写在 `docs/ai-guide/OUTPUT.md` 与 `docs/ai-guide/COMMANDS.md`，其他文档只引用同一套词。  
**Warning signs:** 文档同时出现“默认 human”与“默认 machine”且没有过渡说明。

### Pitfall 4: Server terminology collision
**What goes wrong:** 为了弱化 `server` 命令，把所有 “Server” 文案都删掉，连架构层也一起抹平。  
**Why it happens:** 同一个词同时指向内部架构层和外部 CLI 命令。  
**How to avoid:** 在 `ARCHITECTURE.md` 与 AI 文档中增加显式对照句，保留架构层、区分公共命令。  
**Warning signs:** 文档删除全部 `Server Layer` 描述，或继续把 HTTP API 当作首屏核心价值。
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from repository sources:

### Current CLI output flag reality
```typescript
// Source: src/cli/index.ts
.option('--json', 'JSON 格式输出')
.option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 或 --output-mode=machine 使用）')
.option('--output-mode <mode>', '输出模式 (machine|human)')
```

### Current docs guardrail coupling
```javascript
// Source: scripts/validate-docs.js
const requiredReadmeExamples = [
  'mycodemap analyze -i overview -t src/orchestrator',
  'mycodemap analyze -i impact -t src/cli/index.ts --include-tests',
  'mycodemap analyze -i dependency -t src/cli/index.ts',
  'mycodemap analyze -i search -k UnifiedResult'
];
```

### High-blast-radius proof
```bash
# Source: local analysis run on 2026-03-24
node dist/cli/index.js impact -f src/cli/index.ts -t -j
# statistics.directCount = 76
# statistics.transitiveCount = 168
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

What's changed recently inside this project direction:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 把静态分析、HTTP API、发布流、实现 workflow 并列呈现 | 重新定义为 AI-first 代码地图工具，其他 surface 按 phase 收缩 | 2026-03 设计稿 + roadmap | 入口文档必须先统一叙事 |
| `analyze` 8 意图被当成稳定接口 | 规划收敛为 `find/read/link/show` 四意图 | 2026-03 设计稿 | 契约文档必须写迁移说明，而不是继续假定 8 意图长期稳定 |
| workflow 6 阶段包含 implementation/commit/ci | 规划收敛为 4 阶段纯分析流 | 2026-03 roadmap | `PATTERNS.md` 需要过渡说明，避免把旧模型当最终产品 |

**New tools/patterns to consider:**
- 使用 CodeMap 自身的 `impact/query` 先做 surface audit，再决定 docs 改动范围
- 使用“目标态 + 当前态 + roadmap phase”三列表达过渡，不让文档扮演假 release note

**Deprecated/outdated:**
- 把 `ship`、HTTP API、实现型 workflow 当成首屏核心卖点
- 把 `--json` 视为 AI 使用的可选附加项，而不是契约核心
</sota_updates>

<open_questions>
## Open Questions

1. **Phase 1 要不要顺带实现 CLI 行为变化？**
   - What we know: roadmap 的成功标准强调“说明基线”，而不是先删命令；当前 CLI flag 现实也不统一。
   - What's unclear: 是否需要在本 phase 就引入统一的 `--human` / 默认机器输出行为。
   - Recommendation: 先把本 phase 保持为 docs + guardrail baseline；如需行为迁移，只在文档里清楚写明当前态与目标态。

2. **legacy commands 在文档里该完全隐藏还是标注为过渡能力？**
   - What we know: `src/cli/index.ts` 仍公开注册 `watch`、`report`、`logs`、`server`、`ship`。
   - What's unclear: 入口文档是否要完全不再出现它们。
   - Recommendation: 入口文档不再把它们作为核心价值；详细文档可保留，但必须标明“过渡能力 / 后续 phase 处理”。

3. **`--human` 与 `--output-mode human` 的词汇统一策略是什么？**
   - What we know: 设计稿使用 `--human`，当前 CLI 现实使用 `--output-mode <mode>` 与 `--json`。
   - What's unclear: 本 phase 应使用目标 UX 名称，还是完全沿用当前 flag 文案。
   - Recommendation: 在文档里将 `--human` 表述为目标 UX 简称，同时明确当前显式入口仍是现有 flag，直到后续 phase 实装。
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — 范围、限制条件与当前产品边界
- `.planning/ROADMAP.md` — Phase 1 目标、success criteria、plan split
- `.planning/REQUIREMENTS.md` — `POS-01` / `POS-02` / `POS-03`
- `.planning/codebase/ARCHITECTURE.md` — hybrid architecture、high-impact files
- `.planning/codebase/CONCERNS.md` — docs guardrail coupling 与失败模式
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md` — 用户提供的目标方向与迁移想法
- `src/cli/index.ts` — 当前公共命令面与输出 flag 现实
- `scripts/validate-docs.js` — 当前文档 guardrail 与 CI 依赖
- `node dist/cli/index.js impact -f src/cli/index.ts -t -j` — 高影响入口的实测 blast radius

### Secondary (MEDIUM confidence)
- `README.md`、`AI_GUIDE.md`、`docs/ai-guide/README.md`、`docs/ai-guide/QUICKSTART.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`、`docs/ai-guide/PATTERNS.md`、`ARCHITECTURE.md` — 当前公开文档中的叙事漂移与契约冲突

### Tertiary (LOW confidence - needs validation)
- None — 本 phase 规划不依赖外部网页或未核实资料
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: brownfield CLI 产品面与文档契约收敛
- Ecosystem: 仓库现有 docs / CLI / guardrail / roadmap
- Patterns: entry-first repositioning、guardrail-backed contract、architecture/command disambiguation
- Pitfalls: docs drift、phase leakage、output ambiguity、server terminology collision

**Confidence breakdown:**
- Standard stack: HIGH — 全部来自仓库现有工具链与文件
- Architecture: HIGH — 有 `.planning/codebase/*` 和 `src/cli/index.ts` 双重证据
- Pitfalls: HIGH — 已有 guardrail 脚本、roadmap 分期和 impact 输出直接支撑
- Code examples: HIGH — 全部来自本仓库代码与本地命令结果

**Research date:** 2026-03-24
**Valid until:** 2026-04-23
</metadata>

---

*Phase: 01-positioning-baseline*
*Research completed: 2026-03-24*
*Ready for planning: yes*
