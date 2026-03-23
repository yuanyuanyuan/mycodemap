// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 4: 执行发布操作，npm publish + git tag

import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

function syncAIDocsVersion(version: string): void {
  const files = ['AI_GUIDE.md', 'llms.txt', 'ai-document-index.yaml'];
  const versionStr = version.replace(/^v/, '');

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const updated = content.replace(/0\.\d+\.\d+/g, versionStr);
      writeFileSync(file, updated);
    } catch {
      // 文件不存在或读取失败，跳过
    }
  }
}

export interface PublishResult {
  success: boolean;
  version: string;
  npmPublished: boolean;
  tagCreated: boolean;
  pushed: boolean;
  error?: string;
}

export async function publish(version: string, dryRun: boolean = false): Promise<PublishResult> {
  const result: PublishResult = {
    success: false,
    version,
    npmPublished: false,
    tagCreated: false,
    pushed: false
  };

  if (dryRun) {
    console.log(chalk.gray('  [dry-run] 跳过实际发布'));
    return { ...result, success: true, npmPublished: true, tagCreated: true, pushed: true };
  }

  try {
    // 1. 更新 package.json 版本
    console.log(chalk.gray('  更新 package.json 版本...'));
    execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'pipe' });

    // 2. 同步 AI 文档版本
    console.log(chalk.gray('  同步 AI 文档版本...'));
    syncAIDocsVersion(version);

    // 3. 提交版本更新（必须在创建 tag 之前）
    console.log(chalk.gray('  提交版本更新...'));
    execSync('git add package.json AI_GUIDE.md llms.txt ai-document-index.yaml CHANGELOG.md', { stdio: 'pipe' });
    execSync(`git commit -m "[CONFIG] version: bump to v${version}"`, { stdio: 'pipe' });

    // 4. 创建 git tag（在 commit 之后）
    console.log(chalk.gray('  创建 git tag...'));
    execSync(`git tag v${version}`, { stdio: 'pipe' });

    result.tagCreated = true;

    // 4. npm publish (使用 OIDC，不需要 OTP)
    console.log(chalk.gray('  发布到 npm...'));
    try {
      execSync('npm publish --access public', { stdio: 'pipe' });
      result.npmPublished = true;
    } catch (publishError) {
      // npm publish 失败，tag 已经创建，可能需要手动处理
      const errorMsg = publishError instanceof Error ? publishError.message : String(publishError);
      console.log(chalk.yellow(`  ⚠️ npm publish 失败: ${errorMsg}`));
      result.error = `npm publish 失败: ${errorMsg}`;
      // 不立即返回，继续尝试 push
    }

    // 5. 推送所有到远程
    console.log(chalk.gray('  推送到远程...'));
    execSync('git push origin HEAD --tags', { stdio: 'pipe' });
    result.pushed = true;

    result.success = result.npmPublished && result.tagCreated && result.pushed;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

export function formatPublishOutput(result: PublishResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push('发布成功!');
    lines.push(`  版本: v${result.version}`);
    lines.push(`  ✅ NPM 发布成功`);
    lines.push(`  ✅ Git tag 已创建`);
    lines.push(`  ✅ 已推送到远程`);
  } else {
    lines.push('发布部分成功:');
    lines.push(`  版本: v${result.version}`);
    lines.push(`  ${result.npmPublished ? '✅' : '❌'} NPM 发布`);
    lines.push(`  ${result.tagCreated ? '✅' : '❌'} Git tag 已创建`);
    lines.push(`  ${result.pushed ? '✅' : '❌'} 已推送到远程`);
    if (result.error) {
      lines.push(`  错误: ${result.error}`);
    }
  }

  return lines.join('\n');
}
