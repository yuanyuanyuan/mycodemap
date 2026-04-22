// [META] since:2026-03 | owner:docs-team | stable:true
// [WHY] Validate high-signal documentation facts against the current repository guardrails

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectAnalyzeDocSyncFailures } from './sync-analyze-docs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(__dirname, '..');

function parseRootDir(argv) {
  const rootFlagIndex = argv.indexOf('--root');
  if (rootFlagIndex === -1) {
    return defaultRootDir;
  }

  const rootValue = argv[rootFlagIndex + 1];
  if (!rootValue) {
    console.error('ERROR: --root requires a directory path');
    process.exit(1);
  }

  return path.resolve(rootValue);
}

function readText(rootDir, relativePath, failures) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

function expectIncludes(text, snippet, label, failures) {
  if (!text.includes(snippet)) {
    failures.push(`${label} is missing expected snippet: ${snippet}`);
  }
}

function expectNotIncludes(text, snippet, label, failures) {
  if (text.includes(snippet)) {
    failures.push(`${label} still contains outdated snippet: ${snippet}`);
  }
}

function validateSnippets(text, label, requiredSnippets, outdatedSnippets, failures) {
  if (!text) {
    return;
  }

  for (const snippet of requiredSnippets) {
    expectIncludes(text, snippet, label, failures);
  }

  for (const snippet of outdatedSnippets) {
    expectNotIncludes(text, snippet, label, failures);
  }
}

function validatePackageScripts(rootDir, failures) {
  const packageJsonText = readText(rootDir, 'package.json', failures);
  if (!packageJsonText) {
    return;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(packageJsonText);
  } catch {
    failures.push('package.json is not valid JSON');
    return;
  }

  const docsCheck = packageJson.scripts?.['docs:check'];
  if (!docsCheck || !docsCheck.includes('validate-docs.js')) {
    failures.push('package.json scripts.docs:check must include "validate-docs.js"');
  }
}

function validateAnalyzeDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const claudeGuide = readText(rootDir, 'CLAUDE.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const outputGuide = readText(rootDir, 'docs/ai-guide/OUTPUT.md', failures);
  const engineeringGuide = readText(rootDir, 'docs/rules/engineering-with-codex-openai.md', failures);
  const analyzeOptionsSource = readText(rootDir, 'src/cli/commands/analyze-options.ts', failures);
  const cliIndexSource = readText(rootDir, 'src/cli/index.ts', failures);

  if (!analyzeOptionsSource || !cliIndexSource) {
    return;
  }

  const requiredAnalyzeOptionSnippets = [
    'ANALYZE_OPTION_DEFINITIONS',
    "flags: '-i, --intent <type>'",
    "flags: '-t, --targets <paths...>'",
    "flags: '-k, --keywords <words...>'",
    "flags: '--include-tests'",
    'docDescription:',
    'docDefaultValue:',
    'getAnalyzeHelpText'
  ];

  for (const snippet of requiredAnalyzeOptionSnippets) {
    expectIncludes(
      analyzeOptionsSource,
      snippet,
      'src/cli/commands/analyze-options.ts',
      failures
    );
  }

  expectIncludes(cliIndexSource, 'configureAnalyzeCommand(', 'src/cli/index.ts', failures);

  validateSnippets(
    readme,
    'README.md analyze examples',
    [
      'mycodemap analyze -i find -k SourceLocation',
      'mycodemap analyze -i read -t src/cli/index.ts --include-tests --json',
      'mycodemap analyze -i link -t src/cli/index.ts',
      'mycodemap analyze -i show -t src/orchestrator',
      '`refactor` 会返回 `E0001_INVALID_INTENT`'
    ],
    [
      'mycodemap analyze -i overview -t src/orchestrator',
      'mycodemap analyze -i impact -t src/cli/index.ts --include-tests',
      'mycodemap analyze -i dependency -t src/cli/index.ts',
      'mycodemap analyze -i search -k UnifiedResult',
      'mycodemap analyze --intent impact --file src/cli/index.ts'
    ],
    failures
  );

  validateSnippets(
    aiGuide,
    'AI_GUIDE.md analyze baseline',
    [
      'analyze -i show -t "src/" --json',
      'node dist/cli/index.js analyze -i read -t "{{FILE}}" --scope transitive --json',
      'intent: "find" | "read" | "link" | "show";'
    ],
    [
      'analyze -i overview -t "src/" --json',
      'node dist/cli/index.js analyze -i impact -t "{{FILE}}" --transitive --json',
      'analyze -i refactor'
    ],
    failures
  );

  validateSnippets(
    commandsGuide,
    'docs/ai-guide/COMMANDS.md analyze baseline',
    [
      '### 当前公共契约：4 种分析意图',
      'mycodemap analyze -i find -k "UnifiedResult"',
      'mycodemap analyze -i read -t "src/index.ts" --scope transitive',
      'mycodemap analyze -i link -t "src/orchestrator"',
      'mycodemap analyze -i show -t "src/"',
      '### legacy 兼容映射'
    ],
    [
      '### 当前实现：8 种分析意图（过渡态）',
      'mycodemap analyze -i impact -t "src/index.ts"',
      'mycodemap analyze -i dependency -t "src/orchestrator"',
      'mycodemap analyze -i complexity -t "src/domain"',
      'mycodemap analyze -i search -k "UnifiedResult"',
      'mycodemap analyze -i overview -t "src/"',
      'mycodemap analyze -i refactor -t "src/cache"',
      'mycodemap analyze -i reference -t "src/interface/types"',
      'mycodemap analyze -i documentation -t "src/domain/services"'
    ],
    failures
  );

  validateSnippets(
    outputGuide,
    'docs/ai-guide/OUTPUT.md analyze schema',
    [
      '当前公共契约已固定为 `find` / `read` / `link` / `show`',
      'type AnalyzeIntent = "find" | "read" | "link" | "show";',
      'warnings?: AnalyzeWarning[];',
      'analysis?: ReadAnalysis | LinkAnalysis | ShowAnalysis;',
      '"intent": "read"',
      '"code": "deprecated-intent"'
    ],
    [
      '当前仍是 8 意图过渡态，本文件先记录真实 schema',
      'intent: "impact" | "dependency" | "search" | "documentation" | "complexity" | "overview" | "refactor" | "reference";'
    ],
    failures
  );

  // NOTE: CLAUDE.md 已演进为执行手册（路由层），analyze 命令指南已移至 AI_GUIDE.md / docs/ai-guide/
  // 相关检查已下放至 AI_GUIDE.md 与 docs/ai-guide/*.md 的 validateSnippets 中

  validateSnippets(
    engineeringGuide,
    'docs/rules/engineering-with-codex-openai.md analyze guardrail',
    [
      'node dist/cli/index.js analyze --help',
      '`find` / `read` / `link` / `show`',
      '`warnings[]`',
      '`--structured --json`'
    ],
    [
      '`--output-mode machine --json`',
      'analyze documentation'
    ],
    failures
  );

  failures.push(...collectAnalyzeDocSyncFailures(rootDir));
}

function validateHistoryRiskDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const claudeGuide = readText(rootDir, 'CLAUDE.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const outputGuide = readText(rootDir, 'docs/ai-guide/OUTPUT.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);
  const cliIndexSource = readText(rootDir, 'src/cli/index.ts', failures);
  const historyCommandSource = readText(rootDir, 'src/cli/commands/history.ts', failures);

  if (cliIndexSource) {
    expectIncludes(cliIndexSource, 'program.addCommand(historyCommand);', 'src/cli/index.ts history command registration', failures);
  }

  if (historyCommandSource) {
    validateSnippets(
      historyCommandSource,
      'src/cli/commands/history.ts command surface',
      [
        "new Command('history')",
        ".requiredOption('--symbol <name>'",
        ".option('--human'",
      ],
      [],
      failures
    );
  }

  if (readme) {
    validateSnippets(
      readme,
      'README.md history risk baseline',
      [
        '# 查询某个符号的历史轨迹与风险摘要\nmycodemap history --symbol createCheckCommand',
        '### `mycodemap history`\n\n符号级 Git history / risk 查询：\n\n```bash\n# 默认输出 machine-first JSON\nmycodemap history --symbol createCheckCommand',
        '`--include-git-history` 现在只会在 `read` intent 上附加统一的 Git history enrichment；其他 intent 会显式给出 warning，而不是 silent noop。',
        '`ci assess-risk` 现在输出 `status/confidence/freshness/source` 与统一 risk level；若 Git history 不可用，会显式打印 `unavailable` / warning，并说明阈值未被应用。'
      ],
      [],
      failures
    );
  }

  if (aiGuide) {
    validateSnippets(
      aiGuide,
      'AI_GUIDE.md history risk baseline',
      [
        '`history --symbol <name>`',
        '`check` / `ci assess-risk` / `history` 现在共用同一套 Git history risk truth；history unavailable 时会显式给出 `unavailable` / `confidence=low`',
        'interface HistoryCommandResult {'
      ],
      [],
      failures
    );
  }

  // NOTE: CLAUDE.md 已演进为执行手册（路由层），history 风险基线已移至 AI_GUIDE.md / docs/ai-guide/
  // 相关检查已下放至 AI_GUIDE.md 与 docs/ai-guide/*.md 的 validateSnippets 中

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md history risk baseline',
      [
        '## history - 符号级 Git history / risk 查询',
        'Git history risk 是 additive enrichment：会附加 `violations[].risk` 与顶层 `history`，但不会改变 `severity:error` / exit 语义',
        '`ci assess-risk` 现在输出 `status / confidence / freshness / source / score / level`'
      ],
      [],
      failures
    );
  }

  if (outputGuide) {
    validateSnippets(
      outputGuide,
      'docs/ai-guide/OUTPUT.md history risk baseline',
      [
        'interface HistoryCommandResult {',
        'Git history risk 是 additive enrichment：它补充 `history` 与 `violations[].risk`',
        '"git-history-unsupported-intent"'
      ],
      [],
      failures
    );
  }

  if (validationRule) {
    validateSnippets(
      validationRule,
      'docs/rules/validation.md history risk baseline',
      [
        '`check` / `ci assess-risk` / `history` / `analyze --include-git-history` 的统一 risk truth',
        'node dist/cli/index.js history --symbol createCheckCommand',
        'node scripts/report-high-risk-files.mjs --top 3'
      ],
      [],
      failures
    );
  }
}

function validateDesignContractDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const claudeGuide = readText(rootDir, 'CLAUDE.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const outputGuide = readText(rootDir, 'docs/ai-guide/OUTPUT.md', failures);
  const patternsGuide = readText(rootDir, 'docs/ai-guide/PATTERNS.md', failures);
  const promptsGuide = readText(rootDir, 'docs/ai-guide/PROMPTS.md', failures);
  const engineeringGuide = readText(rootDir, 'docs/rules/engineering-with-codex-openai.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);
  const productSpecsReadme = readText(rootDir, 'docs/product-specs/README.md', failures);
  const designTemplate = readText(rootDir, 'docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md', failures);
  const cliIndexSource = readText(rootDir, 'src/cli/index.ts', failures);
  const designCommandSource = readText(rootDir, 'src/cli/commands/design.ts', failures);
  const checkCommandSource = readText(rootDir, 'src/cli/commands/check.ts', failures);
  const repoContract = readText(rootDir, 'mycodemap.design.md', failures);

  if (cliIndexSource) {
    expectIncludes(cliIndexSource, 'program.addCommand(designCommand);', 'src/cli/index.ts design command registration', failures);
    expectIncludes(cliIndexSource, 'program.addCommand(checkCommand);', 'src/cli/index.ts check command registration', failures);
  }

  if (designCommandSource) {
    validateSnippets(
      designCommandSource,
      'src/cli/commands/design.ts command surface',
      [
        "new Command('design')",
        ".command('validate')",
        ".command('map')",
        ".command('handoff')",
        ".command('verify')",
        'renderDesignMappingResult',
        'renderDesignVerificationResult',
        'runDesignHandoff',
        'runDesignVerify',
        'DEFAULT_DESIGN_CONTRACT_PATH',
        'JSON 格式输出'
      ],
      [],
      failures
    );
  }

  if (checkCommandSource) {
    validateSnippets(
      checkCommandSource,
      'src/cli/commands/check.ts command surface',
      [
        "new Command('check')",
        "--contract <file>",
        "--against <path>",
        '--base <git-ref>',
        '--changed-files <paths...>',
        '--annotation-format <format>',
        '--annotation-file <file>',
        'resolveContractDiffScope',
        'runContractCheck',
        'renderGitHubAnnotations',
        'renderGitLabAnnotations',
      ],
      [],
      failures
    );
  }

  if (readme) {
    validateSnippets(
      readme,
      'README.md design contract baseline',
      [
        'mycodemap design validate mycodemap.design.md --json',
        'mycodemap design map mycodemap.design.md --json',
        'mycodemap design handoff mycodemap.design.md --json',
        'mycodemap design verify mycodemap.design.md --json',
        'mycodemap check --contract mycodemap.design.md --against src',
        '--annotation-format github',
        '--annotation-format gitlab --annotation-file gl-code-quality-report.json',
        'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10',
        'changed files <= 10',
        'warn-only / fallback',
        'false-positive rate >10%',
        'docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md',
        '`mycodemap.design.md`',
        '`design validate → design map → design handoff → design verify`'
      ],
      [],
      failures
    );
  }

  if (aiGuide) {
    validateSnippets(
      aiGuide,
      'AI_GUIDE.md design contract baseline',
      [
        'design validate mycodemap.design.md --json',
        'design map mycodemap.design.md --json',
        'design handoff mycodemap.design.md --json',
        'design verify mycodemap.design.md --json',
        'check --contract mycodemap.design.md --against src',
        '--annotation-format github',
        'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10',
        'changed files <= 10',
        'warn-only / fallback',
        '`mycodemap.design.md`',
        'interface DesignValidateOutput {',
        'interface DesignMapOutput {',
        'interface DesignHandoffOutput {',
        'interface DesignVerificationOutput {',
        'interface ContractCheckResult {'
      ],
      [],
      failures
    );
  }

  // NOTE: CLAUDE.md 已演进为执行手册（路由层），design 检索指南已移至 AI_GUIDE.md / docs/ai-guide/
  // 相关检查已下放至 AI_GUIDE.md 与 docs/ai-guide/*.md 的 validateSnippets 中

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md design contract baseline',
      [
        '## design - 设计契约输入、范围映射与验证',
        'mycodemap design validate mycodemap.design.md --json',
        'mycodemap design map mycodemap.design.md --json',
        'mycodemap design handoff mycodemap.design.md --json',
        'mycodemap design verify mycodemap.design.md --json',
        '## check - 执行 contract gate',
        'mycodemap check --contract mycodemap.design.md --against src',
        'mycodemap check --contract mycodemap.design.md --against src --base origin/main',
        '--annotation-format github',
        '--annotation-format gitlab --annotation-file gl-code-quality-report.json',
        'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10',
        'changed files <= 10',
        'warn-only / fallback',
        '`mycodemap.design.md`',
        '### 必填 sections',
        '### map',
        '### handoff',
        '### verify',
        'no-candidates'
      ],
      [],
      failures
    );
  }

  if (outputGuide) {
    validateSnippets(
      outputGuide,
      'docs/ai-guide/OUTPUT.md design validate schema',
      [
        '## design validate 命令输出结构',
        '## check 命令输出结构',
        '## design map 命令输出结构',
        '## design handoff 命令输出结构',
        '## design verify 命令输出结构',
        'type DesignContractDiagnosticCode =',
        'interface DesignValidateOutput {',
        'interface DesignMapOutput {',
        'interface DesignHandoffOutput {',
        'interface DesignVerificationOutput {',
        'interface ContractCheckResult {',
        'details?: Record<string, string | number | boolean | null>;',
        'rule_type: "layer_direction" | "forbidden_imports" | "module_public_api_only" | "complexity_threshold";',
        'diagnostic?: {',
        'scope: "line" | "file" | "general";',
        'category: "dependency" | "module_boundary" | "complexity";',
        'Annotation-friendly diagnostics',
        'gl-code-quality-report.json',
        'warn-only / fallback',
        'unknowns: string[];',
        'diagnostics: DesignMappingDiagnostic[];',
        'readyForExecution: boolean;',
        'approvals: Array<DesignHandoffTraceItem & {',
        'assumptions: DesignHandoffTraceItem[];',
        'openQuestions: DesignHandoffTraceItem[];',
        'type DesignVerificationStatus =',
        'type DesignDriftKind =',
        '"scan_mode": "diff"',
        '"rule_type": "layer_direction"',
        '"code": "hard-gate-window-exceeded"',
        'checklist: Array<{',
        'drift: Array<{',
        '"code": "handoff-missing"',
        '"code": "missing-section"',
        '"code": "high-risk-scope"',
        '"code": "review-required"'
      ],
      [],
      failures
    );
  }

  if (patternsGuide) {
    validateSnippets(
      patternsGuide,
      'docs/ai-guide/PATTERNS.md design/workflow baseline',
      [
        'node dist/cli/index.js design validate mycodemap.design.md --json',
        'node dist/cli/index.js design map mycodemap.design.md --json',
        'node dist/cli/index.js design handoff mycodemap.design.md --json',
        'node dist/cli/index.js design verify mycodemap.design.md --json',
        'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10',
        'node dist/cli/index.js check --contract mycodemap.design.md --against src --base origin/main --annotation-format github',
        '--annotation-format gitlab --annotation-file gl-code-quality-report.json',
        'changed files <= 10',
        'warn-only / fallback',
        '`design validate → design map → design handoff → design verify`',
        '`workflow` 仍只保留 `find` / `read` / `link` / `show` 四阶段'
      ],
      [
        '5. `commit` - 提交验证',
        '6. `ci` - CI 验证'
      ],
      failures
    );
  }

  if (promptsGuide) {
    validateSnippets(
      promptsGuide,
      'docs/ai-guide/PROMPTS.md design contract prompt',
      [
        'cp docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md mycodemap.design.md',
        'node dist/cli/index.js design validate mycodemap.design.md --json',
        'node dist/cli/index.js check --contract mycodemap.design.md --against src'
      ],
      [],
      failures
    );
  }

  if (engineeringGuide) {
    validateSnippets(
      engineeringGuide,
      'docs/rules/engineering-with-codex-openai.md design command guardrail',
      [
        '`node dist/cli/index.js design validate mycodemap.design.md --json`',
        '`node dist/cli/index.js design map mycodemap.design.md --json`',
        '`node dist/cli/index.js design handoff mycodemap.design.md --json`',
        '`node dist/cli/index.js design verify mycodemap.design.md --json`',
        '`node dist/cli/index.js check --contract mycodemap.design.md --against src`',
        '`candidates` / `unknowns` / `diagnostics`',
        '`readyForExecution` / `approvals` / `assumptions` / `openQuestions`',
        '`checklist` / `drift` / `diagnostics` / `readyForExecution`',
        '`docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`'
      ],
      [],
      failures
    );
  }

  if (productSpecsReadme) {
    validateSnippets(
      productSpecsReadme,
      'docs/product-specs/README.md design template index',
      [
        '`DESIGN_CONTRACT_TEMPLATE.md`'
      ],
      [],
      failures
    );
  }

  if (validationRule) {
    validateSnippets(
      validationRule,
      'docs/rules/validation.md design verification baseline',
      [
        '`design validate` / `design map` / `design handoff` / `design verify`',
        '`check --contract mycodemap.design.md --against src`',
        '`design validate → design map → design handoff → design verify`',
        'design verify mycodemap.design.md --json',
        'review-needed 与 blocker 退出语义',
        'github.event.pull_request.base.sha'
      ],
      [],
      failures
    );
  }

  if (designTemplate) {
    validateSnippets(
      designTemplate,
      'docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md',
      [
        '保存为 `mycodemap.design.md`',
        'rules:',
        'type: layer_direction',
        '## Goal',
        '## Constraints',
        '## Acceptance Criteria',
        '## Non-Goals'
      ],
      [],
      failures
    );
  }

  if (repoContract) {
    validateSnippets(
      repoContract,
      'mycodemap.design.md repo-root contract',
      [
        'rules:',
        'type: layer_direction',
        'from: "src/core/**"',
        'to: "src/cli/**"',
        '## Goal',
        '## Constraints',
        '## Acceptance Criteria',
        '## Non-Goals'
      ],
      [],
      failures
    );
  }
}

function validatePositioningBaselineDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const aiGuideIndex = readText(rootDir, 'docs/ai-guide/README.md', failures);
  const outputGuide = readText(rootDir, 'docs/ai-guide/OUTPUT.md', failures);
  const architecture = readText(rootDir, 'ARCHITECTURE.md', failures);

  if (readme) {
    const requiredReadmeSnippets = [
      'AI-first 代码地图工具',
      'AI/Agent 是主要消费者',
      '`server`、`watch`、`report`、`logs` 已从 public CLI 移除，并在调用时给出迁移提示。'
    ];

    for (const snippet of requiredReadmeSnippets) {
      expectIncludes(readme, snippet, 'README.md positioning baseline', failures);
    }

    expectNotIncludes(
      readme,
      '当前公共 CLI 仍包含 `workflow`、`ship`、`server`、`watch`、`report`、`logs` 等过渡能力',
      'README.md positioning baseline',
      failures
    );
  }

  if (aiGuide) {
    const requiredAiGuideSnippets = [
      'CodeMap 是一个 AI-first 代码地图工具',
      '当前 CLI 过渡现实',
      '`Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令',
      '后者已从 public CLI 移除'
    ];

    for (const snippet of requiredAiGuideSnippets) {
      expectIncludes(aiGuide, snippet, 'AI_GUIDE.md positioning baseline', failures);
    }
  }

  if (aiGuideIndex) {
    const requiredIndexSnippets = [
      'AI-first 代码地图工具',
      'AI/Agent 是主要消费者',
      '`server`、`watch`、`report`、`logs` 已从 public CLI 移除'
    ];

    for (const snippet of requiredIndexSnippets) {
      expectIncludes(aiGuideIndex, snippet, 'docs/ai-guide/README.md positioning baseline', failures);
    }
  }

  if (outputGuide) {
    const requiredOutputSnippets = [
      '目标态',
      '当前 CLI 现实',
      '机器可读优先'
    ];

    for (const snippet of requiredOutputSnippets) {
      expectIncludes(outputGuide, snippet, 'docs/ai-guide/OUTPUT.md contract baseline', failures);
    }
  }

  if (architecture) {
    expectIncludes(
      architecture,
      '`Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令',
      'ARCHITECTURE.md naming boundary',
      failures
    );
  }
}

function validateCliSurfaceDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const aiGuideIndex = readText(rootDir, 'docs/ai-guide/README.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const setupGuide = readText(rootDir, 'docs/SETUP_GUIDE.md', failures);
  const assistantGuide = readText(rootDir, 'docs/AI_ASSISTANT_SETUP.md', failures);
  const quickstart = readText(rootDir, 'docs/ai-guide/QUICKSTART.md', failures);
  const integration = readText(rootDir, 'docs/ai-guide/INTEGRATION.md', failures);

  if (readme) {
    expectIncludes(readme, '### 已移除的公共 CLI 命令', 'README.md cli surface', failures);

    const outdatedReadmeSnippets = [
      '### `mycodemap watch`',
      '### `mycodemap report`（当前过渡能力）',
      '### `mycodemap logs`（当前过渡能力）',
      '### `mycodemap server`（当前过渡能力，且不等于 Server Layer）',
    ];

    for (const snippet of outdatedReadmeSnippets) {
      expectNotIncludes(readme, snippet, 'README.md cli surface', failures);
    }
  }

  if (aiGuide) {
    expectNotIncludes(aiGuide, '后者当前仍公开', 'AI_GUIDE.md cli surface', failures);
  }

  if (aiGuideIndex) {
    expectNotIncludes(
      aiGuideIndex,
      '`workflow`、`server`、`watch`、`report`、`logs`、`ship` 仍是当前公开的过渡能力',
      'docs/ai-guide/README.md cli surface',
      failures
    );
  }

  if (commandsGuide) {
    expectIncludes(commandsGuide, '## 已移除的公共命令', 'docs/ai-guide/COMMANDS.md cli surface', failures);

    const outdatedCommandSnippets = [
      '## server - HTTP 服务器（当前过渡能力）',
      '### watch - 监听模式',
      '### report - 生成报告',
      '### logs - 日志管理',
    ];

    for (const snippet of outdatedCommandSnippets) {
      expectNotIncludes(commandsGuide, snippet, 'docs/ai-guide/COMMANDS.md cli surface', failures);
    }
  }

  if (setupGuide) {
    expectIncludes(setupGuide, '### 已移除的公共 CLI 命令', 'docs/SETUP_GUIDE.md cli surface', failures);
    expectNotIncludes(setupGuide, '### 监听模式', 'docs/SETUP_GUIDE.md cli surface', failures);
    expectNotIncludes(setupGuide, 'mycodemap watch', 'docs/SETUP_GUIDE.md cli surface', failures);
  }

  if (assistantGuide) {
    expectIncludes(
      assistantGuide,
      '若文档或提示词仍把 `server`、`watch`、`report`、`logs` 当成当前 public CLI',
      'docs/AI_ASSISTANT_SETUP.md cli surface',
      failures
    );
  }

  if (quickstart) {
    expectIncludes(
      quickstart,
      '公共 `mycodemap server` 命令已从 public CLI 移除',
      'docs/ai-guide/QUICKSTART.md cli surface',
      failures
    );
    expectNotIncludes(
      quickstart,
      '公共 `mycodemap server` 命令仍存在',
      'docs/ai-guide/QUICKSTART.md cli surface',
      failures
    );
  }

  if (integration) {
    expectNotIncludes(integration, 'mycodemap watch', 'docs/ai-guide/INTEGRATION.md cli surface', failures);
  }
}

function validateConfigDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const setupGuide = readText(rootDir, 'docs/SETUP_GUIDE.md', failures);
  const assistantGuide = readText(rootDir, 'docs/AI_ASSISTANT_SETUP.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const quickstartGuide = readText(rootDir, 'docs/ai-guide/QUICKSTART.md', failures);

  if (readme) {
    validateSnippets(
      readme,
      'README.md config contract',
      [
        '执行后会收敛 `.mycodemap/config.json`，并把 machine-readable receipt 写入 `.mycodemap/status/init-last.json`。',
        '`init` 还会同步 `.mycodemap/hooks/` 与 `.mycodemap/rules/`；但不会自动改写团队自有的 `CLAUDE.md` / `AGENTS.md`，只会在 receipt 中输出可复制片段。',
        '通过 `mycodemap init` 收敛的 canonical 配置文件是 `.mycodemap/config.json`',
        '"$schema": "https://mycodemap.dev/schema/config.json"',
        '"mode": "hybrid"',
        '"plugins": {',
        '"outputPath": ".mycodemap/storage"',
        '| `plugins.builtInPlugins` | `boolean` | 是否启用内置插件 | `true` |'
      ],
      [
        '执行后会在项目根目录生成 `mycodemap.config.json` 配置文件。',
        '通过 `mycodemap init` 生成的 `mycodemap.config.json` 配置文件支持以下选项：',
        '执行后会在项目根目录生成 `codemap.config.json` 配置文件。',
        '通过 `codemap init` 生成的 `codemap.config.json` 配置文件支持以下选项：',
        '"$schema": "https://codemap.dev/schema.json"',
        '"mode": "fast"'
      ],
      failures
    );
  }

  if (aiGuide) {
    validateSnippets(
      aiGuide,
      'AI_GUIDE.md init contract',
      [
        '| "需要先把项目初始化到 canonical `.mycodemap/` 工作区" | `init --interactive` → 确认 receipt → `init --yes` |'
      ],
      [],
      failures
    );
  }

  if (setupGuide) {
    validateSnippets(
      setupGuide,
      'docs/SETUP_GUIDE.md config contract',
      [
        '执行后会收敛 canonical 配置 `.mycodemap/config.json`，并把 receipt 写入 `.mycodemap/status/init-last.json`。',
        '生成的 canonical 配置文件 `.mycodemap/config.json`：',
        '"include": ["src/**/*.ts"]',
        '"watch": false',
        '"plugins": {',
        '"outputPath": ".mycodemap/storage"',
        '| `plugins.debug` | boolean | `false` | 是否输出插件调试日志 |'
      ],
      [
        '会询问以下问题：',
        '"include": ["src/**/*"]'
      ],
      failures
    );
  }

  if (assistantGuide) {
    validateSnippets(
      assistantGuide,
      'docs/AI_ASSISTANT_SETUP.md config contract',
      [
        '- `.mycodemap/config.json` - CodeMap canonical 配置文件',
        '- `.mycodemap/status/init-last.json` - init receipt / managed asset ledger',
        '- `.mycodemap/rules/` - 通用 AI guardrails rules bundle（需手动引用到 `CLAUDE.md` / `AGENTS.md`）'
      ],
      [
        '- `codemap.config.json` - CodeMap 配置文件'
      ],
      failures
    );
  }

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md init contract',
      [
        '### init - 收敛项目状态',
        '`init` 会收敛 `.mycodemap/config.json`、`.mycodemap/status/init-last.json`、`.mycodemap/hooks/` 与 `.mycodemap/rules/`',
        '`init` 不会自动改写 `CLAUDE.md` 或 `AGENTS.md`，只会输出可复制的 rules 引用片段'
      ],
      [],
      failures
    );
  }

  if (quickstartGuide) {
    validateSnippets(
      quickstartGuide,
      'docs/ai-guide/QUICKSTART.md init contract',
      [
        'node dist/cli/index.js init --interactive',
        'node dist/cli/index.js init --yes',
        '`init` 的 receipt 会把 `done`、`manual action`、`conflict`、`skipped` 分开显示'
      ],
      [],
      failures
    );
  }
}

function validatePluginRuntimeDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const outputGuide = readText(rootDir, 'docs/ai-guide/OUTPUT.md', failures);
  const quickstartGuide = readText(rootDir, 'docs/ai-guide/QUICKSTART.md', failures);

  if (readme) {
    validateSnippets(
      readme,
      'README.md plugin runtime contract',
      [
        '只有**显式声明了** `plugins` 段时，`generate` 才会启用插件 runtime；没有该段的旧项目保持原有行为。',
        '`AI_MAP.md` 的 `Plugin Summary` 与 `codemap.json` 的 `pluginReport`',
        '已加载插件、插件生成文件数量与插件诊断摘要'
      ],
      [],
      failures
    );
  }

  if (aiGuide) {
    validateSnippets(
      aiGuide,
      'AI_GUIDE.md plugin runtime contract',
      [
        '`codemap.json.pluginReport`',
        '`pluginReport.diagnostics[]` 用统一结构暴露 `load / initialize / analyze / generate` 四个阶段'
      ],
      [],
      failures
    );
  }

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md plugin runtime contract',
      [
        '`generate` 不提供独立 `--plugin` flags；插件通过 `.mycodemap/config.json` 的 `plugins` 段声明。',
        '`AI_MAP.md` 会增加 `Plugin Summary`，`codemap.json` 会增加 `pluginReport`'
      ],
      [],
      failures
    );
  }

  if (outputGuide) {
    validateSnippets(
      outputGuide,
      'docs/ai-guide/OUTPUT.md plugin runtime contract',
      [
        'interface PluginExecutionReport {',
        'pluginReport?: PluginExecutionReport;',
        'stage: "load" | "initialize" | "analyze" | "generate";'
      ],
      [],
      failures
    );
  }

  if (quickstartGuide) {
    validateSnippets(
      quickstartGuide,
      'docs/ai-guide/QUICKSTART.md plugin runtime contract',
      [
        '若显式配置了 plugins，也要看 Plugin Summary',
        '解析 `.mycodemap/codemap.json` 的 `pluginReport`'
      ],
      [],
      failures
    );
  }
}

function validateGraphStorageDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const claudeGuide = readText(rootDir, 'CLAUDE.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const quickstartGuide = readText(rootDir, 'docs/ai-guide/QUICKSTART.md', failures);
  const setupGuide = readText(rootDir, 'docs/SETUP_GUIDE.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);
  const schema = readText(rootDir, 'mycodemap.config.schema.json', failures);

  if (readme) {
    validateSnippets(
      readme,
      'README.md graph storage contract',
      [
        '"storage": {',
        '| `storage.type` | `"filesystem" \\| "sqlite" \\| "memory" \\| "auto"` | 图存储后端类型 | `"filesystem"` |',
        '`neo4j` 与 `kuzudb` 已不再是正式支持的 backend；旧配置会返回显式迁移错误，不会静默 fallback 到 `filesystem`。',
        '`storage.type = "auto"` 当前优先选择 `sqlite`；若运行时缺少 `better-sqlite3` 或 Node.js `<20` 导致 SQLite 不可用，则 warning 后回退到 `filesystem`。',
        '图存储后端生产化不等于重新开放公共 HTTP API 产品面；`Server Layer` 仍是内部架构层。'
      ],
      [],
      failures
    );
  }

  if (aiGuide) {
    validateSnippets(
      aiGuide,
      'AI_GUIDE.md graph storage contract',
      [
        '| "需要切换/排查图存储后端" | 编辑 `.mycodemap/config.json` 的 `storage` 段 → 运行 `generate` / `export` |',
        '`generate` 会写入配置的图存储后端；`export` 与内部 `Server Layer` handler 会读取同一份后端数据。',
        '`neo4j` 与 `kuzudb` 已不再是正式支持的 backend；旧配置会暴露显式迁移错误，不会静默 fallback。',
        '`storage.type = "auto"` 当前优先选择 `sqlite`；若运行时缺少 `better-sqlite3` 或 Node.js `<20` 导致 SQLite 不可用，则 warning 后回退到 `filesystem`。'
      ],
      [],
      failures
    );
  }

  // NOTE: CLAUDE.md 已演进为执行手册（路由层），graph storage 合约已移至 AI_GUIDE.md / docs/ai-guide/
  // 相关检查已下放至 AI_GUIDE.md 与 docs/ai-guide/*.md 的 validateSnippets 中

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md graph storage contract',
      [
        '`generate` 会读取 `.mycodemap/config.json` 的 `storage` 段，并把 CodeGraph 写入所选后端。',
        '`export json|graphml|dot` 会从 `.mycodemap/config.json` 的 `storage` 段指定后端读取 CodeGraph。',
        '图存储后端收口不等于重新开放公共 `mycodemap server` 产品面；`Server Layer` 仍是内部层。'
      ],
      [],
      failures
    );
  }

  if (quickstartGuide) {
    validateSnippets(
      quickstartGuide,
      'docs/ai-guide/QUICKSTART.md graph storage contract',
      [
        'stdout 还会显示当前写入的 `MVP3 Storage (...)`',
        '| "需要切换/排查图存储后端" | 编辑 `.mycodemap/config.json` 的 `storage` 段后运行 `generate` | `export json` 验证是否能从同一 backend 读回 | 文本 + 机器可读 |'
      ],
      [],
      failures
    );
  }

  if (setupGuide) {
    validateSnippets(
      setupGuide,
      'docs/SETUP_GUIDE.md graph storage contract',
      [
        '"storage": {',
        '| `storage.type` | string | `"filesystem"` | 图存储后端类型：`filesystem` / `sqlite` / `memory` / `auto` |',
        '旧的 `neo4j` / `kuzudb` 配置已不再受支持，会返回显式迁移错误，不会静默 fallback 到 `filesystem`。',
        '显式选择 `sqlite` 且运行时缺少 `better-sqlite3` 或 Node.js `<20` 时，会返回显式错误。',
        '`storage.type = "auto"` 当前优先选择 `sqlite`；仅当 SQLite 运行时不可用时才 warning 后回退到 `filesystem`。'
      ],
      [],
      failures
    );
  }

  if (validationRule) {
    validateSnippets(
      validationRule,
      'docs/rules/validation.md graph storage guardrail',
      [
        '若改动涉及 `.mycodemap/config.json` 的 `storage` 段或图数据库适配器',
        'schema / README / AI 文档没同步',
        '旧的 `neo4j` / `kuzudb` 配置已经不受支持，但文档还把它写成正式 backend',
        'Node.js `>=20`',
        '`STORAGE_BACKEND_MIGRATED`、`SQLITE_NOT_AVAILABLE`'
      ],
      [],
      failures
    );
  }

  if (schema) {
    validateSnippets(
      schema,
      'mycodemap.config.schema.json storage contract',
      [
        '"storage"',
        '"enum": ["filesystem", "sqlite", "memory", "auto"]',
        '"outputPath"',
        '".mycodemap/storage"',
        '"databasePath"',
        '"autoThresholds"'
      ],
      [],
      failures
    );
  }
}

function validateTestingDocs(rootDir, failures) {
  const testingRule = readText(rootDir, 'docs/rules/testing.md', failures);
  const vitestConfig = readText(rootDir, 'vitest.config.ts', failures);
  const benchmarkConfig = readText(rootDir, 'vitest.benchmark.config.ts', failures);

  if (!testingRule || !vitestConfig || !benchmarkConfig) {
    return;
  }

  const sharedSnippets = [
    "include: ['src/**/*.test.ts']",
    "exclude: ['node_modules', 'dist', 'refer/**/*.test.ts']",
    'testTimeout: 10000',
    'hookTimeout: 10000'
  ];

  for (const snippet of sharedSnippets) {
    expectIncludes(vitestConfig, snippet, 'vitest.config.ts', failures);
    expectIncludes(testingRule, snippet, 'docs/rules/testing.md', failures);
  }

  expectIncludes(benchmarkConfig, "include: ['refer/benchmark-quality.test.ts']", 'vitest.benchmark.config.ts', failures);
  expectIncludes(testingRule, '`refer/benchmark-quality.test.ts`', 'docs/rules/testing.md', failures);
  expectIncludes(testingRule, '`vitest.benchmark.config.ts`', 'docs/rules/testing.md', failures);
}

function validateWorkflowAndDiscoveryDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const aiGuide = readText(rootDir, 'AI_GUIDE.md', failures);
  const commandsGuide = readText(rootDir, 'docs/ai-guide/COMMANDS.md', failures);
  const outputGuide = readText(rootDir, 'docs/ai-guide/OUTPUT.md', failures);
  const engineeringRule = readText(rootDir, 'docs/rules/engineering-with-codex-openai.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);

  if (readme) {
    validateSnippets(
      readme,
      'README.md workflow/discovery boundary',
      [
        '`workflow` 是公开的 analysis-only 工作流能力，只编排分析阶段：`find → read → link → show`。',
        '共享同一套 `.gitignore` 感知排除规则',
        '"coverage/**"',
        '"**/*.test.ts"',
        '"**/*.spec.ts"',
        '"**/*.d.ts"',
        '`mycodemap ship` 的 CHECK 阶段现在复用 `ci check-working-tree`、`ci check-branch`、`ci check-scripts`'
      ],
      [
        '    "*.test.ts",',
        '    "*.spec.ts",'
      ],
      failures
    );
  }

  if (aiGuide) {
    validateSnippets(
      aiGuide,
      'AI_GUIDE.md discovery baseline',
      [
        '| 文件发现契约 | 扫描类命令共享 `.gitignore` 感知排除模块；无 `.gitignore` 时回退到默认 `exclude` |'
      ],
      [],
      failures
    );
  }

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md workflow/ci boundary',
      [
        '`ship` 的 CHECK 阶段会复用 `ci check-working-tree`、`ci check-branch`、`ci check-scripts`',
        '`ci check-branch --allow` 支持 `*` 通配',
        '`ci check-headers -d` 与 `generate` / `analyze` 共享同一套 `.gitignore` 感知排除规则',
        '`workflow` 只保留 `find → read → link → show` 四个分析阶段'
      ],
      [],
      failures
    );
  }

  if (outputGuide) {
    validateSnippets(
      outputGuide,
      'docs/ai-guide/OUTPUT.md discovery contract',
      [
        '| 文件发现 | 扫描类命令共享一个文件发现模块 | 先尊重仓库 `.gitignore`，无 `.gitignore` 时回退到默认 `exclude` |',
        'type DiscoveryFallbackExclude =',
        '"coverage/**"',
        '"**/*.test.ts"',
        '"**/*.spec.ts"',
        '"**/*.d.ts"',
        'sharedBy: ["generate", "analyze", "ci check-headers -d"];'
      ],
      [],
      failures
    );
  }

  if (engineeringRule) {
    validateSnippets(
      engineeringRule,
      'docs/rules/engineering-with-codex-openai.md workflow/ci boundary',
      [
        '`ci check-branch --allow` 支持 `*` 通配；在 CI / PR 环境中，分支识别会回退到 `GITHUB_HEAD_REF` / `GITHUB_REF_NAME`。',
        '`generate`、`analyze` 与 `ci check-headers -d` 共享 `.gitignore` 感知文件发现模块；没有 `.gitignore` 时回退到统一默认 `exclude`。',
        '`check-working-tree`、`check-branch`、`check-scripts` 作为共享发布前 gate checks，由本地 `ci` 命令提供，`ship` 的 CHECK 阶段直接复用它们。'
      ],
      [
        '然后再通过 `node dist/cli/index.js ci ...` 执行 `check-working-tree`、`check-branch`、`check-scripts`'
      ],
      failures
    );
  }

  if (validationRule) {
    validateSnippets(
      validationRule,
      'docs/rules/validation.md workflow/discovery boundary',
      [
        '若改动涉及产品定位、输出契约、共享文件发现规则或 `Server Layer` / `mycodemap server` 边界',
        '当前 CI Gateway 直接执行 `check-docs-sync`、commit 格式、文件头、risk、output contract；`ship` 的本地 CHECK 阶段复用 `check-working-tree`、`check-branch`、`check-scripts`',
        '文档声称扫描类命令会尊重 `.gitignore`，但实现仍保留手写跳过规则',
        '把 `workflow` 重新扩回非分析阶段，却没同步 README / AI 命令文档 / guardrail 脚本'
      ],
      [],
      failures
    );
  }
}

function validateProductSpecsDocs(rootDir, failures) {
  const productSpecsReadme = readText(rootDir, 'docs/product-specs/README.md', failures);
  const comparison = readText(rootDir, 'docs/product-specs/MVP3-ARCHITECTURE-COMPARISON.md', failures);
  const prd = readText(rootDir, 'docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-PRD.md', failures);
  const techPrd = readText(rootDir, 'docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-TECH-PRD.md', failures);

  if (productSpecsReadme) {
    validateSnippets(
      productSpecsReadme,
      'docs/product-specs/README.md active specs index',
      [
        '## 当前有效规格',
        '`MVP3-ARCHITECTURE-COMPARISON.md`',
        '`MVP3-ARCHITECTURE-REDESIGN-PRD.md`',
        '`MVP3-ARCHITECTURE-REDESIGN-TECH-PRD.md`'
      ],
      [
        '当前活跃产品规格暂为空'
      ],
      failures
    );
  }

  if (comparison) {
    validateSnippets(
      comparison,
      'docs/product-specs/MVP3-ARCHITECTURE-COMPARISON.md baseline',
      [
        '# MVP3 架构对比：历史设计目标 vs v1.3 已落地基线',
        '`src/server/` 保留为**内部架构层**；公共 `server` 命令已移除',
        '`filesystem` / `memory` / `sqlite` / `auto` 为正式 surface；`neo4j` 与 `kuzudb` 已退出正式支持',
        '当前优先选择 `sqlite`；仅当 SQLite 运行时不可用时 warning 后回退 `filesystem`',
        '`sqlite` 需要 `better-sqlite3` + Node.js `>=20`；否则返回 `SQLITE_NOT_AVAILABLE`',
        '当前公开能力仅保留 analysis-only：`find → read → link → show`',
        'Java / Rust / C/C++ 等更多 parser 实现 | 接口预留，未作为当前 shipped reality |'
      ],
      [
        '# MVP3 架构对比：Before vs After',
        'cli/commands/viz.ts',
        '支持 14 种语言',
        'Kùzu-only',
        '当前仍保守落到 `filesystem`'
      ],
      failures
    );
  }

  if (prd) {
    validateSnippets(
      prd,
      'docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-PRD.md shipped baseline',
      [
        '# CodeMap MVP3 架构重构产品需求文档（PRD，v1.3 同步版）',
        '公共 CLI 不再暴露 `server`、`watch`、`report`、`logs`',
        '| `auto` | shipped surface | 配置面存在，当前优先选择 `sqlite`；SQLite 不可用时回退 `filesystem` |',
        '| `neo4j` / `kuzudb` | removed | 不再是正式支持 backend；旧配置返回显式迁移错误 |',
        '显式 `sqlite` 缺少 `better-sqlite3` 或 Node.js `<20` 时会返回 `SQLITE_NOT_AVAILABLE`',
        '`workflow` 是 **analysis-only** 能力，只编排 `find → read → link → show`',
        '| 公共 HTTP API / `mycodemap server` 产品面 | Deferred |'
      ],
      [
        '支持 14 种语言',
        'neo4j | shipped',
        'Kùzu-only',
        '当前仍保守落到 `filesystem`'
      ],
      failures
    );
  }

  if (techPrd) {
    validateSnippets(
      techPrd,
      'docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-TECH-PRD.md technical baseline',
      [
        '# CodeMap MVP3 架构重构技术需求文档（Tech-PRD，v1.3 同步版）',
        '`neo4j` 与 `kuzudb` 已不再是正式支持 backend。',
        '显式选择 `sqlite` 且运行时缺少 `better-sqlite3` 或 Node.js `<20` 时，`StorageFactory` 会抛出 `SQLITE_NOT_AVAILABLE`',
        '`auto` 是稳定配置面',
        '`auto` 会先探测 SQLite runtime，可用时返回 `sqlite`，不可用时 warning 后回退 `filesystem`',
        '但“按规模自动切到图数据库”的更强启发式仍是未来候选，而不是当前完成能力',
        '| analyze / refresh / incremental update 作为公共能力 | 明确返回 `501` unsupported |',
        '`workflow` 当前是 analysis-only 能力：'
      ],
      [
        'TypeScriptParser, GoParser, PythonParser, ParserRegistry',
        '当前仍保守返回 `filesystem`',
        'Kùzu-native'
      ],
      failures
    );
  }
}

function validateGuardrailDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const engineeringRule = readText(rootDir, 'docs/rules/engineering-with-codex-openai.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);
  const ciWorkflow = readText(rootDir, '.github/workflows/ci-gateway.yml', failures);
  const preCommitHook = readText(rootDir, '.githooks/pre-commit', failures);

  if (readme) {
    const requiredReadmeGuardrails = [
      'npm run docs:check',
      'mycodemap ci check-docs-sync',
      'mycodemap check --contract mycodemap.design.md --against src'
    ];

    for (const snippet of requiredReadmeGuardrails) {
      expectIncludes(readme, snippet, 'README.md guardrail commands', failures);
    }
  }

  if (engineeringRule) {
    const requiredReferences = [
      '.githooks/pre-commit',
      '.githooks/commit-msg',
      '.github/workflows/ci-gateway.yml',
      '.github/workflows/publish.yml',
      'npm run docs:check'
    ];

    for (const reference of requiredReferences) {
      expectIncludes(engineeringRule, reference, 'docs/rules/engineering-with-codex-openai.md', failures);
    }
  }

  if (validationRule) {
    expectIncludes(validationRule, 'npm run docs:check', 'docs/rules/validation.md', failures);
    expectIncludes(validationRule, 'node dist/cli/index.js check --contract mycodemap.design.md --against src', 'docs/rules/validation.md', failures);
    expectIncludes(validationRule, 'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10', 'docs/rules/validation.md', failures);
    expectIncludes(validationRule, '--annotation-format github', 'docs/rules/validation.md', failures);
    expectIncludes(validationRule, 'changed files <= 10', 'docs/rules/validation.md', failures);
    expectIncludes(validationRule, 'warn-only / fallback', 'docs/rules/validation.md', failures);
  }

  if (ciWorkflow) {
    expectIncludes(ciWorkflow, 'run: npm run docs:check', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: npm run typecheck', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: npm run build', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'check --contract mycodemap.design.md --against src', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'github.event.pull_request.base.sha', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, '--annotation-format github', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'contract-gate-calibration.json', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'contract-check-result.json', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'warn-only / fallback', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: node dist/cli/index.js ci check-docs-sync', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'node dist/cli/index.js generate', '.github/workflows/ci-gateway.yml', failures);
  }

  if (preCommitHook) {
    expectIncludes(preCommitHook, 'npm run docs:check', '.githooks/pre-commit', failures);
  }
}

function validateAssistantDocs(rootDir, failures) {
  const assistantGuide = readText(rootDir, 'docs/AI_ASSISTANT_SETUP.md', failures);
  const setupGuide = readText(rootDir, 'docs/SETUP_GUIDE.md', failures);

  if (assistantGuide) {
    const requiredAssistantSnippets = [
      'npm run docs:check',
      'mycodemap ci check-docs-sync',
      'docs/rules/engineering-with-codex-openai.md'
    ];

    for (const snippet of requiredAssistantSnippets) {
      expectIncludes(assistantGuide, snippet, 'docs/AI_ASSISTANT_SETUP.md', failures);
    }
  }

  if (setupGuide) {
    const requiredSetupSnippets = [
      'npm run docs:check',
      'npm run typecheck',
      'npx mycodemap ci check-docs-sync',
      'npx mycodemap ci check-commit-size --range origin/main..HEAD',
      'npx mycodemap ci assess-risk --threshold=0.7',
      'npx mycodemap ci check-output-contract --schema-version v1.0.0 --top-k 8 --max-tokens 160',
      'git diff --exit-code .mycodemap/ai-feed.txt'
    ];

    for (const snippet of requiredSetupSnippets) {
      expectIncludes(setupGuide, snippet, 'docs/SETUP_GUIDE.md', failures);
    }
  }
}

function validateDocs(rootDir) {
  const failures = [];

  validatePackageScripts(rootDir, failures);
  validatePositioningBaselineDocs(rootDir, failures);
  validateCliSurfaceDocs(rootDir, failures);
  validateConfigDocs(rootDir, failures);
  validatePluginRuntimeDocs(rootDir, failures);
  validateGraphStorageDocs(rootDir, failures);
  validateAnalyzeDocs(rootDir, failures);
  validateHistoryRiskDocs(rootDir, failures);
  validateDesignContractDocs(rootDir, failures);
  validateTestingDocs(rootDir, failures);
  validateWorkflowAndDiscoveryDocs(rootDir, failures);
  validateProductSpecsDocs(rootDir, failures);
  validateGuardrailDocs(rootDir, failures);
  validateAssistantDocs(rootDir, failures);

  if (failures.length > 0) {
    console.error('ERROR: documentation guardrails failed');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Documentation guardrails passed');
}

validateDocs(parseRootDir(process.argv.slice(2)));
