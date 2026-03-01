---
name: task-generator
description: Claude Code 适配版任务生成技能（含三角色 agents 与 supervisor 语义引擎）。
---

# task-generator (Claude Adapter)

## 运行时前置

1. 先初始化运行时与 skill 同步：
   `node .tasks/scripts/skills/init-runtime-skills.js --runtime claude`
2. 确认三角色 agent 已存在于 `.agents/`
3. 再执行任务生成：
   `node scripts/generate-tasks.js --runtime claude --tasks <id,id,...>`

## Claude 特有流程

- 默认使用 subagent + skill（context fork）
- 若启用 agent teams，再切换为 team 协作；supervisor 仍保留最终审批权
- 参考：
  - https://code.claude.com/docs/zh-CN/skills#%E5%9C%A8-subagent-%E4%B8%AD%E8%BF%90%E8%A1%8C-skills
  - https://code.claude.com/docs/zh-CN/agent-teams

## 硬约束

- 单次任务数必须 <=5
- generator/qa/supervisor 必须是 3 个不同 agents
- agent 配置以 `.tasks/agents` 为主存储，并链接到 `.agents`
- supervisor 必须执行独立语义判定引擎（score>=85 且无 critical failure）

## 输出说明

### 默认（带时间戳）
- 任务目录：`.tasks/M1-001-define-unified-result-20260301-123045/`
- 批次记录：`.tasks/.generation-batch-20260301-123045.json`

### 禁用时间戳
- 使用 `--no-timestamp` 参数获得固定目录名
- 警告：可能会覆盖已有任务
