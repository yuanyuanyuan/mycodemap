// [META] since:2026-03-06 | owner:cli-team | stable:false
// [WHY] 提供敏感信息脱敏工具函数，用于 report 命令中的隐私保护

/**
 * 敏感值脱敏规则
 */
interface SanitizeRule {
  /** 正则表达式模式 */
  pattern: RegExp;
  /** 替换文本 */
  replacement: string;
}

/**
 * 默认脱敏规则
 */
const DEFAULT_SANITIZE_RULES: SanitizeRule[] = [
  // API Keys - 各种常见的 API 密钥格式 (key: value 或 key=value 或 "key": "value")
  { pattern: /([a-zA-Z_-]*api[_-]?key[_-]?["']?\s*[:=]\s*["']?)([a-zA-Z0-9_\-]{20,})/gi, replacement: '$1[REDACTED]' },
  // 直接赋值的 API Key 格式 (apiKey: 'value' 或 apiKey = 'value')
  { pattern: /(apiKey\s*[:=]\s*['"]?)([a-zA-Z0-9_\-]{20,})/gi, replacement: '$1[REDACTED]' },
  // Bearer Tokens
  { pattern: /(bearer\s+)([a-zA-Z0-9_\-\.]{20,})/gi, replacement: '$1[REDACTED]' },
  // AWS Access Keys
  { pattern: /(AKIA[0-9A-Z]{16})/g, replacement: '[AWS_KEY_REDACTED]' },
  // GitHub Tokens
  { pattern: /(gh[pousr]_[a-zA-Z0-9_]{20,})/g, replacement: '[GITHUB_TOKEN_REDACTED]' },
  // JWT Tokens
  { pattern: /(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)/g, replacement: '[JWT_REDACTED]' },
  // Private Keys
  { pattern: /(-{5}BEGIN [A-Z]+ PRIVATE KEY-{5})[\s\S]*?(-{5}END [A-Z]+ PRIVATE KEY-{5})/g, replacement: '[PRIVATE_KEY_REDACTED]' },
  // Passwords in config (带引号)
  { pattern: /([a-zA-Z_-]*password[_-]?["']?\s*[:=]\s*["']?)([^"'`\s,\]}]+)/gi, replacement: '$1[REDACTED]' },
  // Passwords in config (不带引号，直接赋值)
  { pattern: /(password\s*[:=]\s*)([^\s"'\[\],}]+)/gi, replacement: '$1[REDACTED]' },
  // Secret in config (不带引号，直接赋值)
  { pattern: /(secret\s*[:=]\s*)([^\s"'\[\],}]+)/gi, replacement: '$1[REDACTED]' },
  { pattern: /([a-zA-Z_-]*secret[_-]?["']?\s*[:=]\s*["']?)([^"'`\s,\]}]+)/gi, replacement: '$1[REDACTED]' },
  // Database URLs with credentials
  { pattern: /(mongodb(\+srv)?:\/\/)[^:]+:[^@]+(@)/gi, replacement: '$1[DB_CREDENTIALS]$3' },
  { pattern: /(postgres|mysql|redis):\/\/[^:]+:[^@]+(@)/gi, replacement: '$1[DB_CREDENTIALS]$4' },
  // Environment variables
  { pattern: /([A-Z_]*SECRET[A-Z_]*\s*=\s*)([^\s"'`]+)/g, replacement: '$1[REDACTED]' },
  { pattern: /([A-Z_]*TOKEN[A-Z_]*\s*=\s*)([^\s"'`]+)/g, replacement: '$1[REDACTED]' },
  { pattern: /([A-Z_]*PASSWORD[A-Z_]*\s*=\s*)([^\s"'`]+)/g, replacement: '$1[REDACTED]' },
  // IP addresses (可选，用于调试日志)
  { pattern: /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g, replacement: '[IP_REDACTED]' },
];

/**
 * 脱敏配置选项
 */
export interface SanitizeOptions {
  /** 自定义脱敏规则 */
  rules?: SanitizeRule[];
  /** 最大字符串长度限制 */
  maxLength?: number;
  /** 是否保留原始长度信息 */
  preserveLength?: boolean;
}

/**
 * 默认脱敏配置
 */
const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  rules: DEFAULT_SANITIZE_RULES,
  maxLength: 1024 * 1024, // 1MB
  preserveLength: false,
};

/**
 * 深度脱敏对象中的字符串值
 *
 * @param input - 要脱敏的输入（字符串或对象）
 * @param options - 脱敏选项
 * @returns 脱敏后的结果
 */
export function sanitize(input: unknown, options?: SanitizeOptions): unknown {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 处理字符串
  if (typeof input === 'string') {
    let result = input;

    // 应用所有脱敏规则
    for (const rule of opts.rules) {
      result = result.replace(rule.pattern, rule.replacement);
    }

    // 限制长度
    if (opts.maxLength && result.length > opts.maxLength) {
      const truncated = result.substring(0, opts.maxLength);
      return opts.preserveLength
        ? `${truncated}\n[CONTENT_TRUNCATED: ${result.length} -> ${opts.maxLength} chars]`
        : truncated;
    }

    return result;
  }

  // 处理数组
  if (Array.isArray(input)) {
    return input.map(item => sanitize(item, opts));
  }

  // 处理对象
  if (input !== null && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = sanitize(value, opts);
    }
    return result;
  }

  // 原始类型直接返回
  return input;
}

/**
 * 脱敏并返回字符串
 * 如果输入不是字符串，会先 JSON.stringify 再脱敏
 *
 * @param input - 要脱敏的输入
 * @param options - 脱敏选项
 * @returns 脱敏后的字符串
 */
export function sanitizeToString(input: unknown, options?: SanitizeOptions): string {
  if (typeof input === 'string') {
    return sanitize(input, options) as string;
  }

  const jsonString = JSON.stringify(input, null, 2);
  return sanitize(jsonString, options) as string;
}

/**
 * 创建一个带自定义规则的脱敏器
 *
 * @param customRules - 自定义脱敏规则
 * @param options - 其他选项
 * @returns 配置好的脱敏函数
 */
export function createSanitizer(customRules: SanitizeRule[], options?: Omit<SanitizeOptions, 'rules'>): (input: unknown) => unknown {
  const opts: SanitizeOptions = {
    ...options,
    rules: [...DEFAULT_SANITIZE_RULES, ...customRules],
  };

  return (input: unknown) => sanitize(input, opts);
}

/**
 * 验证字符串是否包含敏感信息
 *
 * @param input - 要检查的字符串
 * @returns 是否包含敏感信息
 */
export function containsSensitiveData(input: string): boolean {
  for (const rule of DEFAULT_SANITIZE_RULES) {
    // 创建正则副本以避免 lastIndex 问题
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}
