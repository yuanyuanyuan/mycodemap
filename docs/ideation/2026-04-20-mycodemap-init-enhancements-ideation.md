---
date: 2026-04-20
updated: 2026-04-29
topic: mycodemap-init-enhancements
focus: 把 mycodemap init 从"创建根目录配置文件"升级为"项目级 AI 助手基础设施初始化器"
mode: repo-grounded
---

# Ideation: mycodemap init enhancements

> **状态更新（2026-04-29）**：本文档原始包含 6 个想法，其中 #1–#5 已实现并归档至 `docs/archive/ideation/2026-04-20-mycodemap-init-enhancements-ideation-archive.md`。本文档仅保留未实现项 #6 及其相关上下文。

## Grounding Context

### Codebase Context

- [证据] `src/cli/first-run-guide.ts` 已把 marker 放进 `.mycodemap/`，但欢迎语仍把 init 叙述成"初始化配置"而不是"初始化 AI 工作区"。
- [证据] 仓库已经拥有可复用的 `.githooks/`、规则校验脚本、first-run guide、chalk + emoji + 中文 CLI 风格。

### Past Learnings

- [推论] 当前最大的产品问题不是"功能不存在"，而是"看起来成功但其实只做了一部分"。
- [推论] 半迁移状态应该被显式解释、对账和修复，而不是继续依赖隐式 fallback。
- [证据] 本 phase 已锁定：不自动修改用户 `CLAUDE.md` / `AGENTS.md`，并要求在 `.mycodemap/` 中集中化 config、rules、workflow、logs 等资产。

### External Context

- [推论] 2024–2026 的主流 AI / dev tooling 明显收敛到"双层结构"：隐藏目录存放 tool-owned 资产，显式文件存放 team-owned / shared rules。
- [推论] 最贴近市场共识的做法不是自动改用户上下文文件，而是生成 tool-owned bundle + 明确的人工接入片段。

## Ranked Ideas

### 1. First-Run Concierge + Bootstrap Profiles
**Description:** [推论] 把 first-run guide 重写成状态驱动的 remediation concierge，并用少量 profile（如 Minimal / Guardrails / Team Ready）承载交互式一键选择。
**Rationale:** [推论] 这是最低成本修复 mental model 的方法：既改善第一分钟体验，也避免 init 变成一长串低层开关。
**Downsides:** [观点] profile 设计如果过粗，会掩盖复杂边界；如果过细，又会退化回问卷。
**Confidence:** 84%
**Complexity:** Low-Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | `Project Safety Contracts` framing | [观点] 叙事强但产品增量弱，更适合后续命名或定位文案 |
| 2 | `Board Game Setup Tray` | [推论] 是 Profiles 的隐喻版，没有新增结构价值 |

## Session Log

- 2026-04-20: 初始 ideation，6 个候选想法
- 2026-04-29: #1–#5 已实现并归档；本文档收缩为仅保留未实现项 #6
