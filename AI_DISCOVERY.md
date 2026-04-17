# AI Discovery Hub - CodeMap

> 给 AI 大模型、Agent、搜索工具和搜索引擎的统一发现入口：先找到文档，再找到命令，再找到约束与输出契约。

---

## 🎯 项目速查表

| 项目维度 | 当前事实 |
|---------|----------|
| 产品定位 | AI-first 代码地图 + 架构契约治理工具 |
| 主要消费者 | AI/Agent 是主要消费者；人类负责 design contract、配置和审阅 |
| 发布版本 | `0.5.0` |
| 仓库主线 | 已完成 `v2.0` governance engine 相关代码与文档收口 |
| 运行时 | Node.js `>=20` |
| CLI 入口 | `dist/cli/index.js` |
| 主文档入口 | `AI_GUIDE.md` / `README.md` / `ARCHITECTURE.md` / `AGENTS.md` |

## 📋 快速导航速查表

| 你的身份 | 首先阅读 | 关键资源 | 推荐动作 |
|---------|---------|---------|---------|
| AI 大模型 | `AI_GUIDE.md` | `ai-document-index.yaml` | 先走命令决策树 |
| AI Agent | `AI_GUIDE.md` | `AGENTS.md` / `docs/ai-guide/INTEGRATION.md` | 先读约束，再执行 |
| 搜索工具 | `AI_DISCOVERY.md` | `ai-document-index.yaml` | 提取文档图和关键词 |
| 搜索引擎爬虫 | `AI_DISCOVERY.md` | JSON-LD / sitemap / GitHub URL | 索引 AI 文档入口 |
| 人类开发者 | `README.md` | `ARCHITECTURE.md` / `docs/SETUP_GUIDE.md` | 先理解产品面与安装 |

---

## 📡 机器可读文档地图

### JSON-LD 结构化数据

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "CodeMap",
  "description": "AI-first 代码地图与架构契约治理 CLI",
  "version": "0.5.0",
  "applicationCategory": "DeveloperApplication",
  "runtimePlatform": "Node.js >=20",
  "programmingLanguage": ["TypeScript", "JavaScript", "Go"],
  "codeRepository": "https://github.com/yuanyuanyuan/mycodemap",
  "documentation": [
    {
      "@type": "TechArticle",
      "name": "AI Guide",
      "url": "./AI_GUIDE.md",
      "audience": { "@type": "Audience", "audienceType": "AI/Agent" }
    },
    {
      "@type": "TechArticle",
      "name": "AI Commands",
      "url": "./docs/ai-guide/COMMANDS.md",
      "audience": { "@type": "Audience", "audienceType": "AI/Agent" }
    },
    {
      "@type": "TechArticle",
      "name": "Architecture",
      "url": "./ARCHITECTURE.md",
      "audience": { "@type": "Audience", "audienceType": "Developer" }
    }
  ]
}
```

### AI 文档索引

完整的机器可读索引位于 `./ai-document-index.yaml`。

| 资源 | 用途 | 适用场景 |
|------|------|----------|
| `ai-document-index.yaml` | 文档图、关键词、命令索引 | Agent 自动发现 |
| `AI_GUIDE.md` | 决策树、模式、模板 | 需要快速开始时 |
| `docs/ai-guide/COMMANDS.md` | 当前 CLI 真相 | 需要命令细节时 |
| `docs/ai-guide/OUTPUT.md` | 输出接口定义 | 需要 JSON 契约时 |

> 如果你是 AI/Agent，优先解析 `ai-document-index.yaml`，再读取 `AI_GUIDE.md` 和 `AGENTS.md`。

---

## 🧭 当前公共产品面

| 平面 | 公开命令 | 真相 |
|------|----------|------|
| Code Map | `generate` / `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` / `export` | 生成和查询结构化代码上下文 |
| Governance | `design` / `check` / `history` / `ci` | 把 design contract 变成可执行治理规则 |
| Workflow / Ship | `workflow` / `ship` | `workflow` 是 analysis-only；`ship` 是发布过渡能力 |
| Removed | `server` / `watch` / `report` / `logs` | 已从 public CLI 移除，保留迁移提示而非功能 |

### 命令模式速查表

| 任务 | 先读文档 | 直接命令 |
|------|----------|----------|
| 生成代码地图 | `README.md` / `docs/ai-guide/QUICKSTART.md` | `mycodemap generate` |
| 校验设计契约 | `docs/ai-guide/COMMANDS.md` | `mycodemap design validate mycodemap.design.md --json` |
| 执行 contract gate | `docs/ai-guide/COMMANDS.md` / `docs/ai-guide/OUTPUT.md` | `mycodemap check --contract mycodemap.design.md --against src` |
| 查询 history risk | `docs/ai-guide/COMMANDS.md` | `mycodemap history --symbol createCheckCommand` |
| 评估 CI 风险 | `docs/ai-guide/PATTERNS.md` | `mycodemap ci assess-risk -f src/cli/index.ts` |
| 理解系统边界 | `ARCHITECTURE.md` | 先看模块图，再读命令文档 |

---

## 🤖 AI 发现路径

### 路径 1：根目录扫描

当 AI 访问仓库根目录时，应该按这个顺序：

```text
1. 发现 AI_GUIDE.md
2. 发现 AGENTS.md
3. 发现 ai-document-index.yaml
4. 发现 README.md / ARCHITECTURE.md
5. 再进入 docs/ai-guide/*
```

### 路径 2：命令面驱动

如果请求包含“怎么查影响 / 怎么做 contract gate / 怎么看风险”，建议这样路由：

```bash
# 结构理解
mycodemap generate
mycodemap analyze -i read -t src/cli/index.ts --json

# 设计契约
mycodemap design validate mycodemap.design.md --json
mycodemap design handoff mycodemap.design.md --json

# 治理执行
mycodemap check --contract mycodemap.design.md --against src --base origin/main --annotation-format github
mycodemap history --symbol createCheckCommand
mycodemap ci assess-risk -f src/cli/index.ts
```

### 路径 3：约束优先

| 如果问题涉及 | 必读文件 | 原因 |
|-------------|----------|------|
| 仓库规则 / DoD / 风险等级 | `AGENTS.md` | 这是仓库级强约束 |
| 输出 JSON / machine schema | `docs/ai-guide/OUTPUT.md` | 避免猜输出结构 |
| 集成 / 错误处理 | `docs/ai-guide/INTEGRATION.md` | 避免假设旧命令或旧后端 |
| 架构边界 | `ARCHITECTURE.md` | 区分内部 Server Layer 与公共 CLI |

---

## 🔍 搜索与索引关键词

### 主要关键词

- `CodeMap AI-first code map`
- `CodeMap architecture contract governance`
- `mycodemap check contract gate`
- `mycodemap history symbol risk`
- `CodeMap SQLite governance graph`

### 搜索引擎 / AI 搜索工具建议

| 平台 | 推荐摘要模式 | 应突出内容 |
|------|-------------|-----------|
| Web 搜索 | FAQ / 速查表 | AI 文档入口、命令清单、契约治理 |
| AI 搜索 | 示例驱动 | `design → check → ci` 的模式链路 |
| Agent 检索 | 结构化文档图 | `ai-document-index.yaml` + `AI_GUIDE.md` |

### Sitemap 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://github.com/yuanyuanyuan/mycodemap/blob/main/AI_GUIDE.md</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://github.com/yuanyuanyuan/mycodemap/blob/main/docs/ai-guide/COMMANDS.md</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://github.com/yuanyuanyuan/mycodemap/blob/main/ARCHITECTURE.md</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## 🧪 提示词模板与发现模式

| 意图 | 推荐提示词模板 | 期望结果 |
|------|---------------|---------|
| 理解仓库结构 | “先读 `AI_GUIDE.md` 和 `ARCHITECTURE.md`，再告诉我 public CLI 与内部层边界” | 系统地图 |
| 做 contract gate | “根据 `mycodemap.design.md` 和 `docs/ai-guide/COMMANDS.md`，给我 `check --contract` 的执行方案” | 可执行命令 |
| 排查风险 | “用 `history --symbol` 与 `ci assess-risk` 的统一 risk truth 分析这个改动” | 风险摘要 |

### 发现模式

1. **入口优先**：先看 `AI_GUIDE.md`，不要直接盲搜 `docs/`。
2. **契约优先**：需要输出时先读 `docs/ai-guide/OUTPUT.md`。
3. **约束优先**：要改代码或文档时先读 `AGENTS.md`。
4. **边界优先**：看到 `Server Layer` 时，不要推断存在公共 `mycodemap server`。

---

## 📞 反馈与改进

如果 AI 文档难以被发现或误导了模型，请优先：

| 动作 | 目的 |
|------|------|
| 更新 `AI_GUIDE.md` / `AI_DISCOVERY.md` | 修正文档入口 |
| 更新 `ai-document-index.yaml` | 修正文档图 |
| 运行 `npm run docs:check` | 验证根文档与 AI 文档一致性 |

---

*本文档服务于 AI 文档发现、搜索引擎索引与 Agent 路由。*
*最后更新: 2026-04-17*
