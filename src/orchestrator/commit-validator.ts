/**
 * Commit 格式验证器
 * 验证 Commit 信息是否符合 conventional commits 规范
 */

export const VALID_TAGS = [
  'feat',
  'fix',
  'refactor',
  'docs',
  'chore',
  'test',
  'style',
  'perf',
  'ci',
  'build',
  'revert',
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
  const trimmedMessage = commitMessage.trim();

  if (!trimmedMessage) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: 'Commit message cannot be empty',
    };
  }

  // 检查是否以 [TAG] 格式开头
  const tagPattern = /^\[([a-z]+)\]/i;
  const match = trimmedMessage.match(tagPattern);

  if (!match) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: `Commit message must start with a valid tag. Expected format: [TAG] message. Valid tags: ${VALID_TAGS.join(', ')}`,
    };
  }

  const tag = match[1].toLowerCase() as ValidTag;

  if (!VALID_TAGS.includes(tag)) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: `Invalid tag "${tag}". Valid tags: ${VALID_TAGS.join(', ')}`,
    };
  }

  // 提取实际的消息内容
  const message = trimmedMessage.slice(match[0].length).trim();

  if (!message) {
    return {
      valid: false,
      errorCode: 'E0007',
      errorMessage: 'Commit message cannot be empty after tag',
    };
  }

  return {
    valid: true,
    tag,
    commitMessage: message,
  };
}

/**
 * 从 git log 获取最近的 Commit 消息并验证
 * @param count - 获取的 Commit 数量
 * @returns 验证结果数组
 */
export async function validateRecentCommits(count: number = 10): Promise<CommitValidationResult[]> {
  const { execSync } = await import('child_process');

  try {
    const output = execSync(`git log -${count} --pretty=format:"%s"`, {
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
    console.log(`✅ Valid commit: [${result.tag}] ${result.commitMessage}`);
  } else {
    console.error(`❌ ${result.errorCode}: ${result.errorMessage}`);
    process.exit(1);
  }
}
