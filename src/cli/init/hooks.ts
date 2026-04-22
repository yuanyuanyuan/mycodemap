// [META] since:2026-04-21 | owner:cli-team | stable:false
// [WHY] 为 init 提供 package-safe hook payload 同步、shim 安装与 .gitignore 收敛逻辑

import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InitAsset } from './reconciler.js';

const MANAGED_SHIM_MARKER = '# mycodemap-managed hook shim';
const HOOK_NAMES = ['pre-commit', 'commit-msg'] as const;
const LOGS_IGNORE_ENTRY = '.mycodemap/logs/';

type HookName = typeof HOOK_NAMES[number];

interface FileWriteAction {
  targetPath: string;
  content: string;
  executable: boolean;
}

export interface HookPlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
}

export interface HookPlanOptions {
  templateRoot?: string;
}

function resolvePackageRoot(): string {
  return fileURLToPath(new URL('../../../', import.meta.url));
}

function resolveTemplateRoot(templateRoot?: string): string {
  return templateRoot ?? path.join(resolvePackageRoot(), 'scripts', 'hooks', 'templates');
}

function safeReadText(filePath: string): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function makeHookAsset(
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

function hashText(text: string): string {
  return Buffer.from(text).toString('base64').slice(0, 12);
}

function resolveGitHooksDirectory(rootDir: string): string | undefined {
  const dotGitPath = path.join(rootDir, '.git');
  if (!existsSync(dotGitPath)) {
    return undefined;
  }

  const stat = lstatSync(dotGitPath);
  if (stat.isDirectory()) {
    return path.join(dotGitPath, 'hooks');
  }

  if (!stat.isFile()) {
    return undefined;
  }

  const dotGitText = safeReadText(dotGitPath);
  const match = dotGitText?.match(/^gitdir:\s*(.+)\s*$/mu);
  if (!match) {
    return undefined;
  }

  return path.resolve(rootDir, match[1], 'hooks');
}

function hookPayloadPath(rootDir: string, hookName: HookName): string {
  return path.join(rootDir, '.mycodemap', 'hooks', hookName);
}

function preservedHookPath(rootDir: string, hookName: HookName): string {
  return path.join(rootDir, '.mycodemap', 'hooks', `user-${hookName}.sh`);
}

function buildManagedShim(hookName: HookName): string {
  return `#!/bin/sh
${MANAGED_SHIM_MARKER}: ${hookName}
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
USER_HOOK="$REPO_ROOT/.mycodemap/hooks/user-${hookName}.sh"
CODEMAP_HOOK="$REPO_ROOT/.mycodemap/hooks/${hookName}"

if [ -x "$USER_HOOK" ]; then
  "$USER_HOOK" "$@"
fi

if [ ! -x "$CODEMAP_HOOK" ]; then
  echo "WARNING: missing CodeMap hook payload: $CODEMAP_HOOK" >&2
  exit 0
fi

"$CODEMAP_HOOK" "$@"
`;
}

function payloadAsset(rootDir: string, hookName: HookName, templateRoot: string, writes: FileWriteAction[]): InitAsset {
  const templatePath = path.join(templateRoot, hookName);
  const targetPath = hookPayloadPath(rootDir, hookName);
  const templateText = safeReadText(templatePath);

  if (!templateText) {
    return makeHookAsset(
      `hook-payload:${hookName}`,
      `hook payload: ${hookName}`,
      'manual-action-needed',
      'tool-owned',
      'missing-packaged-template',
      [`未找到 package-safe hook template：\`${templatePath}\``],
      {
        path: targetPath,
        manualAction: `确认已发布 \`scripts/hooks/templates/${hookName}\` 后重新运行 init`,
      }
    );
  }

  const currentText = safeReadText(targetPath);
  if (currentText === templateText) {
    return makeHookAsset(
      `hook-payload:${hookName}`,
      `hook payload: ${hookName}`,
      'already-synced',
      'tool-owned',
      `scripts/hooks/templates/${hookName}`,
      ['CodeMap-managed hook payload 已同步'],
      {
        path: targetPath,
        hash: hashText(templateText),
      }
    );
  }

  writes.push({
    targetPath,
    content: templateText,
    executable: true,
  });

  return makeHookAsset(
    `hook-payload:${hookName}`,
    `hook payload: ${hookName}`,
    'installed',
    'tool-owned',
    `scripts/hooks/templates/${hookName}`,
    ['将把 package-safe hook payload 同步到 `.mycodemap/hooks/`'],
    {
      path: targetPath,
      hash: hashText(templateText),
      rollbackHint: `如需回退，可删除 \`.mycodemap/hooks/${hookName}\``,
    }
  );
}

function shimAsset(rootDir: string, hookName: HookName, gitHooksDir: string | undefined, writes: FileWriteAction[]): InitAsset {
  const targetPath = gitHooksDir ? path.join(gitHooksDir, hookName) : undefined;
  if (!gitHooksDir || !targetPath) {
    return makeHookAsset(
      `hook-shim:${hookName}`,
      `hook shim: ${hookName}`,
      'skipped',
      'user-owned',
      'not-a-git-repo',
      ['当前项目不是 Git 仓库，跳过 `.git/hooks/` shim 安装'],
      {
        manualAction: '如需 hooks，请先初始化 Git 仓库后重新运行 init',
      }
    );
  }

  const expectedShim = buildManagedShim(hookName);
  const currentShim = safeReadText(targetPath);
  if (currentShim === expectedShim) {
    return makeHookAsset(
      `hook-shim:${hookName}`,
      `hook shim: ${hookName}`,
      'already-synced',
      'user-owned',
      'mycodemap-managed-shim',
      ['`.git/hooks/` shim 已指向 `.mycodemap/hooks/` payload'],
      {
        path: targetPath,
        hash: hashText(expectedShim),
      }
    );
  }

  const backupPath = preservedHookPath(rootDir, hookName);
  const backupText = safeReadText(backupPath);
  if (currentShim && !currentShim.includes(MANAGED_SHIM_MARKER) && backupText && backupText !== currentShim) {
    return makeHookAsset(
      `hook-shim:${hookName}`,
      `hook shim: ${hookName}`,
      'conflict',
      'user-owned',
      'existing-user-hook-with-backup-drift',
      ['检测到已有用户 hook，且 `.mycodemap/hooks/` 下的备份与当前 hook 内容不一致，无法安全覆盖'],
      {
        path: targetPath,
        manualAction: `手动整理 \`.git/hooks/${hookName}\` 与 \`.mycodemap/hooks/user-${hookName}.sh\` 后再重试`,
      }
    );
  }

  if (currentShim && !currentShim.includes(MANAGED_SHIM_MARKER) && !backupText) {
    writes.push({
      targetPath: backupPath,
      content: currentShim,
      executable: true,
    });
  }

  if (currentShim !== expectedShim) {
    writes.push({
      targetPath,
      content: expectedShim,
      executable: true,
    });
  }

  const preservedDetail = currentShim && !currentShim.includes(MANAGED_SHIM_MARKER)
    ? [`已保留原有 hook 逻辑到 \`.mycodemap/hooks/user-${hookName}.sh\``]
    : ['将安装 CodeMap-managed shim 到 `.git/hooks/`'];

  return makeHookAsset(
    `hook-shim:${hookName}`,
    `hook shim: ${hookName}`,
    'installed',
    'user-owned',
    currentShim && !currentShim.includes(MANAGED_SHIM_MARKER) ? 'preserved-user-hook' : 'fresh-shim-install',
    [...preservedDetail, 'shim 会先执行保留的用户 hook，再执行 `.mycodemap/hooks/` payload'],
    {
      path: targetPath,
      hash: hashText(expectedShim),
      rollbackHint: `如需回退，可恢复 \`.mycodemap/hooks/user-${hookName}.sh\` 中的旧逻辑并删除当前 shim`,
    }
  );
}

function gitignoreAsset(rootDir: string, gitHooksDir: string | undefined, writes: FileWriteAction[]): InitAsset {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const currentText = safeReadText(gitignorePath);

  if (!gitHooksDir) {
    return makeHookAsset(
      'gitignore-logs',
      '.gitignore logs entry',
      'skipped',
      'user-owned',
      'not-a-git-repo',
      ['当前项目不是 Git 仓库，跳过 `.gitignore` 日志条目收敛'],
      {
        path: gitignorePath,
      }
    );
  }

  if (currentText?.split(/\r?\n/u).map((line) => line.trim()).includes(LOGS_IGNORE_ENTRY)) {
    return makeHookAsset(
      'gitignore-logs',
      '.gitignore logs entry',
      'already-synced',
      'user-owned',
      'existing-gitignore-entry',
      ['`.gitignore` 已包含 `.mycodemap/logs/`'],
      {
        path: gitignorePath,
      }
    );
  }

  const nextText = currentText && currentText.length > 0
    ? `${currentText.endsWith('\n') ? currentText : `${currentText}\n`}${LOGS_IGNORE_ENTRY}\n`
    : `${LOGS_IGNORE_ENTRY}\n`;
  writes.push({
    targetPath: gitignorePath,
    content: nextText,
    executable: false,
  });

  return makeHookAsset(
    'gitignore-logs',
    '.gitignore logs entry',
    'installed',
    'user-owned',
    'mycodemap-init',
    ['将向 `.gitignore` 追加 `.mycodemap/logs/`，避免本地日志进入版本控制'],
    {
      path: gitignorePath,
      rollbackHint: '如需回退，可从 `.gitignore` 中删除 `.mycodemap/logs/` 这一行',
    }
  );
}

export function createHookPlan(rootDir: string, options: HookPlanOptions = {}): HookPlan {
  const writes: FileWriteAction[] = [];
  const templateRoot = resolveTemplateRoot(options.templateRoot);
  const gitHooksDir = resolveGitHooksDirectory(rootDir);
  const assets: InitAsset[] = [];

  for (const hookName of HOOK_NAMES) {
    assets.push(payloadAsset(rootDir, hookName, templateRoot, writes));
  }

  for (const hookName of HOOK_NAMES) {
    assets.push(shimAsset(rootDir, hookName, gitHooksDir, writes));
  }

  assets.push(gitignoreAsset(rootDir, gitHooksDir, writes));

  return {
    assets,
    writes,
  };
}

async function applyWrite(action: FileWriteAction): Promise<void> {
  await mkdir(path.dirname(action.targetPath), { recursive: true });
  await writeFile(action.targetPath, action.content, 'utf8');
  if (action.executable) {
    await chmod(action.targetPath, 0o755);
  }
}

export async function applyHookPlan(plan: HookPlan): Promise<void> {
  for (const writeAction of plan.writes) {
    await applyWrite(writeAction);
  }
}
