# MyCodeMap 配置示例

本目录包含各种 AI 助手和开发环境的配置示例。

## 目录结构

```
examples/
├── kimi/                    # Kimi CLI 配置
│   └── codemap-skill.md    # Skill 定义文件
├── claude/                  # Claude Code 配置
│   └── codemap-skill.md    # Skill 定义文件
├── codex/                   # Codex CLI 配置
│   └── codemap-agent.md    # Agent 定义文件
├── copilot/                 # GitHub Copilot 配置
│   └── copilot-instructions.md  # 提示词文件
└── README.md               # 本文件
```

## 快速使用

### Kimi CLI

```bash
mkdir -p .kimi/skills/codemap
cp examples/kimi/codemap-skill.md .kimi/skills/codemap/SKILL.md
```

### Claude Code

```bash
mkdir -p .claude/skills/codemap
cp examples/claude/codemap-skill.md .claude/skills/codemap/SKILL.md
```

### Codex CLI

```bash
mkdir -p .agents/skills/codemap
cp examples/codex/codemap-agent.md .agents/skills/codemap/SKILL.md
```

### GitHub Copilot

```bash
mkdir -p .github
cp examples/copilot/copilot-instructions.md .github/copilot-instructions.md
```

## 自定义配置

复制示例文件后，可以根据项目需求进行调整：

1. **修改命令别名** - 如果项目中使用了不同的命令别名
2. **添加项目特定规则** - 针对项目结构的特殊处理
3. **调整输出格式** - 根据 AI 助手的解析能力调整

## 更多信息

- [安装配置指南](../docs/SETUP_GUIDE.md)
- [AI 助手集成指南](../docs/AI_ASSISTANT_SETUP.md)
