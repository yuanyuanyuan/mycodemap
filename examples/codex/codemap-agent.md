# MyCodeMap Skill

## Description

Code analysis tool for TypeScript/JavaScript projects. Provides project structure analysis, symbol querying, dependency analysis, and impact assessment.

## CLI Command Detection

```bash
# Priority: global > local > npx
if command -v mycodemap &> /dev/null; then
    CODEMAP_CMD="mycodemap"
elif [ -f "./node_modules/.bin/mycodemap" ]; then
    CODEMAP_CMD="./node_modules/.bin/mycodemap"
else
    CODEMAP_CMD="npx @mycodemap/mycodemap"
fi
```

## Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `generate` | Generate code map | `$CODEMAP_CMD generate` |
| `query -s` | Query symbol | `$CODEMAP_CMD query -s "ClassName"` |
| `query -m` | Query module | `$CODEMAP_CMD query -m "src/parser"` |
| `query -S` | Fuzzy search | `$CODEMAP_CMD query -S "keyword"` |
| `deps` | Dependency analysis | `$CODEMAP_CMD deps -m "src/core"` |
| `impact` | Impact analysis | `$CODEMAP_CMD impact -f "src/index.ts"` |
| `cycles` | Cycle detection | `$CODEMAP_CMD cycles` |
| `complexity` | Complexity metrics | `$CODEMAP_CMD complexity` |

## Usage Patterns

### Pattern 1: Project Onboarding
```
User: "Explain this project structure"
Agent:
1. $CODEMAP_CMD generate
2. Read .mycodemap/AI_MAP.md
3. Summarize key components
```

### Pattern 2: Change Impact
```
User: "What happens if I modify X?"
Agent:
1. $CODEMAP_CMD impact -f "<path>" --transitive
2. Analyze output
3. List affected files and suggest tests
```

### Pattern 3: Code Navigation
```
User: "Where is function Y defined?"
Agent:
1. $CODEMAP_CMD query -s "Y"
2. Report location
3. Offer to show code context
```

## Best Practices

- Always generate code map before queries if `.mycodemap/` is stale
- Use `-j` flag for programmatic processing
- Use `--transitive` for complete impact analysis
