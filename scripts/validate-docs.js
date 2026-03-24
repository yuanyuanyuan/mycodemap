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

  validateSnippets(
    claudeGuide,
    'CLAUDE.md analyze retrieval guidance',
    [
      'node dist/cli/index.js analyze -i <find|read|link|show>'
    ],
    [
      'node dist/cli/index.js analyze <intent>'
    ],
    failures
  );

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
  const setupGuide = readText(rootDir, 'docs/SETUP_GUIDE.md', failures);
  const assistantGuide = readText(rootDir, 'docs/AI_ASSISTANT_SETUP.md', failures);

  if (readme) {
    validateSnippets(
      readme,
      'README.md config contract',
      [
        '执行后会在项目根目录生成 `mycodemap.config.json` 配置文件。',
        '通过 `mycodemap init` 生成的 `mycodemap.config.json` 配置文件支持以下选项：',
        '"$schema": "https://mycodemap.dev/schema/config.json"',
        '"mode": "hybrid"',
        '"plugins": {',
        '| `plugins.builtInPlugins` | `boolean` | 是否启用内置插件 | `true` |'
      ],
      [
        '执行后会在项目根目录生成 `codemap.config.json` 配置文件。',
        '通过 `codemap init` 生成的 `codemap.config.json` 配置文件支持以下选项：',
        '"$schema": "https://codemap.dev/schema.json"',
        '"mode": "fast"'
      ],
      failures
    );
  }

  if (setupGuide) {
    validateSnippets(
      setupGuide,
      'docs/SETUP_GUIDE.md config contract',
      [
        '生成的配置文件 `mycodemap.config.json`：',
        '"include": ["src/**/*.ts"]',
        '"watch": false',
        '"plugins": {',
        '| `plugins.debug` | boolean | `false` | 是否输出插件调试日志 |'
      ],
      [
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
        '- `mycodemap.config.json` - CodeMap 配置文件'
      ],
      [
        '- `codemap.config.json` - CodeMap 配置文件'
      ],
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
        '`generate` 不提供独立 `--plugin` flags；插件通过 `mycodemap.config.json` 的 `plugins` 段声明。',
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
        '| `storage.type` | `"filesystem" \\| "kuzudb" \\| "memory" \\| "auto"` | 图存储后端类型 | `"filesystem"` |',
        '`neo4j` 已不再是正式支持的 backend；旧配置会返回显式迁移错误，不会静默 fallback 到 `filesystem`。',
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
        '| "需要切换/排查图存储后端" | 编辑 `mycodemap.config.json.storage` → 运行 `generate` / `export` |',
        '`generate` 会写入配置的图存储后端；`export` 与内部 `Server Layer` handler 会读取同一份后端数据。',
        '`neo4j` 已不再是正式支持的 backend；旧配置会暴露显式迁移错误，不会静默 fallback。'
      ],
      [],
      failures
    );
  }

  if (commandsGuide) {
    validateSnippets(
      commandsGuide,
      'docs/ai-guide/COMMANDS.md graph storage contract',
      [
        '`generate` 会读取 `mycodemap.config.json.storage`，并把 CodeGraph 写入所选后端。',
        '`export json|graphml|dot` 会从 `mycodemap.config.json.storage` 指定的后端读取 CodeGraph。',
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
        '| "需要切换/排查图存储后端" | 编辑 `mycodemap.config.json.storage` 后运行 `generate` | `export json` 验证是否能从同一 backend 读回 | 文本 + 机器可读 |'
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
        '| `storage.type` | string | `"filesystem"` | 图存储后端类型：`filesystem` / `kuzudb` / `memory` / `auto` |',
        '旧的 `neo4j` 配置已不再受支持，会返回显式迁移错误，不会静默 fallback 到 `filesystem`。'
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
        '若改动涉及 `mycodemap.config.json.storage` 或图数据库适配器',
        'schema / README / AI 文档没同步',
        '旧的 `neo4j` 配置已经不受支持，但文档还把它写成正式 backend'
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
        '"enum": ["filesystem", "kuzudb", "memory", "auto"]',
        '"outputPath"',
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
        '`workflow` 仍是公开的过渡能力，但它现在只编排分析阶段：`find → read → link → show`。',
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

function validateGuardrailDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const engineeringRule = readText(rootDir, 'docs/rules/engineering-with-codex-openai.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);
  const ciWorkflow = readText(rootDir, '.github/workflows/ci-gateway.yml', failures);
  const preCommitHook = readText(rootDir, '.githooks/pre-commit', failures);

  if (readme) {
    const requiredReadmeGuardrails = [
      'npm run docs:check',
      'mycodemap ci check-docs-sync'
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
  }

  if (ciWorkflow) {
    expectIncludes(ciWorkflow, 'run: npm run docs:check', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: npm run typecheck', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: npm run build', '.github/workflows/ci-gateway.yml', failures);
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
  validateTestingDocs(rootDir, failures);
  validateWorkflowAndDiscoveryDocs(rootDir, failures);
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
