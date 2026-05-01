<!-- rtk-instructions v2 -->
@/home/stark/.claude/RTK.md

# CLAUDE.md — CodeMap 入口路由

> 本文件只回答三件事：**谁定权、下一步去哪读、规则变更时该改哪份文档**。
> 它不是执行手册、命令速查、验证清单或交付 checklist。

## 角色分工

| 文档                | 角色                                                      | 不负责什么                           |
|---------------------|-----------------------------------------------------------|--------------------------------------|
| `AGENTS.md`         | 仓库级宪法：治理协议、证据协议、改动边界、验证/交付底线       | 不负责长命令表、任务模板、产品使用说明 |
| `CLAUDE.md`         | 入口路由：告诉 Claude/Codex 下一份该读什么                 | 不负责执行政策正文                   |
| `.claude/CLAUDE.md` | Claude adapter：解释 Claude 自动读取与 shared truth 的关系 | 不负责第二套规则                     |

## 加载顺序

```text
AGENTS.md → docs/rules/README.md → 最相关的 1-2 份 live docs → ARCHITECTURE.md / AI_GUIDE.md → 代码事实
```

## 按问题路由

| 你现在需要回答的问题                              | 去读哪里                                                    |
|---------------------------------------------------|-------------------------------------------------------------|
| 仓库级规则、证据标签、任务等级、改动红线是什么？      | `AGENTS.md`                                                 |
| 改某类文件时先读哪份规则？                         | `docs/rules/README.md`                                      |
| 计划/执行/交付怎么写，任务模板放哪？                | `docs/rules/engineering-with-codex-openai.md`               |
| 验证顺序、hooks、CI、rule-system defaults 在哪？      | `docs/rules/validation.md`                                  |
| 工具命名规范在哪里？                                  | `AGENTS.md` Section 10（产品名、公开 CLI、兼容别名分开写）      |
| 架构分层、依赖方向、模块边界是什么？                 | `ARCHITECTURE.md` + `docs/rules/architecture-guardrails.md` |
| 代码搜索、项目分析、影响评估先用什么？                | `AGENTS.md` Section 6（CodeMap CLI 优先，标准文本工具只作回退） |
| 代码质量红线、`[META]` / `[WHY]`、`TODO-DEBT` 在哪？ | `docs/rules/code-quality-redlines.md`                       |
| 测试规则与 fixture 边界在？                        | `docs/rules/testing.md`                                     |
| `/release` 发布流程、milestone 绑定、确认门在哪？    | `docs/rules/release.md`                                     |
| CodeMap CLI / MCP / AI 使用方式在？                | `AI_GUIDE.md` + `docs/ai-guide/*.md`                        |                                      |

## 验证决策树

| 改动类型 | 先跑 | 再跑 | 门槛 |
|---|---|---|---|
| 纯文档 | `docs:check` | — | commit 前必须通过 |
| 代码 + 测试 | `check:all` | `test:e2e`（如涉及集成） | PR 前必须通过 |
| CLI 命令变更 | `build` + 手工跑命令 | `test`（相关 suite） | PR 前必须通过 |
| 新增依赖 | `audit` | `build` | commit 前必须通过 |
| CI / workflow | 检查 `.github/workflows/` 语法 | 触发测试跑 | merge 前必须通过 |
| 发布准备 | `docs:check:pre-release` | 手工 smoke test | tag 前必须通过 |

> **快捷方式：** 所有改动 → `check:all` 是综合 gate。

## 编辑归宿

- 改**仓库级规则**：编辑 `AGENTS.md`
- 改**路由 / discoverability 文案**：编辑 `CLAUDE.md`
- 改**Claude 自动读取差异**：编辑 `.claude/CLAUDE.md`
- 改**工程执行协议**：编辑 `docs/rules/engineering-with-codex-openai.md`
- 改**验证 / hook / CI 规则**：编辑 `docs/rules/validation.md`
- 改**真实场景验证规则**：编辑 `docs/rules/testing.md` 与 `docs/rules/pre-release-checklist.md`（宪法声明在 `AGENTS.md` Section 8.1）
- 改**/release 发布流程规则**：编辑 `docs/rules/release.md`
- 改**产品 / CLI / MCP / 命令说明**：编辑 `AI_GUIDE.md` 与 `docs/ai-guide/*`

## 非目标

- 不要把执行回路、验证命令、rule-system 默认值、dogfood 命令、交付清单重新写回这里。
- 如果某个规则已经在 live doc 中存在，这里只保留指针，不再复述正文。


如果遇到代码运行问题，尽量添加更多调试日志，最好是包含有问题的位置的代码的整个执行日志，查阅日志来检查错误，而不是盲目测试和修改代码。
