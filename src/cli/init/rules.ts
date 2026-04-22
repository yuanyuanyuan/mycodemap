// [META] since:2026-04-21 | owner:cli-team | stable:false
// [WHY] 为 init 提供内置 rules bundle 生成、drift 检测和 AI context snippet 状态

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { InitAsset } from './reconciler.js';
import { buildRulesSnippet, getBuiltInRuleTemplates, getRulesBundleVersion } from './rule-templates.js';

interface FileWriteAction {
  targetPath: string;
  content: string;
}

export interface RulesPlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
}

function safeReadText(filePath: string): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  return readFileSync(filePath, 'utf8');
}

function hashText(text: string): string {
  return Buffer.from(text).toString('base64').slice(0, 12);
}

function makeRulesAsset(
  key: string,
  label: string,
  status: InitAsset['status'],
  ownership: InitAsset['ownership'],
  origin: string,
  details: string[],
  options: {
    path?: string;
    hash?: string;
    versionHint?: string;
    rollbackHint?: string;
    manualAction?: string;
  } = {}
): InitAsset {
  return {
    key,
    label,
    status,
    ownership,
    origin,
    path: options.path,
    details,
    hash: options.hash,
    versionHint: options.versionHint,
    rollbackHint: options.rollbackHint,
    manualAction: options.manualAction,
  };
}

function previewDiff(currentText: string, expectedText: string): string {
  const currentPreview = currentText.trim().split('\n').slice(0, 3).join(' / ');
  const expectedPreview = expectedText.trim().split('\n').slice(0, 3).join(' / ');
  return `当前: ${currentPreview} | 目标: ${expectedPreview}`;
}

function ruleFilePath(rootDir: string, category: string, fileName: string): string {
  return path.join(rootDir, '.mycodemap', 'rules', category, fileName);
}

function ruleAssets(rootDir: string, writes: FileWriteAction[]): InitAsset[] {
  const assets: InitAsset[] = [];

  for (const template of getBuiltInRuleTemplates()) {
    const targetPath = ruleFilePath(rootDir, template.category, template.fileName);
    const currentText = safeReadText(targetPath);

    if (currentText === template.content) {
      assets.push(makeRulesAsset(
        `rules:${template.category}`,
        `rules: ${template.category}`,
        'already-synced',
        'tool-owned',
        'built-in-rules-bundle',
        ['内置 rules 文件已同步'],
        {
          path: targetPath,
          hash: hashText(template.content),
          versionHint: getRulesBundleVersion(),
        }
      ));
      continue;
    }

    if (currentText !== undefined) {
      assets.push(makeRulesAsset(
        `rules:${template.category}`,
        `rules: ${template.category}`,
        'conflict',
        'tool-owned',
        'built-in-rules-bundle',
        [
          '检测到目标项目中的 rules 文件与内置模板存在 drift；本次不会自动覆盖',
          previewDiff(currentText, template.content),
        ],
        {
          path: targetPath,
          hash: hashText(template.content),
          versionHint: getRulesBundleVersion(),
          manualAction: `手动审阅 \`.mycodemap/rules/${template.category}/${template.fileName}\` 的 drift，确认后可删除该文件再重跑 init`,
        }
      ));
      continue;
    }

    writes.push({
      targetPath,
      content: template.content,
    });
    assets.push(makeRulesAsset(
      `rules:${template.category}`,
      `rules: ${template.category}`,
      'installed',
      'tool-owned',
      'built-in-rules-bundle',
      ['将生成通用 rules 文件，不自动注入任何 repo 私有路径或项目专属流程'],
      {
        path: targetPath,
        hash: hashText(template.content),
        versionHint: getRulesBundleVersion(),
        rollbackHint: `如需回退，可删除 \`.mycodemap/rules/${template.category}/${template.fileName}\``,
      }
    ));
  }

  return assets;
}

function aiContextAsset(rootDir: string): InitAsset {
  const snippet = buildRulesSnippet();
  const claudePath = path.join(rootDir, 'CLAUDE.md');
  const agentsPath = path.join(rootDir, 'AGENTS.md');
  const claudeText = safeReadText(claudePath);
  const agentsText = safeReadText(agentsPath);
  const hasReference = claudeText?.includes('.mycodemap/rules/') || agentsText?.includes('.mycodemap/rules/');

  if (hasReference) {
    return makeRulesAsset(
      'ai-context-rules-snippet',
      'AI context rules snippet',
      'already-synced',
      'team-owned',
      'existing-team-context-file',
      ['检测到 `CLAUDE.md` 或 `AGENTS.md` 已引用 `.mycodemap/rules/`，无需重复提醒'],
      {
        path: claudeText?.includes('.mycodemap/rules/') ? claudePath : agentsPath,
      }
    );
  }

  return makeRulesAsset(
    'ai-context-rules-snippet',
    'AI context rules snippet',
    'manual-action-needed',
    'team-owned',
    'copy-paste-snippet',
    [
      'init 不会自动改写 team-owned 的 `CLAUDE.md` / `AGENTS.md`',
      '请复制以下片段到你的 AI 上下文文件：',
      snippet,
    ],
    {
      manualAction: '把 receipt 中的 `.mycodemap/rules/` 引用片段手动加入 `CLAUDE.md` 或 `AGENTS.md`',
    }
  );
}

export function createRulesPlan(rootDir: string): RulesPlan {
  const writes: FileWriteAction[] = [];

  return {
    assets: [
      ...ruleAssets(rootDir, writes),
      aiContextAsset(rootDir),
    ],
    writes,
  };
}

export async function applyRulesPlan(plan: RulesPlan): Promise<void> {
  for (const writeAction of plan.writes) {
    await mkdir(path.dirname(writeAction.targetPath), { recursive: true });
    await writeFile(writeAction.targetPath, writeAction.content, 'utf8');
  }
}
