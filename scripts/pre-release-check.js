// [META] since:2026-03-22 | owner:release-team | stable:true
// [WHY] 发布前全面检查 - 基于 AI_FRIENDLINESS_AUDIT.md 的强制护栏
// 确保每次发布都符合 AI 友好文档的行业标准

import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 颜色输出
const colors = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const { red, green, yellow, blue, bold } = colors;

// ============================================
// 检查配置
// ============================================

const MAX_FILE_SIZE_KB = 50; // 单个AI文档最大50KB
const MAX_TOTAL_AI_DOCS_KB = 500; // 所有AI文档总计最大500KB
const MAX_LLMSTXT_TOKEN_ESTIMATE = 5000; // llms.txt 估算token限制

const requiredAIDocs = [
  { file: 'llms.txt', required: true, minSize: 100, maxSize: 10000 },
  { file: 'AI_GUIDE.md', required: true, minSize: 1000, maxSize: 50000 },
  { file: 'AI_DISCOVERY.md', required: true, minSize: 1000, maxSize: 50000 },
  { file: 'ai-document-index.yaml', required: true, minSize: 500, maxSize: 50000 },
  { file: 'docs/ai-guide/README.md', required: true, minSize: 500, maxSize: 30000 },
  { file: 'docs/ai-guide/QUICKSTART.md', required: true, minSize: 1000, maxSize: 50000 },
  { file: 'docs/ai-guide/COMMANDS.md', required: true, minSize: 2000, maxSize: 100000 },
  { file: 'docs/ai-guide/OUTPUT.md', required: true, minSize: 2000, maxSize: 100000 },
  { file: 'docs/ai-guide/PATTERNS.md', required: true, minSize: 2000, maxSize: 100000 },
  { file: 'docs/ai-guide/PROMPTS.md', required: true, minSize: 2000, maxSize: 100000 },
  { file: 'docs/ai-guide/INTEGRATION.md', required: true, minSize: 2000, maxSize: 150000 },
];

// 版本必须一致的文件
const versionFiles = [
  { file: 'package.json', extractor: (c) => JSON.parse(c).version },
  { file: 'llms.txt', extractor: extractVersionFromText },
  { file: 'ai-document-index.yaml', extractor: extractVersionFromYAML },
  { file: 'AI_GUIDE.md', extractor: extractVersionFromText },
  { file: 'AI_DISCOVERY.md', extractor: extractVersionFromText },
];

// 必需的发布相关文件检查
const releaseRequirements = {
  changelog: { file: 'CHANGELOG.md', required: true },
  license: { file: 'LICENSE', required: true },
  readme: { file: 'README.md', required: true },
};

// 必须存在的交叉引用
const requiredCrossRefs = [
  { from: 'llms.txt', mustReference: ['AI_GUIDE.md', 'ai-document-index.yaml'] },
  { from: 'AI_GUIDE.md', mustReference: ['AI_DISCOVERY.md', 'ai-document-index.yaml', 'docs/ai-guide/'] },
  { from: 'README.md', mustReference: ['AI_GUIDE.md'] },
  { from: 'AGENTS.md', mustReference: ['AI 友好'] },
  { from: 'CLAUDE.md', mustReference: ['AI_GUIDE.md', 'docs/ai-guide/'] },
];

// llms.txt 标准要求 (基于 llmstxt.org)
const llmsTxtStandards = {
  mustHaveH1: /^#\s+\w+/m,
  mustHaveSummary: /^>\s+/m,
  mustHaveDocsSection: /##\s*(?:文档|Docs|快速开始|Quick Start)/i,
  mustHaveLinks: /\[.+\]\(.+\)/,
  recommendedSections: ['快速开始', '完整文档', 'Full Documentation', '可选', 'Optional'],
};

// ============================================
// 工具函数
// ============================================

function readText(filePath) {
  const absolutePath = path.join(rootDir, filePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, 'utf8');
}

function getFileSize(filePath) {
  const absolutePath = path.join(rootDir, filePath);
  if (!existsSync(absolutePath)) return 0;
  return statSync(absolutePath).size;
}

function extractVersionFromText(content) {
  const patterns = [
    /(?:version|版本)[:\s]+v?(\d+\.\d+\.\d+(?:-[\w.]+)?)/i,
    /"version"\s*:\s*"(\d+\.\d+\.\d+(?:-[\w.]+)?)"/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractVersionFromYAML(content) {
  // 匹配 YAML 中的 version: "x.x.x" 或 version: x.x.x
  const match = content.match(/version[:\s]+["']?(\d+\.\d+\.\d+)["']?/i);
  return match ? match[1] : null;
}

function estimateTokens(text) {
  // 简化的token估算：英文单词 + 中文字符
  const englishWords = (text.match(/\b\w+\b/g) || []).length;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return Math.ceil(englishWords * 1.3 + chineseChars * 2);
}

// ============================================
// 检查项
// ============================================

async function checkRequiredFiles(failures) {
  console.log(blue('\n📁 1. AI文档完整性检查\n'));
  
  let totalSize = 0;
  
  for (const { file, required, minSize, maxSize } of requiredAIDocs) {
    const content = readText(file);
    const size = getFileSize(file);
    totalSize += size;
    
    if (!content) {
      if (required) {
        failures.push({
          type: 'missing_required_file',
          file,
          message: `缺少必需的AI文档: ${file}`,
        });
        console.log(red(`  ❌ ${file} - 文件不存在`));
      } else {
        console.log(yellow(`  ⚠️  ${file} - 可选文件不存在`));
      }
      continue;
    }
    
    if (size < minSize) {
      failures.push({
        type: 'file_too_small',
        file,
        message: `${file} 太小 (${size} bytes, 最小要求 ${minSize})`,
      });
      console.log(red(`  ❌ ${file} - 文件太小 (${size} bytes)`));
    } else if (size > maxSize) {
      failures.push({
        type: 'file_too_large',
        file,
        message: `${file} 太大 (${Math.round(size/1024)}KB, 最大允许 ${Math.round(maxSize/1024)}KB)`,
      });
      console.log(red(`  ❌ ${file} - 文件太大 (${Math.round(size/1024)}KB)`));
    } else {
      console.log(green(`  ✅ ${file} (${Math.round(size/1024)}KB)`));
    }
  }
  
  // 总大小检查
  const totalSizeKB = Math.round(totalSize / 1024);
  if (totalSizeKB > MAX_TOTAL_AI_DOCS_KB) {
    failures.push({
      type: 'total_size_exceeded',
      message: `AI文档总大小 ${totalSizeKB}KB 超过限制 ${MAX_TOTAL_AI_DOCS_KB}KB`,
    });
    console.log(red(`\n  ❌ 总大小: ${totalSizeKB}KB (限制: ${MAX_TOTAL_AI_DOCS_KB}KB)`));
  } else {
    console.log(green(`\n  ✅ 总大小: ${totalSizeKB}KB (限制: ${MAX_TOTAL_AI_DOCS_KB}KB)`));
  }
}

async function checkLlmsTxtStandards(failures) {
  console.log(blue('\n📋 2. llms.txt 标准格式检查\n'));
  
  const content = readText('llms.txt');
  if (!content) {
    failures.push({
      type: 'missing_llms_txt',
      message: '缺少 llms.txt 文件 (llmstxt.org 标准要求)',
    });
    console.log(red('  ❌ llms.txt 不存在'));
    return;
  }
  
  const checks = [
    { name: 'H1标题', test: llmsTxtStandards.mustHaveH1, required: true },
    { name: '摘要引用', test: llmsTxtStandards.mustHaveSummary, required: true },
    { name: '文档章节', test: llmsTxtStandards.mustHaveDocsSection, required: true },
    { name: '链接格式', test: llmsTxtStandards.mustHaveLinks, required: true },
  ];
  
  for (const { name, test, required } of checks) {
    if (test.test(content)) {
      console.log(green(`  ✅ ${name}`));
    } else if (required) {
      failures.push({
        type: 'llms_txt_standard_violation',
        file: 'llms.txt',
        message: `llms.txt 缺少必需的 ${name}`,
      });
      console.log(red(`  ❌ ${name} (必需)`));
    } else {
      console.log(yellow(`  ⚠️  ${name} (建议)`));
    }
  }
  
  // Token效率检查
  const tokens = estimateTokens(content);
  if (tokens > MAX_LLMSTXT_TOKEN_ESTIMATE) {
    failures.push({
      type: 'llms_txt_token_limit',
      file: 'llms.txt',
      message: `llms.txt 估算 token 数 ${tokens} 超过限制 ${MAX_LLMSTXT_TOKEN_ESTIMATE}`,
    });
    console.log(red(`  ❌ Token估算: ${tokens} (限制: ${MAX_LLMSTXT_TOKEN_ESTIMATE})`));
  } else {
    console.log(green(`  ✅ Token估算: ${tokens} (限制: ${MAX_LLMSTXT_TOKEN_ESTIMATE})`));
  }
}

async function checkVersionConsistency(failures) {
  console.log(blue('\n🔢 3. 版本一致性检查\n'));
  
  const versions = {};
  
  for (const { file, extractor } of versionFiles) {
    const content = readText(file);
    if (!content) {
      console.log(yellow(`  ⚠️  ${file} - 文件不存在`));
      continue;
    }
    
    const version = extractor(content);
    if (version) {
      versions[file] = version;
      console.log(`  📄 ${file}: v${version}`);
    } else {
      failures.push({
        type: 'missing_version_in_file',
        file,
        message: `${file} 中未找到可解析的版本号`,
      });
      console.log(yellow(`  ⚠️  ${file}: 未找到版本号`));
    }
  }
  
  const uniqueVersions = [...new Set(Object.values(versions))];
  if (uniqueVersions.length === 0) {
    failures.push({
      type: 'no_version_found',
      message: '未在任何文件中找到版本号',
    });
    console.log(red('\n  ❌ 未找到任何版本号'));
  } else if (uniqueVersions.length > 1) {
    failures.push({
      type: 'version_mismatch',
      message: `版本号不一致: ${uniqueVersions.join(', ')}`,
      details: versions,
    });
    console.log(red(`\n  ❌ 版本号不一致: ${uniqueVersions.join(', ')}`));
    console.log(red(`     请确保所有文件版本号一致`));
  } else {
    console.log(green(`\n  ✅ 所有文件版本一致: v${uniqueVersions[0]}`));
  }
  
  // 语义版本格式检查
  const pkgVersion = versions['package.json'];
  if (pkgVersion && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(pkgVersion)) {
    failures.push({
      type: 'invalid_semver',
      message: `package.json 版本号 "${pkgVersion}" 不符合语义化版本规范`,
    });
    console.log(red(`  ❌ 版本号格式无效: ${pkgVersion}`));
  }
}

async function checkCrossReferences(failures) {
  console.log(blue('\n🔗 4. 交叉引用有效性检查\n'));
  
  for (const { from, mustReference } of requiredCrossRefs) {
    const content = readText(from);
    if (!content) {
      console.log(yellow(`  ⚠️  ${from} - 文件不存在，跳过引用检查`));
      continue;
    }
    
    const missing = mustReference.filter(ref => !content.includes(ref));
    if (missing.length > 0) {
      failures.push({
        type: 'missing_cross_reference',
        file: from,
        message: `${from} 缺少必需引用: ${missing.join(', ')}`,
      });
      console.log(red(`  ❌ ${from} - 缺少: ${missing.join(', ')}`));
    } else {
      console.log(green(`  ✅ ${from} - 所有必需引用存在`));
    }
  }
  
  // 验证链接目标文件存在
  console.log(blue('\n  验证链接目标文件存在性:\n'));
  
  const allContent = requiredAIDocs.map(d => readText(d.file)).filter(Boolean).join('\n');
  const linkPattern = /\[.*?\]\((.*?)\)/g;
  const links = [];
  let match;
  
  while ((match = linkPattern.exec(allContent)) !== null) {
    const link = match[1];
    // 只检查相对路径的本地文件
    if (!link.startsWith('http') && !link.startsWith('#')) {
      links.push(link.replace(/^\.\//, '').split('#')[0]);
    }
  }
  
  const uniqueLinks = [...new Set(links)];
  let brokenLinks = 0;
  
  for (const link of uniqueLinks.slice(0, 30)) { // 限制检查数量
    // 跳过锚点链接和特殊路径
    if (link.includes('#') || link === 'LICENSE' || link === 'CHANGELOG.md') {
      continue;
    }
    
    const linkPath = path.join(rootDir, link);
    if (!existsSync(linkPath)) {
      // 可能是目录
      if (!existsSync(path.join(linkPath, 'README.md'))) {
        console.log(yellow(`    ⚠️  可能损坏的链接: ${link}`));
        brokenLinks++;
      }
    }
  }
  
  if (brokenLinks === 0) {
    console.log(green(`  ✅ 所有检查的内部链接有效`));
  } else {
    console.log(yellow(`  ⚠️  发现 ${brokenLinks} 个可能损坏的链接`));
  }
}

async function checkAIFriendliness(failures) {
  console.log(blue('\n🤖 5. AI友好性检查\n'));
  
  const aiGuide = readText('AI_GUIDE.md');
  if (!aiGuide) {
    console.log(red('  ❌ AI_GUIDE.md 不存在'));
    return;
  }
  
  const checks = [
    { name: '层级标题 (##)', pattern: /^##+\s+/m },
    { name: '表格 (速查表)', pattern: /\|.*\|.*\|/ },
    { name: '代码块', pattern: /```(?:bash|typescript|json)/ },
    { name: 'TypeScript接口', pattern: /interface\s+\w+/ },
    { name: '决策树/流程图', pattern: /决策树|流程图|```mermaid/ },
    { name: '提示词模板', pattern: /提示词|模板|prompt/i },
  ];
  
  for (const { name, pattern } of checks) {
    if (pattern.test(aiGuide)) {
      console.log(green(`  ✅ ${name}`));
    } else {
      console.log(yellow(`  ⚠️  ${name} (建议添加)`));
    }
  }
}

async function checkChangelogSync(failures) {
  console.log(blue('\n📝 6. CHANGELOG同步检查\n'));
  
  const changelog = readText('CHANGELOG.md');
  const pkg = readText('package.json');
  
  if (!changelog) {
    failures.push({
      type: 'missing_changelog',
      message: '缺少 CHANGELOG.md',
    });
    console.log(red('  ❌ CHANGELOG.md 不存在'));
    return;
  }
  
  if (!pkg) {
    console.log(red('  ❌ package.json 不存在'));
    return;
  }
  
  const pkgVersion = JSON.parse(pkg).version;
  
  // 检查CHANGELOG中是否有当前版本
  const versionHeader = new RegExp(`##?\\s*\\[?${pkgVersion}\\]?`, 'i');
  if (versionHeader.test(changelog)) {
    console.log(green(`  ✅ CHANGELOG 包含当前版本 v${pkgVersion}`));
  } else {
    failures.push({
      type: 'changelog_not_synced',
      message: `CHANGELOG.md 缺少当前版本 v${pkgVersion} 的条目`,
    });
    console.log(red(`  ❌ CHANGELOG 缺少 v${pkgVersion} 条目`));
  }
  
  // 检查CHANGELOG是否包含AI文档更新记录
  const hasAIDocsMention = /AI.*文档|llms\.txt|AI_GUIDE/i.test(changelog);
  if (hasAIDocsMention) {
    console.log(green(`  ✅ CHANGELOG 包含AI文档相关记录`));
  } else {
    console.log(yellow(`  ⚠️  CHANGELOG 未提及AI文档更新 (建议)`));
  }
}

async function checkYamlIndex(failures) {
  console.log(blue('\n📊 7. YAML索引有效性检查\n'));
  
  const content = readText('ai-document-index.yaml');
  if (!content) {
    console.log(red('  ❌ ai-document-index.yaml 不存在'));
    return;
  }
  
  const checks = [
    { name: 'project 字段', pattern: /^project:/m },
    { name: 'version 字段', pattern: /^\s+version:/m },
    { name: 'documentation 字段', pattern: /^documentation:/m },
    { name: 'ai_documents 列表', pattern: /ai_documents:/ },
    { name: 'cli_commands 索引', pattern: /cli_commands:/ },
    { name: 'navigation 配置', pattern: /navigation:/ },
  ];
  
  for (const { name, pattern } of checks) {
    if (pattern.test(content)) {
      console.log(green(`  ✅ ${name}`));
    } else {
      failures.push({
        type: 'yaml_structure_missing',
        file: 'ai-document-index.yaml',
        message: `缺少 ${name}`,
      });
      console.log(red(`  ❌ ${name}`));
    }
  }
  
  // 检查引用的文件是否都存在
  console.log(blue('\n  验证YAML中引用的文件:\n'));
  const docMatches = content.matchAll(/path:\s*["']?([^"'\n]+)["']?/g);
  const paths = [...docMatches]
    .map(m => m[1])
    .filter(p => !p.startsWith('http'))
    .map(p => p.split('#')[0]); // 移除锚点
  
  let missingFiles = 0;
  for (const p of paths) {
    if (!existsSync(path.join(rootDir, p))) {
      console.log(red(`    ❌ 文件不存在: ${p}`));
      missingFiles++;
    }
  }
  
  if (missingFiles === 0) {
    console.log(green(`  ✅ 所有引用的文件存在 (${paths.length} 个)`));
  } else {
    failures.push({
      type: 'yaml_missing_files',
      message: `YAML索引引用了 ${missingFiles} 个不存在的文件`,
    });
  }
}

async function checkDocumentationStandards(failures) {
  console.log(blue('\n📚 8. AGENTS.md 文档规范检查\n'));
  
  const agents = readText('AGENTS.md');
  if (!agents) {
    console.log(red('  ❌ AGENTS.md 不存在'));
    return;
  }
  
  const requiredSections = [
    { name: 'AI友好文档规范', pattern: /AI.*友好.*文档|AI.*文档.*规范/i },
    { name: '结构清晰要求', pattern: /结构清晰|层级标题/i },
    { name: '决策树要求', pattern: /决策树|流程图/i },
    { name: '速查表要求', pattern: /速查表|表格/i },
    { name: '代码可复现要求', pattern: /代码.*复现|可执行.*代码/i },
    { name: '类型定义要求', pattern: /类型定义|TypeScript.*接口/i },
    { name: '提示词模板要求', pattern: /提示词|模板/i },
  ];
  
  for (const { name, pattern } of requiredSections) {
    if (pattern.test(agents)) {
      console.log(green(`  ✅ ${name}`));
    } else {
      failures.push({
        type: 'agents_requirement_missing',
        message: `AGENTS.md 缺少 ${name}`,
      });
      console.log(red(`  ❌ ${name}`));
    }
  }
}

async function checkReleaseFiles(failures) {
  console.log(blue('\n📦 9. 发布必需文件检查\n'));
  
  for (const [key, { file, required }] of Object.entries(releaseRequirements)) {
    const content = readText(file);
    
    if (!content) {
      if (required) {
        failures.push({
          type: 'missing_release_file',
          file,
          message: `缺少发布必需文件: ${file}`,
        });
        console.log(red(`  ❌ ${file} (必需)`));
      } else {
        console.log(yellow(`  ⚠️  ${file} (建议)`));
      }
    } else {
      const size = getFileSize(file);
      console.log(green(`  ✅ ${file} (${Math.round(size/1024)}KB)`));
    }
  }
}

async function checkGitTag(failures) {
  console.log(blue('\n🏷️  10. Git Tag 一致性检查\n'));
  
  // 获取 package.json 版本
  const pkg = readText('package.json');
  if (!pkg) {
    console.log(red('  ❌ package.json 不存在'));
    return;
  }
  
  const pkgVersion = JSON.parse(pkg).version;
  const expectedTag = `v${pkgVersion}`;
  
  console.log(`  📦 package.json 版本: v${pkgVersion}`);
  console.log(`  🏷️  期望的 tag: ${expectedTag}`);
  
  // 检查本地 tag 是否存在
  try {
    const { execSync } = await import('node:child_process');
    
    // 检查本地 tag
    try {
      const localTag = execSync(`git tag -l "${expectedTag}"`, { encoding: 'utf8', cwd: rootDir }).trim();
      if (localTag === expectedTag) {
        console.log(green(`  ✅ 本地 tag ${expectedTag} 已存在`));
        
        // 检查 tag 是否指向当前 commit
        const tagCommit = execSync(`git rev-list -n1 "${expectedTag}"`, { encoding: 'utf8', cwd: rootDir }).trim();
        const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: rootDir }).trim();
        
        if (tagCommit === currentCommit) {
          console.log(green(`  ✅ Tag 指向当前 commit`));
        } else {
          console.log(yellow(`  ⚠️  Tag 指向不同 commit`));
          console.log(yellow(`     Tag commit: ${tagCommit.substring(0, 8)}`));
          console.log(yellow(`     Current:    ${currentCommit.substring(0, 8)}`));
        }
      } else {
        console.log(yellow(`  ⚠️  本地 tag ${expectedTag} 不存在`));
        console.log(yellow(`     运行: git tag -a "${expectedTag}" -m "Release ${expectedTag}"`));
      }
    } catch (e) {
      console.log(yellow(`  ⚠️  无法检查本地 tag`));
    }
    
    // 检查远程 tag
    try {
      const remoteTag = execSync(`git ls-remote --tags origin "refs/tags/${expectedTag}"`, { encoding: 'utf8', cwd: rootDir }).trim();
      if (remoteTag.includes(expectedTag)) {
        console.log(green(`  ✅ 远程 tag ${expectedTag} 已存在`));
      } else {
        console.log(yellow(`  ⚠️  远程 tag ${expectedTag} 不存在`));
        console.log(yellow(`     推送命令: git push origin "${expectedTag}"`));
      }
    } catch (e) {
      console.log(yellow(`  ⚠️  无法检查远程 tag (可能没有远程仓库)`));
    }
    
    // 检查 GitHub Release (如果配置了 gh CLI)
    try {
      const ghCheck = execSync('which gh', { encoding: 'utf8', stdio: 'pipe' });
      if (ghCheck) {
        try {
          const releaseInfo = execSync(`gh release view "${expectedTag}" 2>&1`, { encoding: 'utf8', cwd: rootDir, stdio: 'pipe' });
          if (releaseInfo.includes(expectedTag)) {
            console.log(green(`  ✅ GitHub Release ${expectedTag} 已存在`));
          }
        } catch (e) {
          console.log(yellow(`  ⚠️  GitHub Release ${expectedTag} 不存在`));
          console.log(yellow(`     将在 tag 推送后自动创建`));
        }
      }
    } catch (e) {
      // gh CLI 未安装，跳过
    }
    
  } catch (error) {
    console.log(yellow(`  ⚠️  Git 检查失败: ${error.message}`));
  }
  
  // 检查当前分支
  try {
    const { execSync } = await import('node:child_process');
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8', cwd: rootDir }).trim();
    console.log(`  🌿 当前分支: ${currentBranch}`);
    
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      console.log(yellow(`  ⚠️  不在 main/master 分支，建议切换到 main 分支发布`));
    } else {
      console.log(green(`  ✅ 在 ${currentBranch} 分支`));
    }
  } catch (e) {
    // 忽略
  }
}

// ============================================
// 主函数
// ============================================

async function runPreReleaseChecks() {
  console.log(bold('╔════════════════════════════════════════════════════════════╗'));
  console.log(bold('║     发布前检查 - AI友好文档护栏 (基于审计报告)             ║'));
  console.log(bold('╚════════════════════════════════════════════════════════════╝'));
  
  const failures = [];
  const startTime = Date.now();
  
  try {
    await checkRequiredFiles(failures);
    await checkLlmsTxtStandards(failures);
    await checkVersionConsistency(failures);
    await checkCrossReferences(failures);
    await checkAIFriendliness(failures);
    await checkChangelogSync(failures);
    await checkYamlIndex(failures);
    await checkDocumentationStandards(failures);
    await checkReleaseFiles(failures);
    await checkGitTag(failures);
  } catch (error) {
    console.error(red(`\n检查过程中发生错误: ${error.message}`));
    process.exit(1);
  }
  
  const duration = Date.now() - startTime;
  
  // 结果汇总
  console.log(bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(bold('║                      检查结果汇总                          ║'));
  console.log(bold('╚════════════════════════════════════════════════════════════╝'));
  
  const criticalFailures = failures.filter(f => 
    f.type === 'missing_required_file' ||
    f.type === 'missing_llms_txt' ||
    f.type === 'version_mismatch' ||
    f.type === 'missing_version_in_file' ||
    f.type === 'invalid_semver' ||
    f.type === 'llms_txt_standard_violation' ||
    f.type === 'changelog_not_synced' ||
    f.type === 'missing_release_file'
  );
  
  const warnings = failures.filter(f => 
    !criticalFailures.includes(f)
  );
  
  console.log(`\n⏱️  耗时: ${duration}ms`);
  console.log(`📝 总检查项: 10`);
  console.log(`❌ 关键错误: ${criticalFailures.length}`);
  console.log(`⚠️  警告: ${warnings.length}`);
  
  if (criticalFailures.length > 0) {
    console.log(red('\n🚫 关键错误 (阻止发布):\n'));
    criticalFailures.forEach((f, i) => {
      console.log(red(`  ${i + 1}. [${f.type}] ${f.message}`));
    });
  }
  
  if (warnings.length > 0) {
    console.log(yellow('\n⚠️  警告 (建议修复):\n'));
    warnings.forEach((f, i) => {
      console.log(yellow(`  ${i + 1}. [${f.type}] ${f.message}`));
    });
  }
  
  // 发布指南
  console.log(bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(bold('║                     发布流程指南                           ║'));
  console.log(bold('╚════════════════════════════════════════════════════════════╝'));
  
  const pkg = readText('package.json');
  if (pkg) {
    const pkgVersion = JSON.parse(pkg).version;
    console.log(`\n当前版本: v${pkgVersion}`);
    console.log('\n📋 发布步骤:');
    console.log('  1. npm run docs:check:pre-release  # 运行此检查');
    console.log('  2. ./scripts/release.sh patch|minor|major  # 或指定版本');
    console.log('  3. git push origin main --tags  # 推送 tag');
    console.log('  4. GitHub Actions 自动: 构建 → 测试 → 发布 → 创建 Release');
    console.log('\n🔗 相关链接:');
    console.log(`  - GitHub Actions: https://github.com/mycodemap/mycodemap/actions`);
    console.log(`  - NPM 包: https://www.npmjs.com/package/@mycodemap/mycodemap`);
  }
  
  console.log(bold('\n╔════════════════════════════════════════════════════════════╗'));
  
  if (criticalFailures.length === 0) {
    console.log(green('║  ✅ 所有关键检查通过 - 可以安全发布!                      ║'));
    console.log(bold('╚════════════════════════════════════════════════════════════╝'));
    process.exit(0);
  } else {
    console.log(red('║  ❌ 存在关键错误 - 请修复后再发布!                        ║'));
    console.log(bold('╚════════════════════════════════════════════════════════════╝'));
    process.exit(1);
  }
}

runPreReleaseChecks();
