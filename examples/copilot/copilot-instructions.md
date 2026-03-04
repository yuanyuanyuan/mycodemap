# MyCodeMap Integration

This project uses MyCodeMap for code analysis.

## Available Commands

Before answering questions about project structure, run:
```bash
mycodemap generate
```

Then read `.mycodemap/AI_MAP.md` for context.

## Common Queries

- Find symbol: `mycodemap query -s "<name>"`
- Check dependencies: `mycodemap deps -m "<path>"`
- Impact analysis: `mycodemap impact -f "<path>"`

## When Answering

1. Always check the code map first for structural questions
2. Use impact analysis before suggesting changes
3. Reference specific files and line numbers
