---
name: task-analyzer
description: Claude Code 适配版任务分析技能（只分析，不生成）。
---

# task-analyzer (Claude Adapter)

## 运行时前置

1. 初始化运行时：
   `node .tasks/scripts/skills/init-runtime-skills.js --runtime claude --skip-agent-bootstrap`
2. 执行分析：
   `node .claude/skills/task-analyzer/scripts/analyze-generated-tasks.js --runtime claude --tasks-dir .tasks`

## Claude 特有说明

- 可作为 subagent 审计角色使用
- 若是 agent teams，建议将 analyzer 作为 supervisor 的审计子流程
- 参考：
  - https://code.claude.com/docs/zh-CN/skills#%E5%9C%A8-subagent-%E4%B8%AD%E8%BF%90%E8%A1%8C-skills
  - https://code.claude.com/docs/zh-CN/agent-teams

## 输出说明

### 默认（带时间戳）
- Markdown 报告：`.tasks/task_analysis_report-20260301-123045.md`
- JSON 报告：`.tasks/task_analysis_report-20260301-123045.json`

### 禁用时间戳
- 使用 `--no-timestamp` 参数获得固定文件名
- 警告：可能会覆盖之前的报告
