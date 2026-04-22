# AI Guide - CodeMap Project

> 本文档是 AI/Agent 使用 CodeMap 的**主索引**。
> 
> CodeMap 是一个 AI-first 代码地图工具。AI/Agent 是主要消费者；人类开发者负责配置、维护与按需阅读输出。  
> 当前 CLI 过渡现实：多数命令通过 `--json` 输出机器可读结果；`analyze` 额外提供 `--output-mode machine|human`，`design validate` 负责校验 human-authored design contract，`design map` 负责把 design contract 映射成 candidate code scope。
> 命名边界：`Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令。  
> 
> 🔍 **机器可读索引**: `ai-document-index.yaml`  
> 📖 **发现机制**: `AI_DISCOVERY.md`  
> 📚 **详细文档**: `docs/ai-guide/` 目录
> 
> 版本: 0.5.2-beta.1 (MVP3) | 生成时间: 2026-04-19

---

## 🚀 快速开始

```bash
# Step 1: 生成代码地图
node dist/cli/index.js generate

# Step 2: 阅读项目概览
cat .mycodemap/AI_MAP.md

# Step 3: 开始使用...
```

---

## 🎯 产品定位速查

| 维度 | 结论 |
|------|------|
| 产品定位 | `CodeMap` 是一个 AI-first 代码地图工具 |
| 主要消费者 | AI/Agent |
| 人类角色 | 配置、维护、按需阅读输出 |
| 当前机器输出入口 | 多数命令显式使用 `--json`；`analyze` 支持 `--output-mode machine` |
| 当前人类输出入口 | `analyze --output-mode human`，其他命令大多保留现有文本输出 |
| 命名边界 | `Server Layer` ≠ 公共 `mycodemap server` 命令 |
| 文件发现契约 | 扫描类命令共享 `.gitignore` 感知排除模块；无 `.gitignore` 时回退到默认 `exclude` |

---

## 📋 命令选择速查表

| 用户意图 | 推荐命令 |
|---------|---------|
| "项目结构是什么" | `generate` → 读 `AI_MAP.md` |
| "XXX 在哪里定义" | `query -s "XXX"` |
| "修改 XXX 会影响什么" | `impact -f "XXX" -t -j` |
| "XXX 模块依赖什么" | `deps -m "XXX" -j` |
| "代码质量如何" | `complexity -f "src/file.ts" -j` |
| "查找与 XXX 相关的代码" | `query -S "XXX" -j` |
| "这个改动安全吗" | `ci assess-risk --json` |
| "这个符号最近为什么危险 / 谁改过" | `history --symbol <name>` |
| "发布前是否满足门禁" | `ci check-working-tree → ci check-branch → ci check-scripts` |
| "需要执行复杂的多步骤分析" | `workflow start "任务描述" --json` |
| "需要验证文档/契约是否同步" | `ci check-docs-sync`（含 analyze generated block 校验） |
| "需要先把人类设计写成可验证输入" | `design validate mycodemap.design.md --json` |
| "需要把 design contract 映射成代码范围" | `design map mycodemap.design.md --json` |
| "需要把 design scope 打包成 agent handoff" | `design handoff mycodemap.design.md --json` |
| "需要检查实现是否仍在批准范围内" | `design verify mycodemap.design.md --json` |
| "需要把 design contract 作为代码门禁执行" | `check --contract mycodemap.design.md --against src` |
| "需要在 PR 中看到 contract gate annotations" | `check --contract mycodemap.design.md --against src --base <sha> --annotation-format github` |
| "需要导出结构化结果" | `export json -o ./output.json` |
| "需要先把项目初始化到 canonical `.mycodemap/` 工作区" | `init --interactive` → 确认 receipt → `init --yes` |
| "需要插件诊断/扩展结果" | `generate` → 读 `AI_MAP.md` 的 `Plugin Summary` 或解析 `codemap.json.pluginReport` |
| "需要切换/排查图存储后端" | 编辑 `.mycodemap/config.json` 的 `storage` 段 → 运行 `generate` / `export` |
| "需要把 symbol-level 关系暴露给 MCP host" | `generate --symbol-level` → `mcp install` → 让 host 启动 `mcp start` |

**完整决策树**: 见 [docs/ai-guide/QUICKSTART.md](./docs/ai-guide/QUICKSTART.md)

> 运行环境提示：仓库内 Agent shell 可能使用 `rtk` 作为 token 节省 wrapper；`rtk` 不是 CodeMap 产品功能、CLI 依赖或用户可见能力。

---

## 🔌 插件扩展点速查

```jsonc
{
  "plugins": {
    "builtInPlugins": false,
    "pluginDir": "./codemap-plugins",
    "plugins": ["complexity-analyzer", "my-local-plugin"],
    "debug": true
  }
}
```

- 只有显式存在 `plugins` 段时，`generate` 才会进入插件 runtime；没有该段的旧项目保持 v1.0 行为。
- 运行结果会同时写入 `AI_MAP.md` 的 `Plugin Summary` 与 `codemap.json` 的 `pluginReport`。
- `pluginReport.diagnostics[]` 用统一结构暴露 `load / initialize / analyze / generate` 四个阶段的 warning / error。

---

## 🗄️ 图存储后端速查

```jsonc
{
  "storage": {
    "type": "filesystem",
    "outputPath": ".mycodemap/storage"
  }
}
```

```jsonc
{
  "storage": {
    "type": "sqlite",
    "databasePath": ".mycodemap/governance.sqlite"
  }
}
```

- `generate` 会写入配置的图存储后端；`export` 与内部 `Server Layer` handler 会读取同一份后端数据。
- `generate --symbol-level` 只在显式开启时额外 materialize symbol-level `call` 依赖；未开启时默认 generate 行为保持兼容。
- `generate` 产出的 `codemap.json` / 图存储会携带 `graphStatus`、`failedFileCount` 与可选 `parseFailureFiles`；若 `graphStatus = "partial"`，说明发现到的文件没有全部成功进入最终图。
- `neo4j` 与 `kuzudb` 已不再是正式支持的 backend；旧配置会暴露显式迁移错误，不会静默 fallback。
- 选择 `sqlite` 时建议落盘到 `.mycodemap/governance.sqlite`；也可通过 `storage.databasePath` 覆盖。
- `storage.type = "auto"` 当前优先选择 `sqlite`；若运行时缺少 `better-sqlite3` 或 Node.js `<20` 导致 SQLite 不可用，则 warning 后回退到 `filesystem`。
- 图存储后端是存储面收口，不是重新开放公共 HTTP API 产品面。

---

## 🔌 Experimental MCP 薄切片

```bash
# 1. 先生成 symbol-level 图
node dist/cli/index.js generate --symbol-level

# 2. 把当前仓库安装到本地 MCP host 配置
node dist/cli/index.js mcp install

# 3. 由 MCP host 启动本地 stdio server
node dist/cli/index.js mcp start
```

- 当前 canonical path 是**本地、只读、stdio first** 的 experimental MCP server。
- 首期只暴露两个工具：`codemap_query`、`codemap_impact`。
- 两个工具都会返回 `graph_status`、`generated_at`、`error.code`；若图不存在，返回 `GRAPH_NOT_FOUND`，不会伪装成空结果。
- `mcp install` 当前只维护**当前仓库根目录**的 `.mcp.json`，不承诺全局安装/卸载生命周期。
- 详细集成步骤见 `docs/ai-guide/INTEGRATION.md`；完整 output contract 见 `docs/ai-guide/OUTPUT.md`。

---

## 📚 文档导航

### 机器可读资源

| 资源 | 用途 |
|------|------|
| [`ai-document-index.yaml`](./ai-document-index.yaml) | 完整的文档索引（YAML格式，供 AI 解析） |
| [`AI_DISCOVERY.md`](./AI_DISCOVERY.md) | 通用发现机制、SEO 优化、搜索策略 |

### 详细文档

| 文档 | 内容 | 何时阅读 |
|------|------|---------|
| [QUICKSTART.md](./docs/ai-guide/QUICKSTART.md) | 快速开始、决策树、场景映射 | **首次使用** |
| [COMMANDS.md](./docs/ai-guide/COMMANDS.md) | 完整 CLI 命令参考 | 需要具体命令参数时 |
| [OUTPUT.md](./docs/ai-guide/OUTPUT.md) | JSON 输出结构解析 | 需要解析命令输出时 |
| [PATTERNS.md](./docs/ai-guide/PATTERNS.md) | 使用模式、最佳实践 | 实现复杂任务时 |
| [PROMPTS.md](./docs/ai-guide/PROMPTS.md) | 即用型提示词模板 | 直接使用或改编 |
| [INTEGRATION.md](./docs/ai-guide/INTEGRATION.md) | MCP/Skill 集成、错误处理 | 集成到 Agent 系统时 |

---

## 🏗️ MVP3 架构速览

```
CLI Layer → Server Layer → Domain Layer → Infrastructure Layer → Interface Layer
```

| 层级 | 目录 | 关键文件 |
|------|------|---------|
| CLI | `src/cli/` | `commands/`, `index.ts` |
| Server | `src/server/` | `CodeMapServer.ts` |
| Domain | `src/domain/` | `entities/`, `services/` |
| Infrastructure | `src/infrastructure/` | `storage/`, `parser/` |
| Interface | `src/interface/` | `types/`, `config/` |

> `Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令；后者已从 public CLI 移除，CLI 只保留显式迁移提示。

---

## 💡 提示词模板速用

### 模板 1: 理解项目
<!-- BEGIN GENERATED: analyze-ai-guide-project-template -->
```markdown
我需要理解这个 TypeScript 项目的结构。
请执行：
1. `node dist/cli/index.js generate`
2. 阅读 `.mycodemap/AI_MAP.md`
3. 使用 `analyze -i show -t "src/" --json`
4. 输出项目结构分析
```
<!-- END GENERATED: analyze-ai-guide-project-template -->

### 模板 2: 变更影响分析
<!-- BEGIN GENERATED: analyze-ai-guide-impact-template -->
```markdown
我需要修改 {{FILE}}，请分析影响范围。
请执行：
1. `node dist/cli/index.js analyze -i read -t "{{FILE}}" --scope transitive --json`
2. 分析直接依赖和传递依赖
3. 评估风险等级
4. 给出修改建议
```
<!-- END GENERATED: analyze-ai-guide-impact-template -->

**更多模板**: 见 [docs/ai-guide/PROMPTS.md](./docs/ai-guide/PROMPTS.md)

### design contract 速用

```bash
cp docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md mycodemap.design.md
node dist/cli/index.js design validate mycodemap.design.md --json
node dist/cli/index.js design map mycodemap.design.md --json
node dist/cli/index.js design handoff mycodemap.design.md --json
node dist/cli/index.js design verify mycodemap.design.md --json
node dist/cli/index.js check --contract mycodemap.design.md --against src
```

- 默认输入文件：`mycodemap.design.md`
- 必填 sections：`Goal` / `Constraints` / `Acceptance Criteria` / `Non-Goals`
- 建议顺序：`design validate → design map → design handoff → design verify`
- `design map` 会输出 `summary`、`candidates`、`diagnostics` 与 `unknowns`
- `design handoff` 会输出 `readyForExecution`、`approvals`、`assumptions`、`openQuestions`
- `design verify` 会输出 `checklist`、`drift`、`diagnostics` 与 `readyForExecution`
- `check` 会输出 `ContractCheckResult`，默认 JSON，`severity:error` 返回非零退出码
- `check` / `ci assess-risk` / `history` 现在共用同一套 Git history risk truth；history unavailable 时会显式给出 `unavailable` / `confidence=low`，而不是伪装成低风险
- 通用代码查找默认仍推荐 `query -S "XXX" -j`；`analyze -i find -k "XXX" --json --structured` 适合需要统一 analyze schema 的 Agent 流程
- `analyze find` 如果 scanner degraded，会在 stdout JSON 的 `diagnostics.status` 暴露 `partialFailure` 或 `failure`，不要只看 `results=[]`
- 失败时返回结构化 diagnostics，供后续 handoff / mapping 流程阻断使用

---

## ⚡ 关键类型定义

```typescript
// analyze 输出结构
interface AnalyzeOutput {
  schemaVersion: "v1.0.0";
  intent: "find" | "read" | "link" | "show";
  tool: string;
  confidence: { score: number; level: "high" | "medium" | "low"; };
  diagnostics?: AnalyzeDiagnostics;
  warnings?: Array<{
    code:
      | "deprecated-intent"
      | "git-history-unavailable"
      | "git-history-precompute-recommended"
      | "git-history-stale"
      | "git-history-unsupported-intent";
    replacementIntent?: "find" | "read" | "link" | "show";
  }>;
  analysis?: unknown;
  results: Array<{
    file: string;
    location?: { file: string; line: number; column: number; };
    content?: string;
    relevance: number;
    metadata?: {
      historyRisk?: {
        status: "ok" | "ambiguous" | "not_found" | "unavailable";
        level: "high" | "medium" | "low" | "unavailable";
        confidence: "high" | "medium" | "low" | "unavailable";
        freshness: "fresh" | "stale" | "expired" | "unknown";
      };
    };
  }>;
}

interface AnalyzeDiagnostics {
  status: "success" | "partialFailure" | "failure";
  items: AnalyzeDiagnostic[];
  failedTools?: string[];
  degradedTools?: string[];
}

interface AnalyzeDiagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  source: string;
  recoverable: boolean;
}

interface DesignValidateOutput {
  ok: boolean;
  exists: boolean;
  filePath: string;
  title?: string;
  missingRequiredSections: Array<"goal" | "constraints" | "acceptanceCriteria" | "nonGoals">;
  rules: Array<{
    name: string;
    type: "layer_direction" | "forbidden_imports" | "module_public_api_only";
    severity: "error" | "warn";
  }>;
  diagnostics: Array<{
    code:
      | "file-not-found"
      | "missing-section"
      | "duplicate-section"
      | "empty-section"
      | "unknown-section"
      | "ambiguous-heading"
      | "invalid-frontmatter"
      | "invalid-rules-root"
      | "invalid-rule-type"
      | "missing-rule-field"
      | "invalid-rule-severity"
      | "unknown-rule-field"
      | "unknown-frontmatter-field";
    severity: "error" | "warning" | "info";
    message: string;
    section?: "goal" | "constraints" | "acceptanceCriteria" | "nonGoals" | "context" | "openQuestions" | "notes";
  }>;
}

interface ContractCheckResult {
  passed: boolean;
  scan_mode: "full" | "diff";
  contract_path: string;
  against_path: string;
  changed_files: string[];
  scanned_files: string[];
  warnings: Array<{
    code: string;
    message: string;
    details?: Record<string, string | number | boolean | null>;
  }>;
  history?: {
    status: "ok" | "ambiguous" | "not_found" | "unavailable";
    confidence: "high" | "medium" | "low" | "unavailable";
    freshness: "fresh" | "stale" | "expired" | "unknown";
    scope_mode: "full" | "partial" | "top-files-only" | "precompute-required";
    requires_precompute: boolean;
  };
  violations: Array<{
    rule: string;
    rule_type: "layer_direction" | "forbidden_imports" | "module_public_api_only" | "complexity_threshold";
    severity: "error" | "warn";
    location: string;
    message: string;
    dependency_chain: string[];
    hard_fail: boolean;
    diagnostic?: {
      file?: string;
      line?: number;
      column?: number;
      endLine?: number;
      endColumn?: number;
      scope: "line" | "file" | "general";
      source: "dependency-cruiser" | "custom-evaluator";
      category: "dependency" | "module_boundary" | "complexity";
      degraded: boolean;
    };
    risk?: {
      status: "ok" | "ambiguous" | "not_found" | "unavailable";
      level: "high" | "medium" | "low" | "unavailable";
      confidence: "high" | "medium" | "low" | "unavailable";
      freshness: "fresh" | "stale" | "expired" | "unknown";
      score: number | null;
      factors: string[];
    };
  }>;
  summary: {
    total_violations: number;
    error_count: number;
    warn_count: number;
    scanned_file_count: number;
    rule_count: number;
  };
}

interface HistoryCommandResult {
  query: string;
  status: "ok" | "ambiguous" | "not_found" | "unavailable";
  warnings: string[];
  risk: {
    level: "high" | "medium" | "low" | "unavailable";
    score: number | null;
    riskFactors: string[];
  };
}

interface DesignMapOutput {
  ok: boolean;
  filePath: string;
  summary: {
    candidateCount: number;
    blocked: boolean;
    unknownCount: number;
    diagnosticCount: number;
  };
  candidates: Array<{
    kind: "file" | "module" | "symbol";
    path: string;
    symbolName?: string;
    moduleName?: string;
    reasons: Array<{
      section: string;
      matchedText: string;
      evidenceType: string;
      detail?: string;
    }>;
    dependencies: string[];
    testImpact: string[];
    risk: "high" | "medium" | "low";
    confidence: { score: number; level: "high" | "medium" | "low"; };
    unknowns: string[];
  }>;
  diagnostics: Array<{
    code: "no-candidates" | "over-broad-scope" | "high-risk-scope" | string;
    severity: "error" | "warning" | "info";
    blocker: boolean;
    message: string;
    candidatePaths?: string[];
  }>;
}

interface DesignHandoffOutput {
  ok: boolean;
  filePath: string;
  outputDir: string;
  readyForExecution: boolean;
  artifacts: {
    stem: string;
    markdownPath: string;
    jsonPath: string;
  };
  summary: {
    candidateCount: number;
    touchedFileCount: number;
    supportingFileCount: number;
    testCount: number;
    riskCount: number;
    approvalCount: number;
    assumptionCount: number;
    openQuestionCount: number;
    diagnosticCount: number;
    requiresReview: boolean;
  };
  handoff: {
    goal: string[];
    constraints: string[];
    acceptanceCriteria: string[];
    nonGoals: string[];
    touchedFiles: string[];
    supportingFiles: string[];
    tests: string[];
    risks: string[];
    validationChecklist: string[];
    approvals: Array<{ id: string; status: "approved" | "needs-review"; text: string; sourceRefs: string[]; }>;
    assumptions: Array<{ id: string; text: string; sourceRefs: string[]; }>;
    openQuestions: Array<{ id: string; text: string; sourceRefs: string[]; }>;
  };
  diagnostics: Array<{
    code: "blocked-mapping" | "review-required" | string;
    severity: "error" | "warning" | "info";
    blocker: boolean;
    message: string;
    sourceRefs: string[];
  }>;
}

interface DesignVerificationOutput {
  ok: boolean;
  filePath: string;
  readyForExecution: boolean;
  summary: {
    checklistCount: number;
    satisfiedCount: number;
    needsReviewCount: number;
    violatedCount: number;
    blockedCount: number;
    driftCount: number;
    diagnosticCount: number;
    reviewRequired: boolean;
    blocked: boolean;
  };
  checklist: Array<{
    id: string;
    text: string;
    status: "satisfied" | "needs-review" | "violated" | "blocked";
    evidenceRefs: string[];
  }>;
  drift: Array<{
    kind: "scope-extra" | "acceptance-unverified" | "handoff-missing" | "blocked-input";
    severity: "error" | "warning" | "info";
    message: string;
    sourceRefs: string[];
  }>;
  diagnostics: Array<{
    code: "handoff-missing" | "handoff-invalid" | "blocked-input" | string;
    severity: "error" | "warning" | "info";
    blocker: boolean;
    message: string;
    sourceRefs: string[];
  }>;
}

interface PluginExecutionReport {
  loadedPlugins: string[];
  generatedFiles: string[];
  metrics: Record<string, unknown>;
  diagnostics: Array<{
    plugin?: string;
    stage: "load" | "initialize" | "analyze" | "generate";
    level: "warning" | "error";
    message: string;
  }>;
}
```

> CI-native contract gate truth：PR 默认 hard gate 仅在 calibration 通过且 `changed files <= 10` 时启用；超过窗口、`diff-scope-fallback` 或 `false-positive rate >10%` 时必须退回 `warn-only / fallback`。GitHub 用 `--annotation-format github`，GitLab 用 `--annotation-format gitlab --annotation-file gl-code-quality-report.json`。校准命令：`node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10`

**完整类型定义**: 见 [docs/ai-guide/OUTPUT.md](./docs/ai-guide/OUTPUT.md)

---

## 🔧 常用模式速查

### 模式 A: 首次接触项目
```bash
generate → 读 AI_MAP.md → query -m "src/core"
```

### 模式 B: 分析并落地新功能
```bash
query -S "关键词" -j → impact -f "文件" -t -j → 实现 → ci check-headers
```

### 模式 C: 重构代码
```bash
cycles → analyze -i read -t "src/core/analyzer.ts" --scope transitive → analyze -i link -t "src/core/analyzer.ts"
```

### 模式 D: CI-native contract gate
```bash
node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10 → check --contract mycodemap.design.md --against src --base "$BASE_SHA" --annotation-format github
```

**完整模式**: 见 [docs/ai-guide/PATTERNS.md](./docs/ai-guide/PATTERNS.md)

---

## 🚀 发布故障排除 (`codemap ship`)

### 置信度不足导致发布被阻止

当运行 `codemap ship` 时，如果看到以下错误：

```
置信度: 55/100
发布被阻止: 检查未通过
  置信度过低 (55/100)
```

**原因**: 系统根据以下因素计算置信度：
- 所有 commit 遵循规范 (+20)
- 测试覆盖率 > 80% (+10)
- 修改了高风险模块 (-10)
- CHANGELOG 已更新 (+5)
- 修改文件较多 (-10)

**解决步骤**（非交互环境）:

```bash
# 步骤 1: 生成覆盖率报告
npm test -- --coverage

# 步骤 2: 确保 coverage/lcov.info 存在
# 如果未生成，手动创建包含足够覆盖率数据的 lcov.info

# 步骤 3: 更新 CHANGELOG.md 添加新版本说明

# 步骤 4: 提交所有更改
git add .
git commit -m "[CONFIG] version: bump to vX.Y.Z"

# 步骤 5: 手动创建 tag 并推送
git tag -a "vX.Y.Z" -m "Release vX.Y.Z"
git push origin main --tags
```

**注意**: 当前 `--yes` 选项仅在置信度 60-75 且终端可交互时有效。非 TTY 环境需要手动执行上述步骤。

### 发布前检查清单（必做）

**关键教训**: v0.4.x 发布曾因版本号不一致失败多次。发布前务必执行：

```bash
# 1. 运行预发布检查（必做）
npm run docs:check:pre-release

# 2. 确保所有版本文件已同步
# 以下文件必须包含相同版本号：
# - package.json
# - package-lock.json
# - llms.txt
# - ai-document-index.yaml
# - AI_GUIDE.md
# - AI_DISCOVERY.md

# 3. 本地测试通过
npm run check:all

# 4. 创建 tag 并推送
git tag -a "vX.Y.Z" -m "Release vX.Y.Z"
git push origin main --tags
```

**失败回滚**: 如果 GitHub Actions 失败，需要删除远程 tag 后重新创建：
```bash
git push origin :refs/tags/vX.Y.Z   # 删除远程 tag
git tag -d vX.Y.Z                    # 删除本地 tag
# 修复问题后重新创建 tag
```

---

## ❓ 常见问题

| 问题 | 解决 |
|------|------|
| 代码地图不存在 | 先执行 `generate` |
| 符号未找到 | 使用 `query -S` 模糊搜索 |
| 需要结构化结果 | 多数命令显式加 `--json`；`analyze` 也可用 `--output-mode machine` |
| tree-sitter 错误 | 安装 `build-essential` (Linux) 或 Xcode (macOS) |
| 提交格式错误 | 使用 `[TAG] scope: message` 格式 |

**完整故障排除**: 见 [docs/ai-guide/INTEGRATION.md#错误处理](./docs/ai-guide/INTEGRATION.md#错误处理)

---

## 📖 相关文档

- `AGENTS.md` - 仓库级强约束
- `CLAUDE.md` - AI 执行手册
- `ARCHITECTURE.md` - 系统架构总图
- `README.md` - 用户指南

---

*主索引文档 | 完整内容请查看 docs/ai-guide/ 目录*
