// ============================================
// AI Provider 模块导出
// ============================================

// 类型定义
export type {
  AIProviderConfig,
  AIResponse,
  ProviderType,
  ProviderFactoryConfig
} from './provider.js';

export type {
  AIProviderOptions,
  ChatRequest,
  ChatResponse,
  ProviderStatus,
  ProviderInfo,
  CLIResult
} from './types.js';

// 抽象基类
export { AIProvider } from './provider.js';

// Provider 实现
export { ClaudeProvider, type ClaudeProviderConfig } from './claude.js';
export { CodexProvider, type CodexProviderConfig } from './codex.js';

// 工厂类
export { ProviderFactory, createAIProvider } from './factory.js';

// Provider 信息
import type { ProviderType } from './provider.js';

export const PROVIDER_INFO: Record<ProviderType, { displayName: string; description: string }> = {
  claude: {
    displayName: 'Claude CLI',
    description: 'Anthropic Claude via CLI'
  },
  codex: {
    displayName: 'Codex CLI',
    description: 'OpenAI Codex via CLI'
  },
  openai: {
    displayName: 'OpenAI',
    description: 'OpenAI API'
  },
  gemini: {
    displayName: 'Google Gemini',
    description: 'Google Gemini API'
  }
};
