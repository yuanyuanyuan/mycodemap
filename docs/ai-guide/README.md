# AI Guide 文档目录

> 专为 AI/Agent 设计的 CodeMap 使用指南。
>
> CodeMap 是一个 AI-first 代码地图工具；AI/Agent 是主要消费者。  
> 入口层优先聚焦 `generate`、`query`、`deps`、`impact`、`complexity`、`export`、`ci` 等核心分析能力。  
> `workflow` 是当前公开的 analysis-only 工作流能力，`ship` 仍是公开的过渡能力；`server`、`watch`、`report`、`logs` 已从 public CLI 移除，并在调用时给出迁移提示。

---

## 文档导航

| 文档 | 内容 | 阅读顺序 |
|------|------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | 快速开始、决策树、场景映射 | **第 1** |
| [COMMANDS.md](./COMMANDS.md) | 完整 CLI 命令参考 | 需要时查阅 |
| [OUTPUT.md](./OUTPUT.md) | JSON 输出结构解析 | 解析输出时查阅 |
| [PATTERNS.md](./PATTERNS.md) | 使用模式、最佳实践 | 实现复杂任务时 |
| [PROMPTS.md](./PROMPTS.md) | 即用型提示词模板 | 直接使用 |
| [INTEGRATION.md](./INTEGRATION.md) | 集成和错误处理 | 集成到 Agent 时 |

---

## 使用原则

| 原则 | 说明 |
|------|------|
| AI-first 入口 | 优先从 `AI_GUIDE.md`、`QUICKSTART.md`、`OUTPUT.md` 建立对产品和契约的理解 |
| 机器可读优先 | 当前 CLI 过渡现实下，大多数命令仍用 `--json` 暴露机器可读结果 |
| 人类可读显式入口 | `analyze` 当前支持 `--output-mode human`；其余命令按现有文本输出使用 |
| 边界优先 | `Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令 |

---

## 快速开始

### 如果你是 AI/Agent

1. **首先阅读**: `QUICKSTART.md` - 了解如何使用决策树选择命令
2. **然后参考**: `PROMPTS.md` - 使用提示词模板开始任务
3. **遇到问题时**: `INTEGRATION.md` - 查看错误处理方法

**建议顺序**：先理解产品定位，再进入命令细节；不要把 `workflow`、`ship` 当成首次接触项目时的主入口，也不要把已移除的 `server`、`watch`、`report`、`logs` 当成现行命令。

### 如果你是开发者

1. **查看**: `PROMPTS.md` - 选择适合场景的提示词模板
2. **复制**: 模板中的提示词到你的 AI 工具
3. **替换**: 模板变量（如 `{{FILE_PATH}}`）
4. **执行**: 让 AI 按照提示词步骤执行

---

## 文档统计

| 文档 | 行数 | 核心内容 |
|------|------|---------|
| QUICKSTART.md | 130 | 决策树、场景映射 |
| COMMANDS.md | 574 | 核心分析命令 + 移除命令迁移说明 |
| OUTPUT.md | 1546 | 目标契约、当前 CLI 现实与 JSON 结构 |
| PATTERNS.md | 498 | 核心分析模式 + 过渡 workflow 说明 |
| PROMPTS.md | 463 | 9个提示词模板 |
| INTEGRATION.md | 219 | MCP、Skill、错误处理 |
| **总计** | **3430** | **完整 AI 使用指南** |

---

## 主索引

项目根目录的 `AI_GUIDE.md` 是主索引文档，包含：
- 产品定位与目标用户
- 项目速览
- 命令选择速查表
- 文档导航
- 提示词模板速用
- 关键类型定义

**建议**: AI 首次接触项目时，先读取 `AI_GUIDE.md` 获取概览。

---

## 更新记录

- **2026-03-22**: 创建 AI Guide 文档体系 (v0.2.0 MVP3)
