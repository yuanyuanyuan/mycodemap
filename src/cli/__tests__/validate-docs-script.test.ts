import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const REQUIRED_FIXTURE_FILES = [
  'package.json',
  'README.md',
  'llms.txt',
  'AI_GUIDE.md',
  'AI_DISCOVERY.md',
  'ai-document-index.yaml',
  'CLAUDE.md',
  'ARCHITECTURE.md',
  'mycodemap.design.md',
  'mycodemap.config.schema.json',
  'docs/AI_ASSISTANT_SETUP.md',
  'docs/SETUP_GUIDE.md',
  'docs/ai-guide/README.md',
  'docs/ai-guide/COMMANDS.md',
  'docs/ai-guide/OUTPUT.md',
  'docs/ai-guide/PATTERNS.md',
  'docs/ai-guide/PROMPTS.md',
  'docs/ai-guide/QUICKSTART.md',
  'docs/ai-guide/INTEGRATION.md',
  'docs/product-specs/README.md',
  'docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md',
  'docs/product-specs/MVP3-ARCHITECTURE-COMPARISON.md',
  'docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-PRD.md',
  'docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-TECH-PRD.md',
  'docs/rules/testing.md',
  'docs/rules/validation.md',
  'docs/rules/engineering-with-codex-openai.md',
  'src/cli/index.ts',
  'src/cli/commands/design.ts',
  'src/cli/commands/check.ts',
  'src/cli/commands/history.ts',
  'src/cli/commands/analyze-options.ts',
  'vitest.config.ts',
  'vitest.benchmark.config.ts',
  '.github/workflows/ci-gateway.yml',
  '.githooks/pre-commit'
];

function createFixtureRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-docs-check-'));

  for (const relativePath of REQUIRED_FIXTURE_FILES) {
    cpSync(path.join(repoRoot, relativePath), path.join(root, relativePath), { recursive: true });
  }

  return root;
}

describe('validate-docs.js', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes for the current documentation fixture', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).not.toThrow();
  });

  it('fails when README reintroduces legacy analyze intents', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      'mycodemap analyze -i read -t src/cli/index.ts --include-tests --json',
      'mycodemap analyze -i impact -t src/cli/index.ts --include-tests'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when analyze generated block drifts without changing legacy keywords', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      'mycodemap analyze -i show -t src/domain/services --output-mode human',
      'mycodemap analyze -i show -t src/domain/services --json'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('sync script restores analyze generated blocks', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      'mycodemap analyze -i show -t src/domain/services --output-mode human',
      'mycodemap analyze -i show -t src/domain/services --json'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/sync-analyze-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).not.toThrow();

    expect(() => {
      execFileSync('node', ['scripts/sync-analyze-docs.js', '--root', fixtureRoot, '--check'], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).not.toThrow();

    expect(readFileSync(readmePath, 'utf8')).toContain(
      'mycodemap analyze -i show -t src/domain/services --output-mode human'
    );
  });

  it('fails when analyze generated option table drifts from cli metadata', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const commandsPath = path.join(fixtureRoot, 'docs/ai-guide/COMMANDS.md');
    const updatedCommands = readFileSync(commandsPath, 'utf8').replace(
      '输出模式：`machine`/`human`',
      '输出模式: machine/human'
    );
    writeFileSync(commandsPath, updatedCommands);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when AI_GUIDE analyze template block drifts from generated source', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const aiGuidePath = path.join(fixtureRoot, 'AI_GUIDE.md');
    const updatedGuide = readFileSync(aiGuidePath, 'utf8').replace(
      '1. `node dist/cli/index.js analyze -i read -t "{{FILE}}" --scope transitive --json`',
      '1. `node dist/cli/index.js analyze -i read -t "{{FILE}}" --json`'
    );
    writeFileSync(aiGuidePath, updatedGuide);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when OUTPUT guide reintroduces legacy analyze schema', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const outputPath = path.join(fixtureRoot, 'docs/ai-guide/OUTPUT.md');
    const updatedOutput = readFileSync(outputPath, 'utf8').replace(
      'type AnalyzeIntent = "find" | "read" | "link" | "show";',
      'intent: "impact" | "dependency" | "search" | "documentation" | "complexity" | "overview" | "refactor" | "reference";'
    );
    writeFileSync(outputPath, updatedOutput);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when AI docs drop analyze diagnostics guardrail', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const outputPath = path.join(fixtureRoot, 'docs/ai-guide/OUTPUT.md');
    const updatedOutput = readFileSync(outputPath, 'utf8').replace(
      'interface AnalyzeDiagnostics',
      'interface AnalyzeDiagnosticEnvelope'
    );
    writeFileSync(outputPath, updatedOutput);

    expect(() => {
      execFileSync('node', ['scripts/validate-ai-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/AI documentation guardrails failed/);
  });

  it('fails when README drops the documented docs guardrail commands', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      /mycodemap ci check-docs-sync/g,
      'mycodemap ci check-docs'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README drops the design validate entry', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replaceAll(
      'mycodemap design validate mycodemap.design.md --json',
      'mycodemap generate'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README drops the design map entry', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replaceAll(
      'mycodemap design map mycodemap.design.md --json',
      'mycodemap generate'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README drops the design handoff entry', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replaceAll(
      'mycodemap design handoff mycodemap.design.md --json',
      'mycodemap generate'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README drops the design verify entry', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replaceAll(
      'mycodemap design verify mycodemap.design.md --json',
      'mycodemap generate'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README reintroduces non-recursive default exclude patterns', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      '"**/*.test.ts"',
      '"*.test.ts"'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README reintroduces the legacy config filename', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      'mycodemap.config.json',
      'codemap.config.json'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README drops the graph storage config contract', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      '| `storage.type` | `"filesystem" \\| "sqlite" \\| "memory" \\| "auto"` | 图存储后端类型 | `"filesystem"` |',
      '| `storage.kind` | `string` | 存储类型 | `"filesystem"` |'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when OUTPUT guide drops the pluginReport contract', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const outputPath = path.join(fixtureRoot, 'docs/ai-guide/OUTPUT.md');
    const updatedOutput = readFileSync(outputPath, 'utf8').replace(
      'pluginReport?: PluginExecutionReport;',
      'pluginResults?: PluginExecutionReport;'
    );
    writeFileSync(outputPath, updatedOutput);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when AI commands guide reintroduces a removed public command', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const commandsPath = path.join(fixtureRoot, 'docs/ai-guide/COMMANDS.md');
    const updatedCommands = readFileSync(commandsPath, 'utf8').replace(
      '## 已移除的公共命令',
      '## server - HTTP 服务器（当前过渡能力）'
    );
    writeFileSync(commandsPath, updatedCommands);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when AI commands guide drops the design verify entry', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const commandsPath = path.join(fixtureRoot, 'docs/ai-guide/COMMANDS.md');
    const updatedCommands = readFileSync(commandsPath, 'utf8').replaceAll(
      'mycodemap design verify mycodemap.design.md --json',
      'mycodemap generate'
    );
    writeFileSync(commandsPath, updatedCommands);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when AI commands guide drops the workflow four-phase boundary', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const commandsPath = path.join(fixtureRoot, 'docs/ai-guide/COMMANDS.md');
    const updatedCommands = readFileSync(commandsPath, 'utf8').replace(
      '`workflow` 只保留 `find → read → link → show` 四个分析阶段；代码实现、commit 检查与 CI 运行不再作为 workflow phase 建模。',
      '`workflow` 同时包含 analyze、实现、CI、ship 等多个阶段。'
    );
    writeFileSync(commandsPath, updatedCommands);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when OUTPUT guide drops the design verify checklist contract', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const outputPath = path.join(fixtureRoot, 'docs/ai-guide/OUTPUT.md');
    const updatedOutput = readFileSync(outputPath, 'utf8').replace(
      'checklist: Array<{',
      'checklistItems: Array<{'
    );
    writeFileSync(outputPath, updatedOutput);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when PATTERNS reintroduces workflow commit stage', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const patternsPath = path.join(fixtureRoot, 'docs/ai-guide/PATTERNS.md');
    const updatedPatterns = readFileSync(patternsPath, 'utf8').replace(
      '4. `show` - 生成概览、摘要与展示型结果',
      '4. `show` - 生成概览、摘要与展示型结果\n5. `commit` - 提交验证'
    );
    writeFileSync(patternsPath, updatedPatterns);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when CI workflow drops the typecheck step', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const workflowPath = path.join(fixtureRoot, '.github/workflows/ci-gateway.yml');
    const updatedWorkflow = readFileSync(workflowPath, 'utf8').replace(
      "      - name: Run typecheck\n        run: npm run typecheck\n",
      ''
    );
    writeFileSync(workflowPath, updatedWorkflow);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });
});
