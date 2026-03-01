/**
 * 适配器模块入口
 * 统一导出所有适配器相关类型
 */
export type { ToolAdapter } from './base-adapter.js';
export type { CodemapAdapterOptions } from './codemap-adapter.js';
export { CodemapAdapter, createCodemapAdapter } from './codemap-adapter.js';
