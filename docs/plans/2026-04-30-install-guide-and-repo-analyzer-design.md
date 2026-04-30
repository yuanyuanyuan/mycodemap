# 设计文档：安装引导 + repo-analyzer 衍生技能

> 日期：2026-04-30
> 状态：已确认

## Context

mycodemap 当前的安装流程是手动拼凑的：用户需要自行 `npm install`、手动拷贝 skill 文件、手动修改 rules。当用户对 AI CLI（如 Claude Code）说"帮我安装 mycodemap"时，AI CLI 缺少结构化的引导文档，无法可靠地完成安装和配置。

同时，repo-analyzer 是一个优秀的 Claude Code skill，用于深度架构分析。mycodemap 的 CLI 能力（generate/query/impact/deps/cycles/complexity/analyze）可以替代 repo-analyzer 中部分文件遍历和分析操作，提升效率。

---

## 需求1：AI Assistant Setup Guide

### 方案

新增 `AI_ASSISTANT_SETUP.md`，为 AI CLI 提供结构化安装引导文档。

### 文件位置

- 主文件：`/data/codemap/AI_ASSISTANT_SETUP.md`
- 关联修改：`README.md`（AI 集成章节增加链接）

### 分步流程

每步标注 `[CONFIRM]` 表示需用户确认：

```
Step 1: 前置条件检查 [CONFIRM]
  - Node.js >= 18 是否已安装
  - 当前项目是否有 package.json
  - 用户确认项目级别安装

Step 2: 安装依赖 [CONFIRM]
  - npm install @mycodemap/mycodemap

Step 3: 初始化 [CONFIRM]
  - mycodemap init（先预览）
  - mycodemap init -y（确认写入）

Step 4: 生成代码地图
  - mycodemap generate
  - 说明已生成 AI_MAP.md 等文件

Step 5: 配置 AI 助手 skill [CONFIRM]
  - 给出命令拷贝 skill 文件到 .claude/skills/ 和 .agents/skills/
  - 提示用户从 examples/ 目录拷贝

Step 6: 更新项目 rules [CONFIRM]
  - 给出 CLAUDE.md 和 AGENTS.md 需追加的文本片段

Step 7: 验证安装
  - mycodemap query --help
  - 检查 .claude/skills/codemap/ 是否存在
```

### Rules 文本片段（Step 6 内容）

```markdown
## CodeMap Skill

### 何时使用
- 需要理解项目整体结构或模块关系
- 分析代码变更的影响范围
- 查询符号定义、调用关系、依赖链
- 评估代码复杂度或检测循环依赖

### 何时不用
- 简单的单文件修改或调试
- 非代码文件操作（文档、配置等）
- 已有明确上下文的局部改动

### 如何使用
- 参考 .claude/skills/codemap/ 中的 skill 指令
- 使用 mycodemap CLI 命令（generate/query/impact/deps/cycles/complexity）

### 索引维护
- 代码变更后需运行 `mycodemap generate` 更新索引
- 在重大功能开发/重构完成后，主动更新一次
- 如发现 mycodemap 查询结果与代码不一致，先更新索引再使用
```

---

## 需求2：mycodemap-repo-analyzer 衍生技能

### 方案

基于 repo-analyzer 的 SKILL.md 结构，完整重写执行层面指令，融入 mycodemap CLI。

### 文件位置

```
examples/claude/skills/mycodemap-repo-analyzer/
├── SKILL.md                              # 主技能定义（重写）
└── references/
    ├── analysis-guide.md                 # 分析哲学（保留原版）
    └── module-analysis-guide.md          # 模块分析指南（保留原版）
```

### 逐阶段替换映射

| 阶段 | 原操作 | 替换为 mycodemap | 保留原逻辑 |
|------|--------|-----------------|-----------|
| 1. 项目获取 | 手动遍历文件 | `mycodemap generate` 生成 AI_MAP.md | git clone 不变 |
| 2. 规模评估 | 手动统计代码行 | AI_MAP.md 中的模块/符号统计 | 模式选择逻辑不变 |
| 3. 外部调研 | WebSearch + 网页抓取 | — | 全部保留 |
| 4. 特征识别 | 逐文件读取分析 | `mycodemap query/deps/cycles/complexity` | 自适应提问逻辑不变 |
| 5. 报告结构 | AI 思考过程 | — | 全部保留 |
| 6. 并行分析 | subagent 逐文件读取 | subagent 用 `mycodemap analyze` | subagent 并行框架不变 |
| 7. 交叉验证 | 手动回查 | `mycodemap impact` 辅助验证 | 覆盖率门控不变 |
| 8. 最终报告 | AI 写作 | — | 全部保留 |

### 关键改动

1. **阶段1**：git clone 后运行 `mycodemap generate`，AI_MAP.md 作为后续分析基础
2. **阶段2**：从 AI_MAP.md 直接读取模块统计，不再手动统计
3. **阶段4**：用 mycodemap CLI 快速获取架构特征（deps/cycles/complexity）
4. **阶段6**：subagent 提示词增加 mycodemap CLI 使用指令，替代逐文件 Read
5. **阶段7**：用 `mycodemap impact -f <file>` 辅助验证跨模块影响

### 命名

- Skill 目录名：`mycodemap-repo-analyzer`
- 触发关键词：`mycodemap 分析项目`、`mycodemap 架构分析`、`mycodemap 项目分析` 等

---

## 实施依赖

- 需求1 和需求2 可并行实施
- 需求1 的 Step 5 中提到的 skill 拷贝，应包含需求2 产出的 mycodemap-repo-analyzer skill
- 实施顺序建议：先完成需求2 的 skill 文件，再完成需求1 的安装引导文档

## 关键文件清单

| 操作 | 文件路径 |
|------|---------|
| 新增 | `AI_ASSISTANT_SETUP.md` |
| 修改 | `README.md`（增加链接） |
| 新增 | `examples/claude/skills/mycodemap-repo-analyzer/SKILL.md` |
| 新增 | `examples/claude/skills/mycodemap-repo-analyzer/references/analysis-guide.md` |
| 新增 | `examples/claude/skills/mycodemap-repo-analyzer/references/module-analysis-guide.md` |
