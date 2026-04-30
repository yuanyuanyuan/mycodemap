# 安装引导增强 + mycodemap-repo-analyzer 技能 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 增强 mycodemap 的 AI CLI 安装引导体验，并新增基于 repo-analyzer 的深度架构分析技能

**Architecture:** 需求1 在现有 `docs/AI_ASSISTANT_SETUP.md` 中增加 "AI CLI 一键安装引导" 章节；需求2 在 `examples/claude/skills/mycodemap-repo-analyzer/` 下创建衍生 skill，基于 repo-analyzer 的 8 阶段流程，替换执行层面操作为 mycodemap CLI

**Tech Stack:** Markdown, mycodemap CLI, Claude Code skill format

---

## 前置说明

### 关键发现

1. **`docs/AI_ASSISTANT_SETUP.md` 已存在** — 当前是面向人类的分平台配置指南（Kimi/Claude/Codex/Copilot），需要在其基础上增加"AI CLI 一键安装引导"章节，而非创建新文件
2. **现有 skill 文件** — `examples/claude/codemap-skill.md` 和 `examples/codex/codemap-agent.md` 是基础 skill 模板；`.claude/skills/codemap/SKILL.md` 是当前项目实际使用的完整 skill
3. **README.md 已有 AI 文档索引** — 第 99-117 行有 "AI / Agent 专属文档" 章节，需在此增加新 skill 的链接

### 文件路径约定

| 文件 | 说明 |
|------|------|
| `docs/AI_ASSISTANT_SETUP.md` | 现有 AI 助手配置指南，需追加"一键安装引导"章节 |
| `examples/claude/skills/mycodemap-repo-analyzer/SKILL.md` | 新增：衍生 skill 主文件 |
| `examples/claude/skills/mycodemap-repo-analyzer/references/analysis-guide.md` | 新增：分析哲学（从 repo-analyzer 保留） |
| `examples/claude/skills/mycodemap-repo-analyzer/references/module-analysis-guide.md` | 新增：模块分析指南（从 repo-analyzer 保留） |
| `README.md` | 修改：AI 文档索引章节增加链接 |

---

### Task 1: 创建 mycodemap-repo-analyzer skill 目录结构

**Files:**
- Create: `examples/claude/skills/mycodemap-repo-analyzer/SKILL.md`
- Create: `examples/claude/skills/mycodemap-repo-analyzer/references/analysis-guide.md`
- Create: `examples/claude/skills/mycodemap-repo-analyzer/references/module-analysis-guide.md`

**Step 1: 创建目录**

```bash
mkdir -p examples/claude/skills/mycodemap-repo-analyzer/references
```

**Step 2: 拷贝 references 文件**

从 repo-analyzer 原版保留 analysis-guide.md 和 module-analysis-guide.md，不做修改。

```bash
# 从 GitHub 获取原版文件内容，写入本地
gh api repos/yzddmr6/repo-analyzer/contents/skills/repo-analyzer/references/analysis-guide.md -q '.content' | base64 -d > examples/claude/skills/mycodemap-repo-analyzer/references/analysis-guide.md

gh api repos/yzddmr6/repo-analyzer/contents/skills/repo-analyzer/references/module-analysis-guide.md -q '.content' | base64 -d > examples/claude/skills/mycodemap-repo-analyzer/references/module-analysis-guide.md
```

**Step 3: 验证文件**

```bash
ls -la examples/claude/skills/mycodemap-repo-analyzer/references/
wc -l examples/claude/skills/mycodemap-repo-analyzer/references/*.md
```

Expected: 两个文件均存在，各 100-300 行

**Step 4: Commit**

```bash
git add examples/claude/skills/mycodemap-repo-analyzer/references/
git commit -m "feat: add repo-analyzer reference docs (unmodified from upstream)"
```

---

### Task 2: 编写 mycodemap-repo-analyzer SKILL.md

**Files:**
- Create: `examples/claude/skills/mycodemap-repo-analyzer/SKILL.md`

**Step 1: 编写 SKILL.md**

基于 repo-analyzer 原版 SKILL.md，关键改动点：

1. **frontmatter**：`name: mycodemap-repo-analyzer`，触发词加 `mycodemap` 前缀
2. **阶段1**：git clone 后增加 `mycodemap generate` 生成 AI_MAP.md 作为分析基础
3. **阶段2**：从 AI_MAP.md 读取模块统计替代手动 `find + wc`
4. **阶段4**：增加 `mycodemap query/deps/cycles/complexity` 快速获取架构特征
5. **阶段6**：subagent prompt 增加 mycodemap CLI 使用指令
6. **阶段7**：增加 `mycodemap impact` 辅助交叉验证

文件内容要点：

```markdown
---
name: mycodemap-repo-analyzer
description: Use when the user mentions "mycodemap 分析项目"、"mycodemap 架构分析"、"mycodemap 项目分析"、"mycodemap 源码分析"、"mycodemap 学习这个项目"、"mycodemap 研究这个框架"
---

# MyCodeMap 项目深度分析技能

[保留 repo-analyzer 的核心原则、When to Use/Not to Use、输出语言]

## 核心原则
[同原版 5 条核心原则，不变]

## 分析工作流

### 阶段 1: 项目获取与初始化（改动）
1. 解析输入（同原版）
2. 创建工作区（同原版）
3. git clone（同原版）
4. **[新增]** 在项目目录运行 `mycodemap generate` 生成代码地图
5. **[新增]** 阅读 `.mycodemap/AI_MAP.md` 获取项目结构概览
6. 获取基本元数据（同原版）

### 阶段 2: 项目规模评估（改动）
1. **[替换]** 从 `.mycodemap/AI_MAP.md` 读取模块列表和代码统计
2. **[替换]** 用 `mycodemap complexity` 获取复杂度分布
3. 向用户报告并选择分析模式（同原版）
4. 写入 drafts/03-plan.md（同原版）

### 阶段 3: 外部调研（不变）
[同原版]

### 阶段 4: 项目特征识别（改动）
1. 快速扫描（同原版）
2. **[增强]** 用 mycodemap CLI 加速特征识别：
   - `mycodemap deps` 查看模块依赖拓扑
   - `mycodemap cycles` 检测循环依赖
   - `mycodemap complexity` 了解复杂度热点
3. 从特征中提炼问题（同原版）
4. 向用户提问（同原版）

### 阶段 5: 动态报告结构设计（不变）
[同原版]

### 阶段 6: 并行深度分析（改动）
subagent prompt 模板增加：
- **[新增]** 使用 mycodemap CLI 辅助分析：
  - `mycodemap query -s "<symbol>"` 查询核心符号
  - `mycodemap query -m "<module>"` 获取模块上下文
  - `mycodemap analyze --intent overview -t "<path>"` 获取模块概览
- **[替换]** 优先用 mycodemap 获取结构化信息，减少逐文件 Read

### 阶段 7: 交叉验证（改动）
1-3. 覆盖率门控/抽查验证（同原版）
4. **[增强]** 用 `mycodemap impact -f "<file>"` 验证跨模块影响结论
5. 写入 drafts/07-cross-validation.md（同原版）

### 阶段 8: 最终报告（不变）
[同原版]

[其余章节：草稿文件清单、特殊场景、输出要求 — 同原版]
```

**Step 2: 验证文件**

```bash
wc -l examples/claude/skills/mycodemap-repo-analyzer/SKILL.md
grep -c "mycodemap" examples/claude/skills/mycodemap-repo-analyzer/SKILL.md
```

Expected: 300-500 行，mycodemap 出现 10+ 次

**Step 3: Commit**

```bash
git add examples/claude/skills/mycodemap-repo-analyzer/SKILL.md
git commit -m "feat: add mycodemap-repo-analyzer skill with CLI integration"
```

---

### Task 3: 增强 AI_ASSISTANT_SETUP.md — 增加一键安装引导章节

**Files:**
- Modify: `docs/AI_ASSISTANT_SETUP.md`

**Step 1: 在文件末尾（"参考"章节之前）增加新章节**

章节标题：`AI CLI 一键安装引导`

内容结构：

```markdown
## AI CLI 一键安装引导

> 本章节面向 AI CLI 工具（Claude Code、Codex CLI 等），提供结构化安装引导。
> 当用户说"帮我安装 mycodemap"时，AI CLI 应按照以下步骤引导。

### Step 1: 前置条件检查 [CONFIRM]

在开始安装前，确认以下条件：

- Node.js >= 18 是否已安装（`node --version`）
- 当前项目是否有 package.json（`ls package.json`）
- 向用户确认：是项目级别安装还是全局安装

### Step 2: 安装依赖 [CONFIRM]

```bash
# 项目级别安装（推荐）
npm install @mycodemap/mycodemap

# 或全局安装
npm install -g @mycodemap/mycodemap
```

### Step 3: 初始化 [CONFIRM]

```bash
# 先预览配置（不写入文件）
mycodemap init

# 确认后写入
mycodemap init -y
```

### Step 4: 生成代码地图

```bash
mycodemap generate
```

安装完成后会生成：
- `.mycodemap/AI_MAP.md` — 项目全局概览
- `.mycodemap/codemap.json` — 结构化数据
- `.mycodemap/CONTEXT.md` — 上下文入口

### Step 5: 配置 AI 助手 skill [CONFIRM]

根据使用的 AI 助手，拷贝对应的 skill 文件：

**Claude Code:**
```bash
mkdir -p .claude/skills/codemap
cp node_modules/@mycodemap/mycodemap/examples/claude/codemap-skill.md .claude/skills/codemap/SKILL.md

# 可选：安装架构分析技能
mkdir -p .claude/skills/mycodemap-repo-analyzer
cp node_modules/@mycodemap/mycodemap/examples/claude/skills/mycodemap-repo-analyzer/SKILL.md .claude/skills/mycodemap-repo-analyzer/SKILL.md
cp -r node_modules/@mycodemap/mycodemap/examples/claude/skills/mycodemap-repo-analyzer/references .claude/skills/mycodemap-repo-analyzer/
```

**Codex CLI:**
```bash
mkdir -p .agents/skills/codemap
cp node_modules/@mycodemap/mycodemap/examples/codex/codemap-agent.md .agents/skills/codemap/SKILL.md
```

### Step 6: 更新项目 rules [CONFIRM]

在项目的 `CLAUDE.md` 和 `AGENTS.md` 中追加以下内容：

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

### Step 7: 验证安装

```bash
# 验证 CLI 可用
mycodemap query --help

# 验证 skill 文件已就位
ls .claude/skills/codemap/SKILL.md
```

### 可选：MCP 服务器配置

如需使用 MCP 协议与 AI 助手集成：

```bash
mycodemap generate --symbol-level
mycodemap mcp install
```
```

**Step 2: 验证文件**

```bash
grep -c "一键安装引导" docs/AI_ASSISTANT_SETUP.md
grep -c "CONFIRM" docs/AI_ASSISTANT_SETUP.md
```

Expected: 一键安装引导出现 1 次，CONFIRM 出现 6 次

**Step 3: Commit**

```bash
git add docs/AI_ASSISTANT_SETUP.md
git commit -m "feat: add AI CLI one-click install guide to AI_ASSISTANT_SETUP.md"
```

---

### Task 4: 更新 README.md — AI 文档索引增加新 skill 链接

**Files:**
- Modify: `README.md:99-117`（AI / Agent 专属文档章节）

**Step 1: 在 AI 文档表格中增加一行**

在第 114 行（`docs/AI_ASSISTANT_SETUP.md` 行）之后增加：

```markdown
| **[🔍 examples/claude/skills/mycodemap-repo-analyzer/](examples/claude/skills/mycodemap-repo-analyzer/)** | 项目深度架构分析技能（基于 repo-analyzer + mycodemap CLI） |
```

**Step 2: 验证**

```bash
grep "mycodemap-repo-analyzer" README.md
```

Expected: 1 行匹配

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add mycodemap-repo-analyzer skill link to README AI docs index"
```

---

### Task 5: 端到端验证

**Step 1: 验证安装引导文档可读性**

```bash
# 检查 AI_ASSISTANT_SETUP.md 中新增章节的格式
grep -A 3 "一键安装引导" docs/AI_ASSISTANT_SETUP.md
```

**Step 2: 验证 skill 文件结构完整**

```bash
find examples/claude/skills/mycodemap-repo-analyzer -type f
```

Expected: 3 个文件（SKILL.md, analysis-guide.md, module-analysis-guide.md）

**Step 3: 验证 SKILL.md 中 mycodemap 集成点**

```bash
grep "mycodemap" examples/claude/skills/mycodemap-repo-analyzer/SKILL.md | head -20
```

Expected: 阶段1/2/4/6/7 中都有 mycodemap 命令引用

**Step 4: 运行文档检查**

```bash
npm run docs:check
```

Expected: 通过，无错误

**Step 5: 最终 commit（如有修复）**

```bash
git add -A
git commit -m "chore: fix docs check issues from install guide and skill additions"
```

---

## 验证方案

1. **安装引导**：用新的 AI CLI 会话，说"帮我安装 mycodemap"，验证 AI 能否按步骤引导完成
2. **Rules 文本片段**：拷贝 Step 6 的内容到测试项目的 CLAUDE.md，验证格式和内容正确
3. **repo-analyzer skill**：在 Claude Code 中安装 skill 后，说"mycodemap 分析项目 xxx"，验证 skill 激活和 mycodemap 命令调用
4. **文档同步**：`npm run docs:check` 通过
