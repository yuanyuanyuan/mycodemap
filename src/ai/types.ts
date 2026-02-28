// ============================================
// AI Provider 类型定义
// ============================================

// Provider 配置选项
export interface AIProviderOptions {
  /** Provider 名称 */
  name: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义环境变量 */
  env?: Record<string, string>;
}

// 聊天请求
export interface ChatRequest {
  /** 提示词 */
  prompt: string;
  /** 额外上下文 */
  context?: Record<string, unknown>;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 最大令牌数 */
  maxTokens?: number;
  /** 温度参数 */
  temperature?: number;
}

// 聊天响应
export interface ChatResponse {
  /** 响应内容 */
  content: string;
  /** 使用的 provider */
  provider: string;
  /** 消耗的令牌数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 响应时间（毫秒） */
  latency: number;
}

// Provider 状态
export interface ProviderStatus {
  /** Provider 名称 */
  name: string;
  /** 是否可用 */
  isAvailable: boolean;
  /** 检查时间 */
  checkedAt: string;
  /** 错误信息（如果不可用） */
  error?: string;
}

// 可用的 Provider 类型
export type ProviderType = 'claude' | 'codex';

// Provider 信息
export interface ProviderInfo {
  /** Provider 类型 */
  type: ProviderType;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description: string;
  /** CLI 命令 */
  command: string;
  /** 默认参数 */
  defaultArgs: string[];
}

// CLI 执行结果
export interface CLIResult {
  /** 退出码 */
  exitCode: number;
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
}
