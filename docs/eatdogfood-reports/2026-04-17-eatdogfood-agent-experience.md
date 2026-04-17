# CodeMap Eatdogfood 测试报告

> 测试者身份：AI Agent（eatdogfood）  
> 测试日期：2026-04-17  
> 测试目标：用 CodeMap CLI 分析 CodeMap 自身，记录完整使用体验（尤其 Agent 视角）

---

## 1. 执行摘要

本次测试以 AI Agent 的身份，完整体验了 CodeMap CLI 的**查询层**与**非查询层**能力。测试覆盖 10+ 命令，包含符号查询、依赖影响分析、代码地图生成、复杂度分析、循环依赖检测、CI 风险评估、设计契约验证/交接/漂移检测、工作流启动、Mermaid 导出等。

**核心结论**：CodeMap 在"让 Agent 快速建立代码库心智模型"上表现优异，但部分命令在**参数一致性**和**零结果反馈**上仍有打磨空间。

---

## 2. 测试覆盖与结果

### 2.1 查询与影响分析层

| 命令 | 目标 | 结果 | Agent 评分 |
|------|------|------|-----------|
| `query -s "AnalyzeCommand"` | 查找符号定义 | 4 条精确结果，含 `kind`/`location`/`isExported` | ★★★★★ |
| `deps -m "src/core/analyzer"` | 模块依赖关系 | 6 个依赖 + 6 个依赖者，带路径映射 | ★★★★★ |
| `impact -f src/cli/commands/analyze.ts` | 文件变更影响面 | 33 个结果，自动区分 `source`/`test` | ★★★★★ |
| `analyze -i read` | 高相关度文件摘要 | 人类友好，带 100%/95% 相关度 | ★★★★☆ |
| `analyze -i link` | 架构关联映射 | 22 引用方/17 关联目标，`riskLevel: high` | ★★★★☆ |
| `analyze -i show` | 模块导出摘要 | 导出 4 符号，依赖 17 模块 | ★★★★☆ |
| `analyze -i find` | 关键词发现 | 对单文件路径 confidence 仅 0.04 | ★★☆☆☆ |
| `history --symbol` | Git 历史与风险 | 返回 symbolId/moduleId/exactNameMatch | ★★★★★ |

### 2.2 非查询层（生成、分析、工程、工作流）

| 命令 | 目标 | 结果 | Agent 评分 |
|------|------|------|-----------|
| `generate -m fast` | 生成代码地图 | 242 模块/958 导出符号/62482 行，成功 | ★★★★★ |
| `complexity src/cli/commands/analyze.ts` | 代码复杂度 | **指定文件后仍返回全量 79KB JSON** | ★★☆☆☆ |
| `cycles` | 循环依赖检测 | `hasCycles: false`，架构健康 | ★★★★★ |
| `ci assess-risk` | 变更风险评估 | score=0.05（low），threshold=0.50，通过 | ★★★★☆ |
| `design validate` | 设计契约校验 | 有效 doc ✅，无效 doc ❌ 并列出缺失 section | ★★★★★ |
| `design map` | 设计范围映射 | 无设计文档时 `blocked: true`，检测准确 | ★★★★★ |
| `design handoff` | 生成交接包 | 生成 `.mycodemap/handoffs/` 含 touchedFiles/tests/risks | ★★★★★ |
| `design verify` | 验证设计漂移 | 发现 5 处 drift，3 项待 review | ★★★★★ |
| `check --contract ...` | 契约门禁检查 | `passed: true`，diff scope 从 1 扩展到 3 文件 | ★★★★☆ |
| `export mermaid` | 导出依赖图 | 242 模块，7.1KB Mermaid 文件，成功 | ★★★★★ |
| `workflow start` | 启动分析工作流 | 生成 workflow ID，推荐 `refactoring` 模板 | ★★★★☆ |

---

## 3. Agent 视角的使用体验（重点）

### 3.1 Agent 的核心痛点：上下文是有限的，噪音是致命的

作为 AI Agent，我在分析代码库时最大的约束不是计算能力，而是**上下文窗口**。当使用传统工具链（`grep` + `read`）分析 `src/cli/commands/analyze.ts` 的影响面时：

- 3 次 Grep 返回约 **92 条文件引用**
- 混入 `.planning/`、`.claude/`、`docs/archive/` 等 20+ 文档噪音
- `src/orchestrator/result-fusion.ts` 被误抓——实际并未导入 `analyze.ts`，只是文本中出现了 "analyze"

为了排除误报，我不得不**逐个 Read 文件验证**。这个过程消耗了大量 token，而且结果仍需要我手动去重、分类。

而使用 `impact -f` 时：
- **1 次调用**
- **33 条精准结果**
- **0 条文档噪音**
- **自动标记 `source` / `test`**

这不仅是"快"，而是从"猜测-验证"模式切换到了"直接获取答案"模式。

### 3.2 哪些命令是 Agent 的"高信号工具"

以下命令对 Agent 来说是**高 ROI**的，应优先集成到 Agent 工作流中：

1. **`impact -f`** → 重构前的必备步骤。自动分类测试文件，让 Agent  instantly 知道"改完要跑哪些测试"。
2. **`deps -m`** → 理解模块边界。比文本搜索 `import` 更准确，因为它基于解析后的依赖图。
3. **`query -s`** → 符号导航。不仅找定义，还找重导出和关联函数，是 Agent 定位代码的 GPS。
4. **`design validate` / `design map` / `design handoff`** → 设计驱动开发的三件套。Agent 可以在动手写代码前验证设计文档是否完整，生成交接包后按图施工。
5. **`ci assess-risk`** → 在 Plan 阶段给变更打分。Agent 可以根据风险分数决定是否建议人类审查。
6. **`generate`** → 建立项目基线。Agent 可以在任务开始时生成代码地图，后续所有查询都在这个基线上进行。

### 3.3 哪些体验会打断 Agent 的自主性

以下问题会迫使 Agent 从"自动执行"退回"试探-纠错"模式：

#### 问题 A：`--json` 支持不统一

```bash
# 这些命令支持 --json ✅
query -s, deps -m, impact -f, design validate, design map, design handoff, design verify, check, cycles

# 这些命令不支持 --json ❌
history --symbol, ci assess-risk, workflow start
```

对 Agent 来说，JSON 是**机器可解析的默认语言**。当某些命令不支持 `--json` 时，Agent 需要额外处理人类可读输出，增加解析失败的风险。

#### 问题 B：`complexity` 指定文件仍返回全量

我执行了：
```bash
node dist/cli/index.js complexity src/cli/commands/analyze.ts --json
```

但它返回了**所有 242 个文件**的复杂度数据（79KB）。对 Agent 来说，这意味着：
- 大量无关信息挤占上下文
- 需要自行过滤目标文件
- 命令参数语义与行为不一致

#### 问题 C：`check` / `ci assess-risk` 的静默通过

当 `check` 检测到文件没有对应设计文档时，输出为空；`ci assess-risk` 输出纯文本但没有结构化分数字段。Agent 很难判断：
- 这是"通过"还是"跳过"？
- 状态码 0 是否代表一切正常？

#### 问题 D：`analyze -i find` 对显式文件路径 confidence 过低

```bash
node dist/cli/index.js analyze -i find src/core/analyzer.ts --json
# confidence: 0.04, results: []
```

当 Agent 已经精确指定了文件路径，工具却以低置信度返回空结果，这会让 Agent 怀疑自己的输入是否正确，从而触发不必要的 fallback 逻辑。

### 3.4 Agent 最喜欢的设计细节

1. **`impact` 的 `source` / `test` 分类**
   这不是 UI 装饰，而是直接影响 Agent 决策的结构化信息。Agent 可以立刻生成测试计划："需要验证的测试文件：X, Y, Z"。

2. **`design verify` 的 `driftCount` 和 `needsReviewCount`**
   让 Agent 可以量化设计文档的"健康度"。`driftCount: 5` 意味着 Agent 应该优先提醒人类审查，而不是继续自动执行。

3. **`check` 的 `scan_mode: diff` 和 scope 扩展警告**
   ```json
   { "code": "diff-scope-expanded", "message": "diff scope 从 1 个 changed file 扩展到 3 个 scanned file" }
   ```
   这让 Agent 理解契约检查的边界——它不是只看你改的那一行，而是会智能扩展到关联文件。

4. **`history` 的 symbolId / moduleId**
   虽然不支持 `--json`，但默认输出就是 JSON，而且带稳定的标识符。Agent 可以跟踪同一个符号在不同 commit 中的演变。

---

## 4. 对照实验：用 vs 不用 CodeMap

**问题**：修改 `src/cli/commands/analyze.ts` 中的 `AnalyzeCommand`，会影响哪些文件？

### 不用 CodeMap（传统路径）

| 步骤 | 工具 | 结果 | 问题 |
|------|------|------|------|
| 1 | `grep "AnalyzeCommand"` | 18 个文件 | 混入了大量文档和历史文件 |
| 2 | `grep "from.*analyze"` | 45 个文件 | 包含 `.claude/`、`.planning/` 噪音 |
| 3 | `grep "import.*analyze"` | 29 个文件 | 仍有误报（如 `result-fusion.ts`） |
| 4 | `Read` 验证 | 3+ 次 | 确认哪些是真依赖 |
| 5 | 手动分类 | - | 测试文件和源码混在一起 |

**总计**：6 次工具调用，~92 条引用（大量重复/噪音），需人工去重验证。

### 用 CodeMap

```bash
node dist/cli/index.js impact -f src/cli/commands/analyze.ts --json
```

**结果**：1 次调用，33 条精准结果，0 噪音，自动分类 source/test。

### 差距总结

| 维度 | 不用 CodeMap | 用 CodeMap |
|------|-------------|-----------|
| 调用次数 | 6+ | **1** |
| 结果量 | ~92 条 | **33 条** |
| 噪音混入 | 20+ 文档/历史文件 | **0** |
| 误报率 | 高（文本匹配） | **0** |
| 测试/源码分类 | 手动 | **自动** |
| Token 消耗 | 高 | **低** |

---

## 5. 发现的问题与改进建议

### 5.1 高优先级（影响 Agent 自主性）

| 问题 | 影响 | 建议 |
|------|------|------|
| `--json` 支持不统一 | Agent 需要为不同命令写不同解析器 | 所有命令统一支持 `--json`，或默认输出机器可读格式 |
| `complexity` 指定文件仍返回全量 | 上下文爆炸 | 当提供文件参数时，只返回指定文件的复杂度 |
| `check` / `ci assess-risk` 静默通过 | Agent 无法区分"通过"和"未执行" | 始终输出一条状态摘要，如 `status: passed` / `status: skipped` |
| `analyze -i find` 对显式路径 confidence 过低 | Agent 会怀疑输入正确性 | 对绝对/相对文件路径提升 confidence 权重 |

### 5.2 中优先级（体验优化）

| 问题 | 影响 | 建议 |
|------|------|------|
| `generate` 默认输出到 `.mycodemap` | Agent 可能需要区分不同任务的结果 | 支持 `--task-id` 后缀或子目录 |
| `workflow` 不支持 `--json` | 难以自动化驱动工作流 | 支持 `--json` 和 `--auto-proceed` |
| RTK `Filters NOT applied` 警告 | 每次命令都出现，干扰输出 | 在 CI/Agent 模式下可静默 |

---

## 6. 结论

### 对 Agent 来说，CodeMap 的价值是什么？

CodeMap 把 AI Agent 从"**在代码海里钓鱼**"变成了"**直接拿到导航图**"。

- **`impact`** 让 Agent 在改代码前就知道"会打翻哪些盘子"
- **`design validate/handoff/verify`** 让 Agent 能参与设计驱动流程，而不是盲目写代码
- **`ci assess-risk`** 让 Agent 具备风险意识，知道什么时候该停下来叫人类审查
- **`generate` + `export`** 让 Agent 能把代码库结构转换成各种可消费格式

### 当前的短板是什么？

最大的短板不是功能缺失，而是**"Agent 接口的一致性"**。

当 Agent 调用 10 个命令时，如果有 3 个不支持 `--json`、1 个忽略文件参数、2 个静默通过，Agent 的可靠性就会从"自动驾驶"降级为"辅助驾驶"。

### 最终评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 查询精准度 | 9/10 | `query`/`deps`/`impact` 非常可靠 |
| 非查询能力 | 8/10 | 生成/设计/CI/导出能力完整 |
| Agent 友好度 | 6/10 | `--json` 不一致和部分命令 UX 影响自动化 |
| 整体推荐度 | 8/10 | **值得作为 Agent 工具链的核心组件**，但需要修复接口一致性问题 |

---

**测试执行者**：Claude (AI Agent)  
**测试对象**：CodeMap CLI v当前版本（基于 `main` 分支构建）  
**报告生成时间**：2026-04-17
