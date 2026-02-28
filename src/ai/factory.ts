// ============================================
// Provider 工厂类
// ============================================

import { AIProvider, type ProviderType, type AIProviderConfig } from './provider.js';
import { ClaudeProvider } from './claude.js';
import { CodexProvider } from './codex.js';

/**
 * Provider 工厂
 * 用于创建和管理 AI Provider 实例
 */
export class ProviderFactory {
  /** 默认 Provider 优先级 */
  private static readonly DEFAULT_PRIORITY: ProviderType[] = ['claude', 'codex'];

  /** 已创建的 Provider 实例缓存 */
  private static providers: Map<ProviderType, AIProvider> = new Map();

  /**
   * 根据名称创建 Provider
   */
  static create(type: ProviderType, config?: AIProviderConfig): AIProvider {
    // 如果已有缓存，直接返回
    const cached = this.providers.get(type);
    if (cached) {
      return cached;
    }

    let provider: AIProvider;

    switch (type) {
      case 'claude':
        provider = new ClaudeProvider(config);
        break;
      case 'codex':
        provider = new CodexProvider(config);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    // 缓存实例
    this.providers.set(type, provider);

    return provider;
  }

  /**
   * 自动检测可用的 Provider
   * 按优先级顺序返回第一个可用的 Provider
   */
  static async detectAvailable(
    priority: ProviderType[] = this.DEFAULT_PRIORITY,
    config?: AIProviderConfig
  ): Promise<{ provider: AIProvider; type: ProviderType } | null> {
    for (const type of priority) {
      const provider = this.create(type, config);
      if (await provider.isAvailable()) {
        return { provider, type };
      }
    }
    return null;
  }

  /**
   * 获取所有可用的 Provider
   */
  static async getAllAvailable(
    config?: AIProviderConfig
  ): Promise<Array<{ type: ProviderType; provider: AIProvider }>> {
    const results: Array<{ type: ProviderType; provider: AIProvider }> = [];

    for (const type of this.DEFAULT_PRIORITY) {
      const provider = this.create(type, config);
      if (await provider.isAvailable()) {
        results.push({ type, provider });
      }
    }

    return results;
  }

  /**
   * 检查特定 Provider 是否可用
   */
  static async checkAvailability(type: ProviderType): Promise<boolean> {
    const provider = this.create(type);
    return provider.isAvailable();
  }

  /**
   * 清除 Provider 缓存
   */
  static clearCache(): void {
    this.providers.forEach((provider) => {
      provider.destroy();
    });
    this.providers.clear();
  }

  /**
   * 获取默认 Provider
   * 优先使用 Claude，其次 Codex
   */
  static getDefault(config?: AIProviderConfig): AIProvider {
    return this.create('claude', config);
  }
}

/**
 * 创建 AI Provider 实例的简便函数
 */
export function createAIProvider(type: ProviderType, config?: AIProviderConfig): AIProvider {
  return ProviderFactory.create(type, config);
}
