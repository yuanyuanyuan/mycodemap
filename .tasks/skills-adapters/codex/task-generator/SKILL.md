# task-generator (Codex Adapter)

## Runtime Init

1. Initialize Codex runtime skill layout:
   `node .tasks/scripts/skills/init-runtime-skills.js --runtime codex`
2. Generate tasks:
   `node scripts/generate-tasks.js --runtime codex --tasks <id,id,...>`

## Hard Rules

- `requested_count <= 5`
- Three distinct agents required: generator/qa/supervisor
- Canonical agent profiles live in `.tasks/agents` and are linked to `.agents`
- Supervisor semantic engine is mandatory (`.agents/<supervisor>.semantic.prompt.md`)
- Final approval requires semantic score >= 85 and no critical failure

## Output

### Default (with timestamp)
- Task directory: `.tasks/M1-001-define-unified-result-20260301-123045/`
- Batch record: `.tasks/.generation-batch-20260301-123045.json`

### Disable timestamp
- Use `--no-timestamp` for fixed directory names
- Warning: May overwrite existing tasks

## Reference

- https://developers.openai.com/codex/skills
