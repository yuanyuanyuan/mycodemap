// [META] since:2024-06 | owner:core-team | stable:true
// [WHY] 向后兼容层 - 转发到 Interface Layer
// 原有类型定义已迁移到 src/interface/types/
// 此文件保留以维持向后兼容
// ============================================
// CodeMap 核心类型定义 (向后兼容层)
// ============================================

// 转发所有类型到 Interface Layer
export * from '../interface/types/index.js';
export * from '../interface/types/storage.js';
export * from '../interface/types/parser.js';
export * from '../interface/config/index.js';

// 保持向后兼容的别名
/** @deprecated 使用 CodemapConfig 替代 */
export type CodeMapConfig = import('../interface/config/index.js').CodemapConfig;
