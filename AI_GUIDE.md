# AI Guide - CodeMap Project

> 本文档是 AI/Agent 使用 CodeMap 的**主索引**。
> 
> 🔍 **机器可读索引**: `ai-document-index.yaml`  
> 📖 **发现机制**: `AI_DISCOVERY.md`  
> 📚 **详细文档**: `docs/ai-guide/` 目录
> 
> 版本: 0.3.3 (MVP3) | 生成时间: 2026-03-22

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

## 📋 命令选择速查表

| 用户意图 | 推荐命令 |
|---------|---------|
| "项目结构是什么" | `generate` → 读 `AI_MAP.md` |
| "XXX 在哪里定义" | `query -s "XXX"` |
| "修改 XXX 会影响什么" | `analyze -i impact -t "XXX" --json` |
| "XXX 模块依赖什么" | `analyze -i dependency -t "XXX" --json` |
| "代码质量如何" | `analyze -i complexity -t "src/" --json` |
| "查找与 XXX 相关的代码" | `analyze -i search -k "XXX" --json` |
| "这个改动安全吗" | `ci assess-risk` |
| "需要重构建议" | `analyze -i refactor -t "src/" --json` |
| "一键发布 npm 包" | `ship` 或 `ship --dry-run` |

**完整决策树**: 见 [docs/ai-guide/QUICKSTART.md](./docs/ai-guide/QUICKSTART.md)

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

---

## 💡 提示词模板速用

### 模板 1: 理解项目
```markdown
我需要理解这个 TypeScript 项目的结构。
请执行：
1. `node dist/cli/index.js generate`
2. 阅读 `.mycodemap/AI_MAP.md`
3. 使用 `analyze -i overview -t "src/" --json`
4. 输出项目结构分析
```

### 模板 2: 变更影响分析
```markdown
我需要修改 {{FILE}}，请分析影响范围。
请执行：
1. `node dist/cli/index.js analyze -i impact -t "{{FILE}}" --transitive --json`
2. 分析直接依赖和传递依赖
3. 评估风险等级
4. 给出修改建议
```

**更多模板**: 见 [docs/ai-guide/PROMPTS.md](./docs/ai-guide/PROMPTS.md)

---

## ⚡ 关键类型定义

```typescript
// analyze 输出结构
interface AnalyzeOutput {
  schemaVersion: "v1.0.0";
  intent: string;
  tool: string;
  confidence: { score: number; level: "high" | "medium" | "low"; };
  results: Array<{
    file: string;
    location?: { file: string; line: number; column: number; };
    content?: string;
    relevance: number;
  }>;
}
```

**完整类型定义**: 见 [docs/ai-guide/OUTPUT.md](./docs/ai-guide/OUTPUT.md)

---

## 🔧 常用模式速查

### 模式 A: 首次接触项目
```bash
generate → 读 AI_MAP.md → query -m "src/core"
```

### 模式 B: 实现新功能
```bash
analyze -i search -k "关键词" → analyze -i impact -t "文件" → 实现 → ci check-headers
```

### 模式 C: 重构代码
```bash
cycles → analyze -i complexity → analyze -i impact --transitive → analyze -i refactor
```

**完整模式**: 见 [docs/ai-guide/PATTERNS.md](./docs/ai-guide/PATTERNS.md)

---

## ❓ 常见问题

| 问题 | 解决 |
|------|------|
| 代码地图不存在 | 先执行 `generate` |
| 符号未找到 | 使用 `query -S` 模糊搜索 |
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
