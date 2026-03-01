# task-analyzer (Kimi Adapter)

## Runtime Init

1. Initialize runtime adapters:
   `node .tasks/scripts/skills/init-runtime-skills.js --runtime kimi --skip-agent-bootstrap`
2. Analyze tasks:
   `node .claude/skills/task-analyzer/scripts/analyze-generated-tasks.js --runtime kimi --tasks-dir .tasks`

## Analyzer Scope

- Structural + triad + semantic checks
- Blocking output on missing agent definitions or semantic review failures

## Output

### Default (with timestamp)
- Markdown report: `.tasks/task_analysis_report-20260301-123045.md`
- JSON report: `.tasks/task_analysis_report-20260301-123045.json`

### Disable timestamp
- Use `--no-timestamp` for fixed filenames
- Warning: May overwrite previous reports

## Reference

- https://moonshotai.github.io/kimi-cli/zh/customization/skills.html
