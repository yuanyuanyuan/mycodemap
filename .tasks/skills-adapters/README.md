# skills-adapters

运行时适配目录，按 CLI 平台拆分：

- `.tasks/skills-adapters/claude/`：Claude Code skill 适配
- `.tasks/skills-adapters/codex/`：Codex CLI skill 适配
- `.tasks/skills-adapters/kimi/`：Kimi CLI skill 适配

统一初始化入口：

```bash
node .tasks/scripts/skills/init-runtime-skills.js --runtime auto
```

该脚本会：

1. 判断运行时（或使用 `--runtime` 强制指定）
2. 将适配层 SKILL.md 同步到运行时目录
3. 在 `.tasks/agents` 初始化三角色 agent 与 supervisor 语义引擎模板
4. 将 `.tasks/agents/*.md` 符号链接到 `.agents/*.md`
5. 写入 `.tasks/.skills-runtime/runtime-state.json`
