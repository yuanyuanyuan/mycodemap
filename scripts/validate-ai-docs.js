// [META] since:2026-03-22 | owner:docs-team | stable:true
// [WHY] 验证 AI 友好文档的完整性和合规性

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(__dirname, '..');
let rootDir = defaultRootDir;

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

// AI 文档清单
const requiredAIDocs = [
  { file: 'llms.txt', minLength: 50 },  // 标准 llms.txt 格式
  { file: 'AI_GUIDE.md', minLength: 100 },
  { file: 'AI_DISCOVERY.md', minLength: 100 },
  { file: 'ai-document-index.yaml', minLength: 50 },
  { file: 'docs/ai-guide/README.md', minLength: 50 },
  { file: 'docs/ai-guide/QUICKSTART.md', minLength: 50 },
  { file: 'docs/ai-guide/COMMANDS.md', minLength: 100 },
  { file: 'docs/ai-guide/OUTPUT.md', minLength: 100 },
  { file: 'docs/ai-guide/PATTERNS.md', minLength: 100 },
  { file: 'docs/ai-guide/PROMPTS.md', minLength: 100 },
  { file: 'docs/ai-guide/INTEGRATION.md', minLength: 100 },
];

// IDE 特定的可选文档
const optionalIDEFiles = [
  { file: '.cursorrules', description: 'Cursor IDE rules' },
  { file: '.github/copilot-instructions.md', description: 'GitHub Copilot instructions' },
];

// AI 友好性检查清单
// 注意：不是所有文档都需要所有检查项
const aiFriendlyChecks = [
  { pattern: /^##+\s+/m, name: '层级标题（##）', requiredFor: 'all' },
  { pattern: /\|.*\|.*\|/, name: '表格（速查表）', requiredFor: 'all' },
  { pattern: /```(bash|typescript|json|python)/, name: '可执行代码块', requiredFor: ['AI_GUIDE.md', 'QUICKSTART.md', 'COMMANDS.md', 'PATTERNS.md', 'PROMPTS.md', 'INTEGRATION.md'] },
  { pattern: /interface\s+\w+|type\s+\w+|function\s+\w+/, name: '代码定义', requiredFor: ['OUTPUT.md', 'PATTERNS.md', 'INTEGRATION.md'] },
  { pattern: /决策树|流程图|速查表|提示词|模板|模式|示例/, name: 'AI 友好关键词', requiredFor: 'all' },
];

function readText(filePath) {
  const absolutePath = path.join(rootDir, filePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, 'utf8');
}

function collectSnippetFailures(
  content,
  requiredSnippets,
  outdatedSnippets,
) {
  const snippetFailures = [];

  if (!content) {
    return snippetFailures;
  }

  for (const snippet of requiredSnippets) {
    if (!content.includes(snippet)) {
      snippetFailures.push(`missing required snippet: ${snippet}`);
    }
  }

  for (const snippet of outdatedSnippets) {
    if (content.includes(snippet)) {
      snippetFailures.push(`contains outdated snippet: ${snippet}`);
    }
  }

  return snippetFailures;
}

function checkRequiredDocs(failures) {
  console.log('Checking required AI documents...\n');
  
  for (const { file, minLength } of requiredAIDocs) {
    const content = readText(file);
    
    if (!content) {
      failures.push(`Missing required AI doc: ${file}`);
      continue;
    }
    
    const lines = content.split('\n').length;
    if (lines < minLength) {
      failures.push(`${file} is too short (${lines} lines, min ${minLength})`);
    }
    
    console.log(`  ✅ ${file} (${lines} lines)`);
  }
  
  // 检查可选 IDE 文件
  console.log('\nChecking optional IDE-specific files...\n');
  for (const { file, description } of optionalIDEFiles) {
    const content = readText(file);
    if (content) {
      const lines = content.split('\n').length;
      console.log(`  ✅ ${file} (${lines} lines) - ${description}`);
    } else {
      console.log(`  ⚠️  ${file} - ${description} (optional, not found)`);
    }
  }
}

function checkAIFriendliness(failures) {
  console.log('\nChecking AI friendliness...\n');
  
  const aiDocs = requiredAIDocs.map(d => d.file);
  
  for (const doc of aiDocs) {
    const content = readText(doc);
    if (!content) continue;
    
    const docName = path.basename(doc);
    const docFailures = [];
    
    // llms.txt 文件检查标准格式
    if (doc === 'llms.txt') {
      // 检查 llms.txt 标准结构 (支持中英文)
      const hasH1 = /^#\s+\w+/m.test(content);
      const hasSummary = /^>\s+/m.test(content);
      const hasDocsSection = /##\s*(?:文档|Docs|快速开始|Quick Start)/i.test(content);
      
      if (!hasH1) docFailures.push('missing H1 title (llms.txt standard)');
      if (!hasSummary) docFailures.push('missing blockquote summary (llms.txt standard)');
      if (!hasDocsSection) docFailures.push('missing ## Docs/文档 section (llms.txt standard)');
      
      if (docFailures.length > 0) {
        failures.push(`${doc}: ${docFailures.join(', ')}`);
        console.log(`  ❌ ${doc}`);
        docFailures.forEach(f => console.log(`      - ${f}`));
      } else {
        console.log(`  ✅ ${doc} (llms.txt standard format)`);
      }
      continue;
    }
    
    // YAML 文件有独立的检查标准
    if (doc.endsWith('.yaml') || doc.endsWith('.yml')) {
      // 检查 YAML 基本结构
      if (!content.includes('project:') || !content.includes('documentation:')) {
        docFailures.push('missing required YAML structure');
      }
      if (docFailures.length > 0) {
        failures.push(`${doc}: ${docFailures.join(', ')}`);
        console.log(`  ❌ ${doc}`);
        docFailures.forEach(f => console.log(`      - ${f}`));
      } else {
        console.log(`  ✅ ${doc} (YAML format)`);
      }
      continue;
    }
    
    for (const { pattern, name, requiredFor } of aiFriendlyChecks) {
      // 检查此文档是否需要此项
      const isRequired = requiredFor === 'all' || 
                        (Array.isArray(requiredFor) && requiredFor.includes(docName));
      
      if (!isRequired) continue;
      
      if (!pattern.test(content)) {
        docFailures.push(`missing ${name}`);
      }
    }
    
    if (docFailures.length > 0) {
      failures.push(`${doc}: ${docFailures.join(', ')}`);
      console.log(`  ❌ ${doc}`);
      docFailures.forEach(f => console.log(`      - ${f}`));
    } else {
      console.log(`  ✅ ${doc}`);
    }
  }
}

function checkCrossReferences(failures) {
  console.log('\nChecking cross-references...\n');
  
  // README.md 必须链接到 AI_GUIDE.md
  const readme = readText('README.md');
  if (readme) {
    if (!readme.includes('AI_GUIDE.md')) {
      failures.push('README.md must reference AI_GUIDE.md');
      console.log('  ❌ README.md missing AI_GUIDE.md link');
    } else {
      console.log('  ✅ README.md links to AI_GUIDE.md');
    }
  }
  
  // AGENTS.md 必须包含 AI 文档规范
  const agents = readText('AGENTS.md');
  if (agents) {
    if (!agents.includes('AI 友好')) {
      failures.push('AGENTS.md must contain AI-friendly doc requirements');
      console.log('  ❌ AGENTS.md missing AI-friendly requirements');
    } else {
      console.log('  ✅ AGENTS.md contains AI-friendly requirements');
    }
  }
  
  // CLAUDE.md 必须链接到 AI 文档
  const claude = readText('CLAUDE.md');
  if (claude) {
    if (!claude.includes('AI_GUIDE.md')) {
      failures.push('CLAUDE.md must reference AI docs');
      console.log('  ❌ CLAUDE.md missing AI docs references');
    } else {
      console.log('  ✅ CLAUDE.md links to AI docs');
    }
  }
  
  // AI_GUIDE.md 必须链接到 AI_DISCOVERY.md 和 ai-document-index.yaml
  const aiGuide = readText('AI_GUIDE.md');
  if (aiGuide) {
    if (!aiGuide.includes('AI_DISCOVERY.md')) {
      failures.push('AI_GUIDE.md must reference AI_DISCOVERY.md');
      console.log('  ❌ AI_GUIDE.md missing AI_DISCOVERY.md link');
    } else {
      console.log('  ✅ AI_GUIDE.md links to AI_DISCOVERY.md');
    }
    
    if (!aiGuide.includes('ai-document-index.yaml')) {
      failures.push('AI_GUIDE.md must reference ai-document-index.yaml');
      console.log('  ❌ AI_GUIDE.md missing ai-document-index.yaml link');
    } else {
      console.log('  ✅ AI_GUIDE.md links to ai-document-index.yaml');
    }
  }
  
  // llms.txt 必须链接到主要 AI 文档
  const llmsTxt = readText('llms.txt');
  if (llmsTxt) {
    const requiredLinks = ['AI_GUIDE.md', 'ai-document-index.yaml'];
    const missingLinks = requiredLinks.filter(link => !llmsTxt.includes(link));
    
    if (missingLinks.length > 0) {
      failures.push(`llms.txt must reference: ${missingLinks.join(', ')}`);
      console.log(`  ❌ llms.txt missing links: ${missingLinks.join(', ')}`);
    } else {
      console.log('  ✅ llms.txt links to AI_GUIDE.md and ai-document-index.yaml');
    }
  }
}

function checkPromptsLibrary(failures) {
  console.log('\nChecking prompts library...\n');
  
  const promptsFile = readText('docs/ai-guide/PROMPTS.md');
  if (!promptsFile) {
    failures.push('PROMPTS.md is required for AI prompts library');
    return;
  }
  
  // 检查是否包含常见的提示词模板
  const requiredPrompts = [
    { pattern: /项目理解|理解项目/, name: '项目理解模板' },
    { pattern: /变更影响|影响分析/, name: '变更影响分析模板' },
    { pattern: /代码搜索|查找.*代码/, name: '代码搜索模板' },
    { pattern: /重构|refactor/i, name: '重构评估模板' },
  ];
  
  for (const { pattern, name } of requiredPrompts) {
    if (!pattern.test(promptsFile)) {
      failures.push(`PROMPTS.md missing: ${name}`);
      console.log(`  ❌ Missing: ${name}`);
    } else {
      console.log(`  ✅ Has: ${name}`);
    }
  }
}

function checkDecisionTrees(failures) {
  console.log('\nChecking decision trees...\n');
  
  const quickstart = readText('docs/ai-guide/QUICKSTART.md');
  if (quickstart) {
    // 检查是否有决策树（流程图或层级结构）
    const hasDecisionTree = /开始.*\n.*↓\n|决策树|流程图/.test(quickstart);
    
    if (!hasDecisionTree) {
      failures.push('QUICKSTART.md must contain decision tree');
      console.log('  ❌ QUICKSTART.md missing decision tree');
    } else {
      console.log('  ✅ QUICKSTART.md has decision tree');
    }
  }
}

function checkAnalyzeContractConsistency(failures) {
  console.log('\nChecking analyze public contract consistency...\n');

  const outdatedIntents = ['overview', 'impact', 'dependency', 'search', 'complexity', 'refactor'];
  const outdatedAnalyzeRegex = new RegExp(`analyze.*-i.*\\b(${outdatedIntents.join('|')})\\b`);

  for (const { file } of requiredAIDocs) {
    const content = readText(file);
    if (!content) {
      continue;
    }

    const offendingLines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (!line.includes('analyze') || !line.includes('-i')) {
          return false;
        }

        return outdatedAnalyzeRegex.test(line);
      });

    if (offendingLines.length > 0) {
      const uniqueMatches = [...new Set(offendingLines)];
      failures.push(`${file} contains outdated analyze intents: ${uniqueMatches.join(' | ')}`);
      console.log(`  ❌ ${file}`);
      uniqueMatches.forEach(match => console.log(`      - outdated: ${match}`));
      continue;
    }

    console.log(`  ✅ ${file}`);
  }
}

function checkPhase25DogfoodContractConsistency(failures) {
  console.log('\nChecking Phase 25 dogfood contract consistency...\n');

  const phase25Checks = [
    {
      file: 'AI_GUIDE.md',
      requiredSnippets: [
        'query -S "XXX" -j',
        'partialFailure',
        '`rtk` 不是 CodeMap 产品功能',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/COMMANDS.md',
      requiredSnippets: [
        'mycodemap analyze -i find -k "SourceLocation" --json --structured',
        'mycodemap complexity -f "src/cli/index.ts" -j',
        'mycodemap ci assess-risk --files "changed.ts" --json',
        'mycodemap workflow start "inspect analyze find" --json',
        'JSON 默认包含 `passed` 与 `summary`',
        '`workflow` 只保留 `find → read → link → show` 四个分析阶段',
      ],
      outdatedSnippets: [
        '`workflow` 同时包含 analyze、实现、CI、ship 等多个阶段',
      ],
    },
    {
      file: 'docs/ai-guide/OUTPUT.md',
      requiredSnippets: [
        'interface AnalyzeDiagnostics',
        '"partialFailure"',
        'diagnostics.status = "success"',
        'diagnostics.status = "failure"',
      ],
      outdatedSnippets: [],
    },
  ];

  for (const { file, requiredSnippets, outdatedSnippets } of phase25Checks) {
    const content = readText(file);
    if (!content) {
      continue;
    }

    const docFailures = collectSnippetFailures(content, requiredSnippets, outdatedSnippets);
    if (docFailures.length > 0) {
      failures.push(`${file}: ${docFailures.join(', ')}`);
      console.log(`  ❌ ${file}`);
      for (const docFailure of docFailures) {
        console.log(`      - ${docFailure}`);
      }
      continue;
    }

    console.log(`  ✅ ${file}`);
  }
}

function checkStorageContractConsistency(failures) {
  console.log('\nChecking storage contract consistency...\n');

  const storageDocChecks = [
    {
      file: 'AI_GUIDE.md',
      requiredSnippets: [
        '`storage.type = "auto"` 当前优先选择 `sqlite`；若运行时缺少 `better-sqlite3` 或 Node.js `<20` 导致 SQLite 不可用，则 warning 后回退到 `filesystem`。'
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/COMMANDS.md',
      requiredSnippets: [
        '- `storage.type` 支持 `filesystem`、`sqlite`、`memory`、`auto`；默认是 `filesystem`。',
        '- 旧的 `neo4j` / `kuzudb` 配置会直接报迁移错误；显式选择 `sqlite` 但运行时缺少 `better-sqlite3` 或 Node.js `<20` 时也会直接报错，不会静默 fallback 到 `filesystem`。',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/PATTERNS.md',
      requiredSnippets: [
        '- 旧的 `neo4j` / `kuzudb` 配置现在应该直接报迁移错误；显式 `sqlite` 但运行时不满足条件时也应看到显式错误，而不是静默 fallback。',
        '- `storage.type = "auto"` 当前优先落到 `sqlite`；只有 SQLite 不可用时才回退 `filesystem`，不要把阈值字段误读成更复杂的调度器。',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/INTEGRATION.md',
      requiredSnippets: [
        '`UNSUPPORTED_STORAGE_TYPE` / `STORAGE_BACKEND_MIGRATED` / `SQLITE_NOT_AVAILABLE`',
        '`better-sqlite3`',
        'Node.js `>=20`',
        'SQLite 不可用时会 warning 后回退 `filesystem`',
      ],
      outdatedSnippets: [
        'KUZU_INIT_FAILED',
        '安装 `kuzu`',
      ],
    },
  ];

  for (const { file, requiredSnippets, outdatedSnippets } of storageDocChecks) {
    const content = readText(file);
    if (!content) {
      continue;
    }

    const docFailures = collectSnippetFailures(content, requiredSnippets, outdatedSnippets);
    if (docFailures.length > 0) {
      failures.push(`${file}: ${docFailures.join(', ')}`);
      console.log(`  ❌ ${file}`);
      for (const docFailure of docFailures) {
        console.log(`      - ${docFailure}`);
      }
      continue;
    }

    console.log(`  ✅ ${file}`);
  }
}

function checkHistoryRiskContractConsistency(failures) {
  console.log('\nChecking history risk contract consistency...\n');

  const historyRiskChecks = [
    {
      file: 'AI_GUIDE.md',
      requiredSnippets: [
        '`history --symbol <name>`',
        '`check` / `ci assess-risk` / `history` 现在共用同一套 Git history risk truth；history unavailable 时会显式给出 `unavailable` / `confidence=low`',
        'interface HistoryCommandResult {',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/COMMANDS.md',
      requiredSnippets: [
        '## history - 符号级 Git history / risk 查询',
        '`ci assess-risk` 现在输出 `status / confidence / freshness / source / score / level`',
        'history 不可用，会显式给出 `unavailable` / warning',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/OUTPUT.md',
      requiredSnippets: [
        'interface HistoryCommandResult {',
        '"git-history-unsupported-intent"',
        'Git history risk 是 additive enrichment：它补充 `history` 与 `violations[].risk`',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/PATTERNS.md',
      requiredSnippets: [
        'node dist/cli/index.js history --symbol createCheckCommand',
        '`ci assess-risk`、`check`、`history` 共用同一套 Git history risk truth',
      ],
      outdatedSnippets: [],
    },
  ];

  for (const { file, requiredSnippets, outdatedSnippets } of historyRiskChecks) {
    const content = readText(file);
    if (!content) {
      continue;
    }

    const docFailures = collectSnippetFailures(content, requiredSnippets, outdatedSnippets);
    if (docFailures.length > 0) {
      failures.push(`${file}: ${docFailures.join(', ')}`);
      console.log(`  ❌ ${file}`);
      for (const docFailure of docFailures) {
        console.log(`      - ${docFailure}`);
      }
      continue;
    }

    console.log(`  ✅ ${file}`);
  }
}

function checkContractGateAnnotationConsistency(failures) {
  console.log('\nChecking contract gate annotation consistency...\n');

  const contractGateChecks = [
    {
      file: 'AI_GUIDE.md',
      requiredSnippets: [
        '--annotation-format github',
        'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10',
        'changed files <= 10',
        'warn-only / fallback',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/COMMANDS.md',
      requiredSnippets: [
        '--annotation-format github',
        '--annotation-format gitlab --annotation-file gl-code-quality-report.json',
        'changed files <= 10',
        'false-positive rate >10%',
        'warn-only / fallback',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/OUTPUT.md',
      requiredSnippets: [
        'details?: Record<string, string | number | boolean | null>;',
        'diagnostic?: {',
        'scope: "line" | "file" | "general";',
        'Annotation-friendly diagnostics',
        'gl-code-quality-report.json',
        'warn-only / fallback',
      ],
      outdatedSnippets: [],
    },
    {
      file: 'docs/ai-guide/PATTERNS.md',
      requiredSnippets: [
        'node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10',
        '--annotation-format github',
        '--annotation-format gitlab --annotation-file gl-code-quality-report.json',
        'changed files <= 10',
        'warn-only / fallback',
      ],
      outdatedSnippets: [],
    },
  ];

  for (const { file, requiredSnippets, outdatedSnippets } of contractGateChecks) {
    const content = readText(file);
    if (!content) {
      continue;
    }

    const docFailures = collectSnippetFailures(content, requiredSnippets, outdatedSnippets);
    if (docFailures.length > 0) {
      failures.push(`${file}: ${docFailures.join(', ')}`);
      console.log(`  ❌ ${file}`);
      for (const docFailure of docFailures) {
        console.log(`      - ${docFailure}`);
      }
      continue;
    }

    console.log(`  ✅ ${file}`);
  }
}

function validateAIDocs() {
  console.log('========================================');
  console.log('AI Documentation Guardrails Check');
  console.log('========================================\n');
  
  const failures = [];
  
  checkRequiredDocs(failures);
  checkAIFriendliness(failures);
  checkCrossReferences(failures);
  checkPromptsLibrary(failures);
  checkDecisionTrees(failures);
  checkAnalyzeContractConsistency(failures);
  checkPhase25DogfoodContractConsistency(failures);
  checkStorageContractConsistency(failures);
  checkHistoryRiskContractConsistency(failures);
  checkContractGateAnnotationConsistency(failures);
  
  console.log('\n========================================');
  
  if (failures.length > 0) {
    console.error('\n❌ AI documentation guardrails failed:\n');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.log('\n========================================');
    process.exit(1);
  }
  
  console.log('\n✅ All AI documentation guardrails passed!\n');
  console.log('========================================');
}

rootDir = parseRootDir(process.argv.slice(2));
validateAIDocs();
