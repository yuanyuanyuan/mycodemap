# task-analyzer (Codex Adapter)

## Runtime Init

1. Initialize runtime adapters:
   `node .tasks/scripts/skills/init-runtime-skills.js --runtime codex --skip-agent-bootstrap`
2. Analyze generated tasks:
   `node .claude/skills/task-analyzer/scripts/analyze-generated-tasks.js --runtime codex --tasks-dir .tasks`

## Analyzer Scope

- Read-only checks (no task regeneration)
- Block on missing `.agents/*.agent.md`
- Block on missing/failed `SUPERVISOR_SEMANTIC_REVIEW.md`

## Output

### Default (with timestamp)
- Markdown report: `.tasks/task_analysis_report-20260301-123045.md`
- JSON report: `.tasks/task_analysis_report-20260301-123045.json`

### Disable timestamp
- Use `--no-timestamp` for fixed filenames
- Warning: May overwrite previous reports

## Reference

- https://developers.openai.com/codex/skills
