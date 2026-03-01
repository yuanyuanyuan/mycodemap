/**
 * [META] 适配器模块入口
 * [WHY] 统一导出所有适配器相关类型，供外部调用
 */
export type { ToolAdapter } from './base-adapter.js';
export type { CodemapAdapterOptions } from './codemap-adapter.js';
export { CodemapAdapter, createCodemapAdapter } from './codemap-adapter.js';
export type { AstGrepAdapterOptions } from './ast-grep-adapter.js';
export { AstGrepAdapter, createAstGrepAdapter } from './ast-grep-adapter.js';
