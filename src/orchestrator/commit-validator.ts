/**
 * [META] Commit 格式验证器
 * [WHY] 统一执行 CI 门禁的提交信息规则，避免本地与服务端口径漂移
 */

export const VALID_TAGS = [
  'BUGFIX',
  'FEATURE',
  'REFACTOR',
  'CONFIG',
  'DOCS',
  'DELETE',
] as const;

export type ValidTag = (typeof VALID_TAGS)[number];

export interface CommitValidationResult {
  valid: boolean;
  errorCode?: 'E0007';
  errorMessage?: string;
  tag?: ValidTag;
  commitMessage?: string;
}

/**
 * 验证 Commit 消息是否符合 [TAG] 格式
 * @param commitMessage - Commit 消息内容
 * @returns 验证结果
 */
export function validateCommitMessage(commitMessage: string): CommitValidationResult {
  const firstLine = commitMessage.split('\n')[0]?.trim() ?? '';

  if (!firstLine) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: 'Commit message cannot be empty',
    };
  }

  // 严格格式: [TAG] scope: message
  const tagPattern = new RegExp(`^\\[(${VALID_TAGS.join('|')})\\]\\s+([^:]+):\\s+(.+)$`);
  const match = firstLine.match(tagPattern);
  if (!match) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: `Expected format: [TAG] scope: message. Valid tags: ${VALID_TAGS.join(', ')}`,
    };
  }

  const tag = match[1] as ValidTag;
  const scope = match[2]?.trim() ?? '';
  const message = match[3]?.trim() ?? '';
  if (!scope || !message) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: 'Scope and message are required. Expected: [TAG] scope: message',
    };
  }

  return {
    valid: true,
    tag,
    commitMessage: `${scope}: ${message}`,
  };
}

/**
 * 从 git log 获取最近的 Commit 消息并验证
 * @param count - 获取的 Commit 数量
 * @returns 验证结果数组
 */
export async function validateRecentCommits(
  count: number = 10,
  range?: string
): Promise<CommitValidationResult[]> {
  const { execSync } = await import('child_process');

  try {
    const command = range
      ? `git log --format=%s ${range}`
      : `git log -${count} --pretty=format:"%s"`;
    const output = execSync(command, {
      encoding: 'utf-8',
    });

    const messages = output.split('\n').filter(Boolean);
    return messages.map(validateCommitMessage);
  } catch {
    return [];
  }
}

/**
 * 验证并输出结果到控制台
 */
export function validateAndPrint(message: string): void {
  const result = validateCommitMessage(message);

  if (result.valid) {
    console.log(`Valid commit: [${result.tag}] ${result.commitMessage}`);
  } else {
    console.error(`ERROR: ${result.errorCode}: ${result.errorMessage}`);
    process.exit(1);
  }
}
