import type { ToolOptions, UnifiedResult } from '../types.js';

/**
 * ToolAdapter 适配器基类接口
 * 所有工具适配器必须实现此接口
 */
export interface ToolAdapter {
  /** 适配器名称 */
  name: string;
  /** 结果权重（0-1） */
  weight: number;

  /**
   * 检查工具是否可用
   * @returns 是否可用的 Promise
   */
  isAvailable(): Promise<boolean>;

  /**
   * 执行工具搜索
   * @param keywords - 搜索关键词列表
   * @param options - 工具选项
   * @returns 统一结果列表的 Promise
   */
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
}
