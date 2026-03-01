# task-generator (Kimi Adapter)

## Runtime Init

1. Initialize Kimi runtime skill layout:
   `node .tasks/scripts/skills/init-runtime-skills.js --runtime kimi`
2. Generate tasks:
   `node scripts/generate-tasks.js --runtime kimi --tasks <id,id,...>`

## Hard Rules

- Batch size must be <= 5
- Three independent agents must exist in `.agents`
- Canonical agent profiles are initialized in `.tasks/agents` and linked to `.agents`
- Supervisor semantic engine prompt is required
- Approval requires semantic score >= 85

## Output

### Default (with timestamp)
- Task directory: `.tasks/M1-001-define-unified-result-20260301-123045/`
- Batch record: `.tasks/.generation-batch-20260301-123045.json`

### Disable timestamp
- Use `--no-timestamp` for fixed directory names
- Warning: May overwrite existing tasks

## Reference

- https://moonshotai.github.io/kimi-cli/zh/customization/skills.html
