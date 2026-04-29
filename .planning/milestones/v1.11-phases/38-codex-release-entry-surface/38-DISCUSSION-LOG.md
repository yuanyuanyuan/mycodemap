# Phase 38 Smart Discuss Log

**Phase:** `38`  
**Name:** `Codex release entry surface`  
**Mode:** Autonomous smart discuss  
**Captured:** 2026-04-23T13:33:00+08:00

> 本 phase 先收口一个 Codex-first release wrapper 路径；不同时做 Kimi parity，也不触发任何真实发布动作。

## Grey Area 1/3: 首个 non-Claude runtime 选谁

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 先做 Codex 还是 Kimi？ | 先做 Codex | 先做 Kimi |
| 2 | 要不要同时做两种 runtime？ | 不要，先证明一条 authority-safe 路径 | Codex + Kimi 一起上 |
| 3 | 为什么是 Codex？ | 仓库已有 `examples/codex`、`.agents/skills/*` 路径，且当前环境就是 Codex | 只因为个人偏好 |

**Decision:** 接受全部推荐答案。

## Grey Area 2/3: 交付形态放哪

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | release wrapper 放哪？ | `.agents/skills/release/SKILL.md` | `examples/codex/release-agent.md` |
| 2 | 为什么不是 example-only？ | 本 phase 目标是当前仓库 release governance entry，不是 npm 包样例能力 | 先做 package example 再说 |
| 3 | 要不要新增 CLI 子命令？ | 不要，保持 thin wrapper / adapter | 新增 `codex release` 风格命令 |

**Decision:** 接受全部推荐答案。

## Grey Area 3/3: authority boundary 怎么锁

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | workflow 正文放哪？ | 继续只放 `docs/rules/release.md` | 在 Codex skill 里复制整套发布手册 |
| 2 | 双确认门怎么处理？ | Codex wrapper 保留 Gate #1 / Gate #2，但仍指回同一 authority chain | 让 helper 自带交互替代 Gate #2 |
| 3 | 要不要在 phase 38 内真实发版？ | 不要；仍保持 L3 边界 | 借机顺手做 `/release v1.9` |

**Decision:** 接受全部推荐答案。
