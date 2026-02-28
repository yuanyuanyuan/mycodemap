// ============================================
// AI Provider 基础类型定义
// ============================================

import type { CodeMap } from '../types/index.js';

/**
 * AI Provider 配置
 */
export interface AIProviderConfig {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 模型版本 */
  model?: string;
}

/**
 * AI 响应结果
 */
export interface AIResponse {
  /** 响应内容 */
  content: string;
  /** 使用的模型 */
  model?: string;
  /** 消耗的 token 数 */
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * AI Provider 基类
 * 所有 AI Provider 都应继承此类
 */
export abstract class AIProvider {
  /** Provider 名称 */
  public abstract readonly name: string;

  /** 默认配置 */
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig = {}) {
    this.config = {
      timeout: 60000, // 默认 60 秒
      maxTokens: 4000,
      ...config
    };
  }

  /**
   * 执行 AI 推理
   * @param prompt 提示词
   * @param context 上下文数据（CodeMap）
   */
  abstract execute(prompt: string, context?: CodeMap): Promise<AIResponse>;

  /**
   * 检查 Provider 是否可用
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * 获取 Provider 类型
   */
  getProviderType(): string {
    return this.name;
  }

  /**
   * 销毁 Provider（可选实现）
   */
  destroy(): void {
    // 默认空实现，子类可覆盖
  }
}

/**
 * Provider 类型枚举
 */
export type ProviderType = 'claude' | 'codex' | 'openai' | 'gemini';

/**
 * Provider 工厂配置
 */
export interface ProviderFactoryConfig {
  /** 使用的 Provider 类型 */
  provider?: ProviderType;
  /** Provider 配置 */
  config?: AIProviderConfig;
}
