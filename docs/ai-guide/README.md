# AI Guide 文档目录

> 专为 AI 大模型和 Agent 设计的 CodeMap 使用指南

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

## 快速开始

### 如果你是 AI/Agent

1. **首先阅读**: `QUICKSTART.md` - 了解如何使用决策树选择命令
2. **然后参考**: `PROMPTS.md` - 使用提示词模板开始任务
3. **遇到问题时**: `INTEGRATION.md` - 查看错误处理方法

### 如果你是开发者

1. **查看**: `PROMPTS.md` - 选择适合场景的提示词模板
2. **复制**: 模板中的提示词到你的 AI 工具
3. **替换**: 模板变量（如 `{{FILE_PATH}}`）
4. **执行**: 让 AI 按照提示词步骤执行

---

## 文档统计

| 文档 | 行数 | 核心内容 |
|------|------|---------|
| QUICKSTART.md | ~120 | 决策树、场景映射 |
| COMMANDS.md | ~350 | 16个命令完整参数 |
| OUTPUT.md | ~320 | JSON 结构、解析工具 |
| PATTERNS.md | ~290 | 6种工作流模式 |
| PROMPTS.md | ~300 | 8个提示词模板 |
| INTEGRATION.md | ~420 | MCP、Skill、错误处理 |
| **总计** | **~1800** | **完整 AI 使用指南** |

---

## 主索引

项目根目录的 `AI_GUIDE.md` 是主索引文档，包含：
- 项目速览
- 命令选择速查表
- 文档导航
- 提示词模板速用
- 关键类型定义

**建议**: AI 首次接触项目时，先读取 `AI_GUIDE.md` 获取概览。

---

## 更新记录

- **2026-03-22**: 创建 AI Guide 文档体系 (v0.2.0 MVP3)
