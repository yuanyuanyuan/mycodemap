// [META] since:2026-03 | owner:docs-team | stable:false
// [WHY] 为 analyze 的 canonical 文档示例提供单一渲染源，并支持校验/同步 generated block

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(__dirname, '..');

function parseCliArgs(argv) {
  const rootFlagIndex = argv.indexOf('--root');
  const check = argv.includes('--check');

  if (rootFlagIndex === -1) {
    return { rootDir: defaultRootDir, check };
  }

  const rootValue = argv[rootFlagIndex + 1];
  if (!rootValue) {
    console.error('ERROR: --root requires a directory path');
    process.exit(1);
  }

  return {
    rootDir: path.resolve(rootValue),
    check,
  };
}

function renderCommentedBashBlock(sections) {
  const lines = ['```bash'];

  sections.forEach((section, index) => {
    lines.push(`# ${section.title}`);
    lines.push(...section.commands);

    if (index < sections.length - 1) {
      lines.push('');
    }
  });

  lines.push('```');
  return lines.join('\n');
}

function renderReadmeAnalyzeExamples() {
  return renderCommentedBashBlock([
    {
      title: '查找符号 / 文本',
      commands: [
        'mycodemap analyze -i find -k SourceLocation',
        'mycodemap analyze -i find -t src/orchestrator -k IntentRouter --json',
      ],
    },
    {
      title: '阅读文件（影响 + 复杂度聚合）',
      commands: [
        'mycodemap analyze -i read -t src/cli/index.ts',
        'mycodemap analyze -i read -t src/cli/index.ts --scope transitive',
        'mycodemap analyze -i read -t src/cli/index.ts --include-tests --json',
      ],
    },
    {
      title: '关联关系（依赖 + 引用聚合）',
      commands: [
        'mycodemap analyze -i link -t src/cli/index.ts',
        'mycodemap analyze -i link -t src/interface/types.ts --json',
      ],
    },
    {
      title: '展示模块概览 / 文档',
      commands: [
        'mycodemap analyze -i show -t src/orchestrator',
        'mycodemap analyze -i show -t src/domain/services --output-mode human',
      ],
    },
    {
      title: '机器可读输出（JSON / structured）',
      commands: [
        'mycodemap analyze -i read -t src/index.ts --json',
        'mycodemap analyze -i link -t src/index.ts --structured --json',
      ],
    },
  ]);
}

function renderCommandsAnalyzeIntentExamples() {
  return renderCommentedBashBlock([
    {
      title: '1. find - 查找符号 / 文本',
      commands: [
        'mycodemap analyze -i find -k "UnifiedResult"',
        'mycodemap analyze -i find -k "SourceLocation" --json --structured',
        'mycodemap analyze -i find -t "src/orchestrator" -k "IntentRouter" --topK 20',
      ],
    },
    {
      title: '2. read - 阅读文件（影响 + 复杂度）',
      commands: [
        'mycodemap analyze -i read -t "src/index.ts"',
        'mycodemap analyze -i read -t "src/index.ts" --scope transitive',
        'mycodemap analyze -i read -t "src/index.ts" --include-tests',
      ],
    },
    {
      title: '3. link - 关联关系（依赖 + 引用）',
      commands: [
        'mycodemap analyze -i link -t "src/orchestrator"',
        'mycodemap analyze -i link -t "src/interface/types.ts" --json',
      ],
    },
    {
      title: '4. show - 模块概览 / 文档',
      commands: [
        'mycodemap analyze -i show -t "src/"',
        'mycodemap analyze -i show -t "src/domain/services" --output-mode human',
      ],
    },
  ]);
}

function renderCommandsAnalyzeOutputExamples() {
  return renderCommentedBashBlock([
    {
      title: 'JSON 输出',
      commands: ['mycodemap analyze -i read -t "src/index.ts" --json'],
    },
    {
      title: '纯结构化（移除自然语言字段）',
      commands: ['mycodemap analyze -i link -t "src/index.ts" --structured --json'],
    },
    {
      title: '机器可读模式',
      commands: ['mycodemap analyze -i show -t "src/index.ts" --output-mode machine'],
    },
    {
      title: '人类可读模式',
      commands: ['mycodemap analyze -i show -t "src/index.ts" --output-mode human'],
    },
  ]);
}

function renderMarkdownTemplateBlock(lines) {
  return ['```markdown', ...lines, '```'].join('\n');
}

function renderAiGuideProjectTemplate() {
  return renderMarkdownTemplateBlock([
    '我需要理解这个 TypeScript 项目的结构。',
    '请执行：',
    '1. `node dist/cli/index.js generate`',
    '2. 阅读 `.mycodemap/AI_MAP.md`',
    '3. 使用 `analyze -i show -t "src/" --json`',
    '4. 输出项目结构分析',
  ]);
}

function renderAiGuideImpactTemplate() {
  return renderMarkdownTemplateBlock([
    '我需要修改 {{FILE}}，请分析影响范围。',
    '请执行：',
    '1. `node dist/cli/index.js analyze -i read -t "{{FILE}}" --scope transitive --json`',
    '2. 分析直接依赖和传递依赖',
    '3. 评估风险等级',
    '4. 给出修改建议',
  ]);
}

function getObjectProperty(objectExpression, propertyName) {
  return objectExpression.properties.find(property => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }

    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
      return property.name.text === propertyName;
    }

    return false;
  });
}

function getStringLiteralValue(objectExpression, propertyName, options = {}) {
  const property = getObjectProperty(objectExpression, propertyName);
  if (!property) {
    return options.optional ? undefined : null;
  }

  const { initializer } = property;
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.text;
  }

  return options.optional ? undefined : null;
}

function getBooleanLiteralValue(objectExpression, propertyName) {
  const property = getObjectProperty(objectExpression, propertyName);
  if (!property) {
    return undefined;
  }

  if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  return undefined;
}

function loadAnalyzeDocOptions(rootDir) {
  const sourcePath = path.join(rootDir, 'src/cli/commands/analyze-options.ts');
  if (!existsSync(sourcePath)) {
    throw new Error('Missing required file: src/cli/commands/analyze-options.ts');
  }

  const sourceText = readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  let definitionsNode = null;
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === 'ANALYZE_OPTION_DEFINITIONS' &&
        declaration.initializer &&
        ts.isAsExpression(declaration.initializer) &&
        ts.isArrayLiteralExpression(declaration.initializer.expression)
      ) {
        definitionsNode = declaration.initializer.expression;
      }
    }
  }

  if (!definitionsNode) {
    throw new Error('Unable to locate ANALYZE_OPTION_DEFINITIONS in src/cli/commands/analyze-options.ts');
  }

  return definitionsNode.elements.flatMap(element => {
    if (!ts.isObjectLiteralExpression(element)) {
      return [];
    }

    if (getBooleanLiteralValue(element, 'includeInDocs') === false) {
      return [];
    }

    const flags = getStringLiteralValue(element, 'flags');
    const docDescription =
      getStringLiteralValue(element, 'docDescription', { optional: true }) ??
      getStringLiteralValue(element, 'description');
    const defaultValue =
      getStringLiteralValue(element, 'docDefaultValue', { optional: true }) ??
      getStringLiteralValue(element, 'defaultValue', { optional: true }) ??
      '-';

    if (!flags || !docDescription) {
      throw new Error('Failed to parse analyze option documentation metadata');
    }

    return [
      {
        flags,
        docDescription,
        defaultValue,
      },
    ];
  });
}

function renderAnalyzeOptionsTable(rootDir) {
  const options = loadAnalyzeDocOptions(rootDir);
  const lines = [
    '| 选项 | 说明 | 默认值 |',
    '|------|------|--------|',
    ...options.map(option => {
      const defaultValue = option.defaultValue === '-' ? '-' : `\`${option.defaultValue}\``;
      return `| \`${option.flags}\` | ${option.docDescription} | ${defaultValue} |`;
    }),
  ];

  return lines.join('\n');
}

const ANALYZE_DOC_BLOCKS = [
  {
    relativePath: 'README.zh-CN.md',
    marker: 'analyze-readme-examples',
    render: () => renderReadmeAnalyzeExamples(),
  },
  {
    relativePath: 'README.zh-CN.md',
    marker: 'analyze-readme-options',
    render: rootDir => renderAnalyzeOptionsTable(rootDir),
  },
  {
    relativePath: 'docs/ai-guide/COMMANDS.md',
    marker: 'analyze-commands-intents',
    render: () => renderCommandsAnalyzeIntentExamples(),
  },
  {
    relativePath: 'docs/ai-guide/COMMANDS.md',
    marker: 'analyze-commands-output',
    render: () => renderCommandsAnalyzeOutputExamples(),
  },
  {
    relativePath: 'docs/ai-guide/COMMANDS.md',
    marker: 'analyze-commands-options',
    render: rootDir => renderAnalyzeOptionsTable(rootDir),
  },
  {
    relativePath: 'AI_GUIDE.md',
    marker: 'analyze-ai-guide-project-template',
    render: () => renderAiGuideProjectTemplate(),
  },
  {
    relativePath: 'AI_GUIDE.md',
    marker: 'analyze-ai-guide-impact-template',
    render: () => renderAiGuideImpactTemplate(),
  },
];

function createGeneratedBlock(marker, content) {
  return `<!-- BEGIN GENERATED: ${marker} -->\n${content}\n<!-- END GENERATED: ${marker} -->`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceGeneratedBlock(text, marker, renderedContent) {
  const startMarker = `<!-- BEGIN GENERATED: ${marker} -->`;
  const endMarker = `<!-- END GENERATED: ${marker} -->`;

  if (!text.includes(startMarker) || !text.includes(endMarker)) {
    return {
      ok: false,
      reason: `Missing generated block markers for ${marker}`,
    };
  }

  const expectedBlock = createGeneratedBlock(marker, renderedContent);
  const blockPattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`
  );

  return {
    ok: true,
    expectedBlock,
    nextText: text.replace(blockPattern, expectedBlock),
  };
}

function readRequiredFile(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing required file: ${relativePath}`,
    };
  }

  return {
    ok: true,
    absolutePath,
    text: readFileSync(absolutePath, 'utf8'),
  };
}

export function collectAnalyzeDocSyncFailures(rootDir) {
  const failures = [];

  for (const block of ANALYZE_DOC_BLOCKS) {
    const fileResult = readRequiredFile(rootDir, block.relativePath);
    if (!fileResult.ok) {
      failures.push(fileResult.reason);
      continue;
    }

    let renderedContent;
    try {
      renderedContent = block.render(rootDir);
    } catch (error) {
      failures.push(
        `${block.relativePath}: failed to render "${block.marker}": ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    const blockResult = replaceGeneratedBlock(fileResult.text, block.marker, renderedContent);
    if (!blockResult.ok) {
      failures.push(`${block.relativePath}: ${blockResult.reason}`);
      continue;
    }

    if (fileResult.text !== blockResult.nextText) {
      failures.push(
        `${block.relativePath}: generated block "${block.marker}" is out of sync with scripts/sync-analyze-docs.js`
      );
    }
  }

  return failures;
}

export function syncAnalyzeDocs(rootDir) {
  const changedFiles = new Set();
  const failures = [];

  for (const block of ANALYZE_DOC_BLOCKS) {
    const fileResult = readRequiredFile(rootDir, block.relativePath);
    if (!fileResult.ok) {
      failures.push(fileResult.reason);
      continue;
    }

    let renderedContent;
    try {
      renderedContent = block.render(rootDir);
    } catch (error) {
      failures.push(
        `${block.relativePath}: failed to render "${block.marker}": ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    const blockResult = replaceGeneratedBlock(fileResult.text, block.marker, renderedContent);
    if (!blockResult.ok) {
      failures.push(`${block.relativePath}: ${blockResult.reason}`);
      continue;
    }

    if (fileResult.text !== blockResult.nextText) {
      writeFileSync(fileResult.absolutePath, blockResult.nextText);
      changedFiles.add(block.relativePath);
    }
  }

  return {
    changedFiles: [...changedFiles],
    failures,
  };
}

function isCliEntrypoint() {
  const entryPath = process.argv[1];
  return Boolean(entryPath) && path.resolve(entryPath) === fileURLToPath(import.meta.url);
}

function main(argv) {
  const { rootDir, check } = parseCliArgs(argv);

  if (check) {
    const failures = collectAnalyzeDocSyncFailures(rootDir);
    if (failures.length > 0) {
      console.error('ERROR: analyze documentation blocks are out of sync');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exit(1);
    }

    console.log('Analyze documentation blocks are in sync');
    return;
  }

  const { changedFiles, failures } = syncAnalyzeDocs(rootDir);
  if (failures.length > 0) {
    console.error('ERROR: failed to sync analyze documentation blocks');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  if (changedFiles.length === 0) {
    console.log('Analyze documentation blocks already up to date');
    return;
  }

  console.log(`Synced analyze documentation blocks: ${changedFiles.join(', ')}`);
}

if (isCliEntrypoint()) {
  main(process.argv.slice(2));
}
