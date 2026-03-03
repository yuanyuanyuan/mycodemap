# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodeMap 是一个专为 TypeScript/JavaScript 项目设计的代码结构分析工具。它通过静态分析自动生成项目的结构化代码地图，帮助 AI 编程助手（如 Claude、Copilot、Kimi）快速理解项目架构、模块关系和代码上下文。

### Core Features

- **双层解析模式** - `fast`（快速正则）和 `smart`（TypeScript AST）两种解析模式
- **多格式输出** - 自动生成 `AI_MAP.md`、`CONTEXT.md`、`codemap.json`
- **依赖图可视化** - Mermaid 格式的模块依赖关系图
- **增量缓存** - 基于文件哈希的 LRU 缓存机制
- **Watch 模式** - 监听文件变更并自动增量更新
- **复杂度分析** - 圈复杂度、认知复杂度和可维护性指数
- **编排层** - 意图路由、置信度计算、结果融合、工具编排
- **CI 门禁** - Commit 格式验证、文件头检查、风险评估
- **工作流编排** - 阶段管理、上下文持久化、检查点机制

### Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.3+ |
| Runtime | Node.js >= 18.0.0 |
| Module | ESM (`"type": "module"`) |
| Build | TypeScript compiler (`tsc`) |
| Testing | Vitest |
| Linting | ESLint + @typescript-eslint |
| CLI | Commander.js |
| AST | tree-sitter + tree-sitter-typescript |
| File Watch | chokidar |

---

## Build & Test Commands

```bash
# Install dependencies
npm install

# Build
npm run build           # Compile TypeScript to dist/
npm run dev             # Watch mode
npm run typecheck       # Type check only

# Testing
npm test                # Run all tests
npx vitest run src/orchestrator/__tests__/confidence.test.ts  # Specific test
npx vitest run --coverage  # Coverage report

# CLI
node dist/cli/index.js <command>
```

---

## Project Structure

```
src/
├── cli/                    # Commander.js CLI commands
│   ├── index.ts
│   └── commands/           # analyze, ci, complexity, cycles, deps, 
│                           # generate, impact, init, query, watch, workflow
├── parser/                 # Dual-mode parser (fast/regex + smart/AST)
│   ├── interfaces/
│   └── implementations/
├── core/                   # Core analysis engine
├── orchestrator/           # Intent routing, confidence, result fusion
│   ├── adapters/           # Tool adapters (codemap, ast-grep)
│   ├── workflow/           # Workflow orchestration
│   ├── confidence.ts
│   ├── result-fusion.ts
│   ├── tool-orchestrator.ts
│   ├── intent-router.ts
│   ├── test-linker.ts
│   ├── git-analyzer.ts
│   ├── file-header-scanner.ts
│   └── commit-validator.ts
├── generator/              # Output generators (AI_MAP.md, JSON, Mermaid)
├── cache/                  # LRU cache + file hash cache
├── watcher/                # File watcher + daemon
├── plugins/                # Plugin system
```

---

## Code Style Guide

### File Header Comments (REQUIRED)

All TypeScript source files (non-test) MUST include this header:

```typescript
// [META] since:YYYY-MM | owner:team | stable:false
// [WHY] Explain why this file exists

/**
 * Optional JSDoc description
 */
```

Example:
```typescript
// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Route analyze intents to primary/secondary tools with whitelist validation
```

Rules:
- Must contain `[META]` tag
- Must contain `[WHY]` tag
- Checked by pre-commit hook

### TypeScript Standards

- **Strict mode** (`strict: true`)
- **ESM** modules (`"type": "module"`)
- **Target**: ES2022
- All functions must have return type annotations
- Prefer `interface` over `type` for object structures
- Use `unknown` instead of `any`

### Naming Conventions

- Files: kebab-case (e.g., `intent-router.ts`)
- Classes: PascalCase (e.g., `IntentRouter`)
- Functions/Variables: camelCase (e.g., `routeIntent`)
- Constants: UPPER_SNAKE_CASE
- Private members: underscore prefix (e.g., `_privateMethod`)

---

## Testing Strategy

- **Framework**: Vitest
- **Coverage**: @vitest/coverage-v8, target >= 80%
- **Unit tests**: `src/**/__tests__/*.test.ts` (co-located)
- **Integration tests**: `tests/` directory
- **Benchmark**: `refer/benchmark-quality.ts` (30 predefined queries)

---

## CLI Commands

```bash
codemap init           # Initialize configuration
codemap generate       # Generate code map
codemap watch          # Watch mode
codemap query          # Query symbols/modules/deps
codemap analyze        # Unified analysis entry (multi-intent routing)
codemap impact         # Change impact analysis
codemap complexity     # Complexity analysis
codemap cycles         # Circular dependency detection
codemap ci             # CI gateway commands
codemap workflow       # Workflow orchestration
```

### CI Gateway Commands

```bash
codemap ci check-commits --range origin/main..HEAD    # Validate commit format
codemap ci check-headers                              # Validate file headers
codemap ci assess-risk --threshold=0.7               # Risk assessment
codemap ci check-output-contract                     # Validate output contract
```

---

## CI/CD & Gateways

### Git Hooks (Local)

**pre-commit**:
1. Run related tests (blocks if failed)
2. Check file headers `[META]`/`[WHY]` (blocks if failed)
3. Generate code map (warning, non-blocking)

**commit-msg**:
- Format: `[TAG] scope: message`
- Valid tags: `BUGFIX`, `FEATURE`, `REFACTOR`, `CONFIG`, `DOCS`, `DELETE`
- Example: `[FEATURE] cli: add new command`

### GitHub Actions

Workflow: `.github/workflows/ci-gateway.yml`

Steps:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run tests (`npm test`)
5. Check commit format (`codemap ci check-commits`)
6. Check file headers (`codemap ci check-headers`)
7. Generate code map and verify sync
8. Risk assessment (`codemap ci assess-risk`)
9. Check output contract

---

## Important Constraints

### Critical Thinking

```
Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks.
```

- Apply critical thinking (5Why-7Why analysis)
- Ensure sufficient information before proceeding
- Align requirements to prevent problem misdefinition
- Use Socratic questioning if unclear
- Use MCP tool `sequentialthinking` for critical thinking

### Complex Tasks (3+ steps, research, projects)

1. Load skill: `cat ~/.codex/skills/planning-with-files/SKILL.md`
2. Create `task_plan.md`, `findings.md`, `progress.md`
3. Follow 3-file pattern throughout

### CI Guardrails (MUST NOT Bypass)

- **NEVER** bypass CI guardrails by ignoring, skipping, deleting, or commenting them out
- **NEVER** use `--no-verify`, disable hooks temporarily, or relax thresholds
- Fix issues according to guardrail prompts before committing
- Changes involving CI guardrails must provide "failure scenario + fix verification" evidence
- Temporary exemptions require explicit human approval

### Multi-Agent Collaboration

**Environment Detection**:
- **Codex CLI**: Native multi-agent lifecycle (`spawn_agent` / `send_input` / `wait` / `close_agent`)
- **kimi-cli**: YAML config + `CreateSubagent` / `Task` tools
- **Claude Code**: Use `agent-teams-playbook` skill

**Key Constraints**:
- Subagents cannot nest `Task` calls (avoid infinite recursion)
- Main coordinator must do final aggregation and acceptance

### Documentation Sync

After each task or file update, check if these need synchronization:
- `docs/` directory design documents
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`

---

## CodeMap Tool Usage Rules

When performing code search or project analysis operations, **ALWAYS prioritize using the CodeMap CLI** from this repository over external tools or manual inspection.

### Priority Order for Code Search

1. **Primary**: Use `codemap` CLI commands from this repository
   ```bash
   # Query symbols, modules, or dependencies
   node dist/cli/index.js query -s "symbolName"
   node dist/cli/index.js query -m "moduleName"
   node dist/cli/index.js deps -m "src/parser"
   
   # Generate comprehensive analysis
   node dist/cli/index.js analyze <intent>
   
   # Impact analysis for changes
   node dist/cli/index.js impact -f <file-path>
   ```

2. **Secondary**: If CodeMap fails or returns insufficient results, fall back to `grep`, `ripgrep`, or other standard tools

3. **Documentation**: After using external tools, document the limitation in the task findings

### Handling CodeMap Issues

If CodeMap encounters errors or requires feature enhancements during use:

1. **Check logs immediately**:
   ```bash
   # Check for log files in the output directory
   ls -la .codemap/logs/ 2>/dev/null || echo "No logs directory found"
   
   # Check CLI output for error details
   node dist/cli/index.js <command> --verbose 2>&1 | tee /tmp/codemap-debug.log
   ```

2. **Record the issue** to the local tracking file:
   
   **Issue tracking file**: `.codemap/issues/codemap-issues.md`
   
   ```markdown
   ## Issue Log
   
   ### [YYYY-MM-DD HH:MM] Issue Title
   - **Command**: The command that failed
   - **Error**: Error message or unexpected behavior
   - **Log Location**: Path to relevant log file
   - **Context**: What you were trying to accomplish
   - **Workaround**: How you worked around it (if applicable)
   - **Priority**: high/medium/low
   ```

3. **Continue with task** using alternative tools, then schedule batch fixes

4. **Create issue entry** (if it doesn't exist):
   ```bash
   mkdir -p .codemap/issues
   cat >> .codemap/issues/codemap-issues.md << 'EOF'
   
   ### [$(date '+%Y-%m-%d %H:%M')] $(echo "Brief description")
   - **Command**: 
   - **Error**: 
   - **Log Location**: 
   - **Context**: 
   - **Workaround**: 
   - **Priority**: medium
   
   EOF
   ```

### Example Workflow

```bash
# 1. Try CodeMap first
node dist/cli/index.js query -s "IntentRouter"

# 2. If it fails, check logs and record
if [ $? -ne 0 ]; then
    echo "$(date) - Query failed for IntentRouter" >> .codemap/issues/codemap-issues.md
    # Fall back to grep
    grep -r "IntentRouter" src/
fi
```

---

## Design Docs

| Document | Content |
|----------|---------|
| `REFACTOR_ARCHITECTURE_OVERVIEW.md` | Architecture overview |
| `REFACTOR_ORCHESTRATOR_DESIGN.md` | Orchestrator layer design |
| `CI_GATEWAY_DESIGN.md` | CI gateway design |

---

## Development Workflow

### Adding New Features

1. **Planning**:
   - Read relevant design docs
   - Create `task_plan.md`, `findings.md`, `progress.md`
   - Update design docs if architecture changes

2. **Coding**:
   - Add file header comments `[META]`/`[WHY]`
   - Follow TypeScript strict mode
   - Write unit tests simultaneously

3. **Validation**:
   - Run tests: `npm test`
   - Type check: `npm run typecheck`
   - Lint: `npm run lint`
   - Local CLI verification

4. **Commit**:
   - Ensure pre-commit passes
   - Commit format: `[TAG] scope: message`
   - Use `git-worktrees` if needed for isolation

5. **Finalization**:
   - Check and update relevant docs
   - Verify AGENTS.md / CLAUDE.md / README.md sync

---

## Output Files

Running `codemap generate` produces (in `.codemap/`):

| File | Description |
|------|-------------|
| `AI_MAP.md` | Global project overview for AI assistants |
| `CONTEXT.md` | Context entry file |
| `context/` | Detailed context per module |
| `codemap.json` | Complete structured JSON data |
| `dependency-graph.md` | Mermaid dependency diagram |
| `logs/` | CodeMap execution logs |
| `issues/` | Issue tracking for CodeMap bugs/enhancements |
